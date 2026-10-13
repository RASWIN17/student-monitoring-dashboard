import { createAdminClient } from '../supabase/admin';
import { LeetCodeConnector } from './leetcode';
import { CodeChefConnector } from './codechef';
import { Contest, ContestStatus, ContestScanStatus, PlatformType, PlatformAccount } from '../types';
import {
  upsertContest,
  getContestById,
  updateContest,
  saveContestRecord,
  getPlatformAccountsForStudent,
  getEnrolledStudents,
} from '../db';

export class ContestService {
  private static LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';
  private static CODECHEF_CONTESTS_API =
    'https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all';

  /**
   * Fetch live dynamic LeetCode contests via official GraphQL API
   */
  public static async fetchLeetCodeContests(): Promise<Partial<Contest>[]> {
    const query = `
      query getContestList {
        topTwoContests {
          title
          titleSlug
          startTime
          duration
          cardImg
        }
        pastContests(pageNo: 1, numPerPage: 10) {
          data {
            title
            titleSlug
            startTime
            duration
            originStartTime
            isVirtual
          }
        }
      }
    `;

    try {
      const resp = await fetch(this.LEETCODE_GRAPHQL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://leetcode.com/contest/',
        },
        body: JSON.stringify({ query }),
        next: { revalidate: 60 },
      });

      if (!resp.ok) {
        console.warn(`[ContestService] LeetCode returned HTTP ${resp.status}`);
        return [];
      }

      const json = await resp.json();
      const topTwo = json.data?.topTwoContests || [];
      const past = json.data?.pastContests?.data || [];

      const nowMs = Date.now();
      const results: Partial<Contest>[] = [];

      // Combine and deduplicate
      const allRaw = [...topTwo, ...past];
      const seenSlugs = new Set<string>();

      for (const item of allRaw) {
        if (!item.titleSlug || seenSlugs.has(item.titleSlug)) continue;
        seenSlugs.add(item.titleSlug);

        const startTimeSec = Number(item.startTime || 0);
        const durationSec = Number(item.duration || 5400); // default 90m = 5400s
        const startMs = startTimeSec * 1000;
        const endMs = startMs + durationSec * 1000;

        let status: ContestStatus = 'upcoming';
        if (nowMs >= endMs) {
          status = 'completed';
        } else if (nowMs >= startMs) {
          status = 'live';
        }

        const id = `leetcode_${item.titleSlug}`;
        results.push({
          id,
          platform: 'leetcode',
          contest_code: item.titleSlug,
          title: item.title,
          start_time: new Date(startMs).toISOString(),
          end_time: new Date(endMs).toISOString(),
          duration_seconds: durationSec,
          status,
          card_image_url: item.cardImg || 'https://assets.leetcode.com/contest-config/contest/wc_card_img.png',
        });
      }

      return results;
    } catch (err: any) {
      console.error('[ContestService] Error fetching LeetCode contests:', err?.message);
      return [];
    }
  }

  /**
   * Fetch live dynamic CodeChef contests via official contest list API
   */
  public static async fetchCodeChefContests(): Promise<Partial<Contest>[]> {
    try {
      const resp = await fetch(this.CODECHEF_CONTESTS_API, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        next: { revalidate: 60 },
      });

      if (!resp.ok) {
        console.warn(`[ContestService] CodeChef returned HTTP ${resp.status}`);
        return [];
      }

      const json = await resp.json();
      const present = json.present_contests || [];
      const future = json.future_contests || [];
      const past = (json.past_contests || []).slice(0, 10);

      const nowMs = Date.now();
      const results: Partial<Contest>[] = [];
      const seenCodes = new Set<string>();

      const processList = (list: any[], defaultStatus: ContestStatus) => {
        for (const item of list) {
          const code = item.contest_code || item.contest_id;
          if (!code || seenCodes.has(code)) continue;
          seenCodes.add(code);

          const startIso = item.contest_start_date_iso || new Date(item.contest_start_date).toISOString();
          const endIso = item.contest_end_date_iso || new Date(item.contest_end_date).toISOString();
          const startMs = new Date(startIso).getTime();
          const endMs = new Date(endIso).getTime();
          const durationSec = item.contest_duration ? Number(item.contest_duration) * 60 : Math.round((endMs - startMs) / 1000);

          let status: ContestStatus = defaultStatus;
          if (nowMs >= endMs) {
            status = 'completed';
          } else if (nowMs >= startMs) {
            status = 'live';
          } else {
            status = 'upcoming';
          }

          const id = `codechef_${code}`;
          results.push({
            id,
            platform: 'codechef',
            contest_code: code,
            title: item.contest_name || `Contest ${code}`,
            start_time: new Date(startMs).toISOString(),
            end_time: new Date(endMs).toISOString(),
            duration_seconds: durationSec,
            status,
            card_image_url: null,
          });
        }
      };

      processList(present, 'live');
      processList(future, 'upcoming');
      processList(past, 'completed');

      return results;
    } catch (err: any) {
      console.error('[ContestService] Error fetching CodeChef contests:', err?.message);
      return [];
    }
  }

  /**
   * Synchronize contests from both platforms into the database
   */
  public static async syncContests(): Promise<{ leetcode: Contest[]; codechef: Contest[] }> {
    const [lcRaw, ccRaw] = await Promise.all([
      this.fetchLeetCodeContests(),
      this.fetchCodeChefContests(),
    ]);

    const leetcodeSaved: Contest[] = [];
    const codechefSaved: Contest[] = [];

    const nowMs = Date.now();

    for (const c of lcRaw) {
      if (!c.id || !c.contest_code || !c.title || !c.start_time || !c.end_time) continue;
      const endMs = new Date(c.end_time).getTime();

      let initialScanStatus: ContestScanStatus = 'not_started';
      if (c.status === 'completed') {
        // If ended more than 1 min ago, mark scheduled
        if (nowMs >= endMs + 60000) {
          initialScanStatus = 'scheduled';
        }
      }

      const saved = await upsertContest({
        id: c.id,
        platform: 'leetcode',
        contest_code: c.contest_code,
        title: c.title,
        start_time: c.start_time,
        end_time: c.end_time,
        duration_seconds: c.duration_seconds || 5400,
        status: c.status || 'upcoming',
        card_image_url: c.card_image_url || null,
        scan_status: initialScanStatus,
      });
      leetcodeSaved.push(saved);
    }

    for (const c of ccRaw) {
      if (!c.id || !c.contest_code || !c.title || !c.start_time || !c.end_time) continue;
      const endMs = new Date(c.end_time).getTime();

      let initialScanStatus: ContestScanStatus = 'not_started';
      if (c.status === 'completed') {
        if (nowMs >= endMs + 60000) {
          initialScanStatus = 'scheduled';
        }
      }

      const saved = await upsertContest({
        id: c.id,
        platform: 'codechef',
        contest_code: c.contest_code,
        title: c.title,
        start_time: c.start_time,
        end_time: c.end_time,
        duration_seconds: c.duration_seconds || 7200,
        status: c.status || 'upcoming',
        card_image_url: null,
        scan_status: initialScanStatus,
      });
      codechefSaved.push(saved);
    }

    return { leetcode: leetcodeSaved, codechef: codechefSaved };
  }

  /**
   * Scan verified student accounts for a specific contest
   */
  public static async scanContest(
    contestId: string,
    classroomId?: string | null
  ): Promise<{ success: boolean; message: string; scannedCount: number; attendedCount: number; pendingCount: number }> {
    const contest = await getContestById(contestId);
    if (!contest) {
      return { success: false, message: 'Contest not found', scannedCount: 0, attendedCount: 0, pendingCount: 0 };
    }

    const nowMs = Date.now();
    const endMs = new Date(contest.end_time).getTime();

    // 1. Enforce that contest must be finished
    if (nowMs < endMs) {
      return {
        success: false,
        message: 'Contest is still ongoing or upcoming. Results cannot be scanned until after contest end.',
        scannedCount: 0,
        attendedCount: 0,
        pendingCount: 0,
      };
    }

    // 2. Mark contest as scanning
    await updateContest(contest.id, {
      scan_status: 'scanning',
      scan_message: 'Scan in progress: Verifying student participation against official platform records...',
    });

    try {
      // 3. Find target students
      let students: { id: string; display_name: string }[] = [];
      if (classroomId) {
        students = await getEnrolledStudents(classroomId);
      } else {
        const supabase = createAdminClient();
        const { data } = await supabase.from('user_profiles').select('id, display_name').eq('role', 'student');
        students = data || [];
      }

      if (students.length === 0) {
        await updateContest(contest.id, {
          scan_status: 'completed',
          last_scanned_at: new Date().toISOString(),
          scan_message: 'No enrolled students found to scan for this classroom.',
        });
        return { success: true, message: 'No enrolled students to scan', scannedCount: 0, attendedCount: 0, pendingCount: 0 };
      }

      // 4. Collect linked accounts for this platform
      const targetAccounts: { studentId: string; account: PlatformAccount }[] = [];
      for (const st of students) {
        const accs = await getPlatformAccountsForStudent(st.id);
        const match = accs.find((a) => a.platform === contest.platform);
        if (match) {
          targetAccounts.push({ studentId: st.id, account: match });
        }
      }

      if (targetAccounts.length === 0) {
        await updateContest(contest.id, {
          scan_status: 'completed',
          last_scanned_at: new Date().toISOString(),
          scan_message: `No linked ${contest.platform === 'leetcode' ? 'LeetCode' : 'CodeChef'} accounts found in this classroom.`,
        });
        return { success: true, message: 'No linked accounts found', scannedCount: 0, attendedCount: 0, pendingCount: 0 };
      }

      let attendedCount = 0;
      let pendingCount = 0;
      let scannedCount = 0;

      // Platform specific scanning logic
      if (contest.platform === 'leetcode') {
        const contestStartSec = Math.floor(new Date(contest.start_time).getTime() / 1000);
        const contestTitleNorm = contest.title.trim().toLowerCase();
        const contestSlugNorm = contest.contest_code.trim().toLowerCase().replace(/-/g, ' ');

        for (const item of targetAccounts) {
          scannedCount++;
          const profileRes = await LeetCodeConnector.fetchProfileData(item.account.username);

          if (!profileRes.success || !profileRes.data) {
            // Profile failed or unreachable -> mark pending verification
            pendingCount++;
            continue;
          }

          const data = profileRes.data;
          const contestHistory = data.contestHistory || [];

          // Match student contest record
          const matchedHistory = contestHistory.find((ch) => {
            const titleNorm = ch.title.trim().toLowerCase();
            const timeDiff = Math.abs(ch.startTime - contestStartSec);
            return (
              titleNorm === contestTitleNorm ||
              titleNorm === contestSlugNorm ||
              timeDiff <= 7200 ||
              titleNorm.includes(contestTitleNorm)
            );
          });

          if (matchedHistory && matchedHistory.problemsSolved !== undefined) {
            // Student attended!
            attendedCount++;
            await saveContestRecord({
              platform_account_id: item.account.id,
              platform_contest_id: contest.contest_code,
              contest_name: contest.title,
              contest_date: contest.start_time,
              participation_status: 'attended',
              rank: matchedHistory.ranking || null,
              problems_solved: matchedHistory.problemsSolved,
              total_problems: matchedHistory.totalProblems || 4,
              rating_after: matchedHistory.rating || null,
              evidence_source: 'leetcode_user_contest_ranking_history',
              data_availability_status: 'complete',
            });
          } else {
            // Check if contest results have been published by LeetCode yet
            // If the contest ended recently and nobody in the community has history yet, LeetCode ratings are pending
            const hoursSinceEnd = (nowMs - endMs) / (1000 * 60 * 60);

            // If LeetCode hasn't published ratings yet (ratings usually publish within 2-3 days for LeetCode)
            // But if a student explicitly attended, their rating is computed. If student didn't attend and results are out:
            if (hoursSinceEnd < 24) {
              // Mark pending verification until official results are published
              pendingCount++;
              await saveContestRecord({
                platform_account_id: item.account.id,
                platform_contest_id: contest.contest_code,
                contest_name: contest.title,
                contest_date: contest.start_time,
                participation_status: 'pending_verification',
                rank: null,
                problems_solved: null,
                total_problems: 4,
                rating_after: null,
                evidence_source: 'leetcode_graphql_pending_check',
                data_availability_status: 'pending_publication',
              });
            } else {
              // Verified did not attend
              await saveContestRecord({
                platform_account_id: item.account.id,
                platform_contest_id: contest.contest_code,
                contest_name: contest.title,
                contest_date: contest.start_time,
                participation_status: 'not_attended',
                rank: null,
                problems_solved: 0,
                total_problems: 4,
                rating_after: null,
                evidence_source: 'leetcode_verified_non_attendance',
                data_availability_status: 'complete',
              });
            }
          }
        }
      } else if (contest.platform === 'codechef') {
        const contestCodeNorm = contest.contest_code.trim().toUpperCase();
        const contestTitleNorm = contest.title.trim().toLowerCase();

        for (const item of targetAccounts) {
          scannedCount++;
          // Delay to respect CodeChef rate limit
          await CodeChefConnector.sleep(1200);

          const profileRes = await CodeChefConnector.fetchProfileData(item.account.username);
          if (!profileRes.success || !profileRes.data) {
            pendingCount++;
            continue;
          }

          const data = profileRes.data;
          const contestHistory = data.contestHistory || [];

          const matchedHistory = contestHistory.find((ch) => {
            const codeMatch = ch.code && ch.code.toUpperCase() === contestCodeNorm;
            const nameMatch = ch.name && ch.name.toLowerCase().includes(contestTitleNorm);
            return codeMatch || nameMatch;
          });

          if (matchedHistory) {
            attendedCount++;
            await saveContestRecord({
              platform_account_id: item.account.id,
              platform_contest_id: contest.contest_code,
              contest_name: contest.title,
              contest_date: contest.start_time,
              participation_status: 'attended',
              rank: matchedHistory.rank || null,
              problems_solved: null, // CodeChef profile exposes rank/rating but not exact problem count
              total_problems: null,
              rating_after: matchedHistory.rating || null,
              evidence_source: 'codechef_all_rating_blob',
              data_availability_status: 'partial_rank_rating_verified',
            });
          } else {
            const hoursSinceEnd = (nowMs - endMs) / (1000 * 60 * 60);
            if (hoursSinceEnd < 12) {
              pendingCount++;
              await saveContestRecord({
                platform_account_id: item.account.id,
                platform_contest_id: contest.contest_code,
                contest_name: contest.title,
                contest_date: contest.start_time,
                participation_status: 'pending_verification',
                rank: null,
                problems_solved: null,
                total_problems: null,
                rating_after: null,
                evidence_source: 'codechef_pending_check',
                data_availability_status: 'pending_publication',
              });
            } else {
              await saveContestRecord({
                platform_account_id: item.account.id,
                platform_contest_id: contest.contest_code,
                contest_name: contest.title,
                contest_date: contest.start_time,
                participation_status: 'not_attended',
                rank: null,
                problems_solved: 0,
                total_problems: null,
                rating_after: null,
                evidence_source: 'codechef_verified_non_attendance',
                data_availability_status: 'complete',
              });
            }
          }
        }
      }

      // Check if we need to retry or mark complete
      const isRetrying = pendingCount > 0 && attendedCount === 0;
      const finalScanStatus: ContestScanStatus = isRetrying ? 'retrying' : 'completed';
      const scanMessage = isRetrying
        ? `Scan finished. Platform results appear pending publication (${pendingCount} accounts pending verification). System will re-scan.`
        : `Verified scan completed: ${attendedCount} attended, ${targetAccounts.length - attendedCount - pendingCount} not attended.`;

      await updateContest(contest.id, {
        scan_status: finalScanStatus,
        last_scanned_at: new Date().toISOString(),
        scan_message: scanMessage,
        retry_count: isRetrying ? (contest.retry_count || 0) + 1 : contest.retry_count,
      });

      return {
        success: true,
        message: scanMessage,
        scannedCount,
        attendedCount,
        pendingCount,
      };
    } catch (err: any) {
      await updateContest(contest.id, {
        scan_status: 'failed',
        scan_message: `Scan encountered an error: ${err?.message || 'Unknown error'}`,
      });
      return { success: false, message: err?.message || 'Scan failed', scannedCount: 0, attendedCount: 0, pendingCount: 0 };
    }
  }

  /**
   * Periodic scheduler: finds completed contests requiring auto-scan
   * Runs ~1 minute after scheduled contest end time
   */
  public static async checkAndRunScheduledScans(): Promise<{ triggeredContests: string[] }> {
    const supabase = createAdminClient();
    const nowMs = Date.now();
    const oneMinAgoIso = new Date(nowMs - 60000).toISOString();

    // Query contests that completed more than 1 minute ago and need scanning
    const { data: contestsToScan } = await supabase
      .from('contests')
      .select('*')
      .eq('status', 'completed')
      .in('scan_status', ['scheduled', 'retrying', 'not_started'])
      .lte('end_time', oneMinAgoIso)
      .limit(5);

    const triggered: string[] = [];

    for (const c of contestsToScan || []) {
      triggered.push(c.id);
      // Run asynchronously without blocking caller
      this.scanContest(c.id).catch((err) => {
        console.error(`[ContestService] Auto-scan error for contest ${c.id}:`, err);
      });
    }

    return { triggeredContests: triggered };
  }
}
