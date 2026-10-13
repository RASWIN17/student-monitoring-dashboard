import {
  getScanJobById,
  updateScanJob,
  getScanJobItems,
  updateScanJobItem,
  savePlatformSnapshot,
  saveDailyActivity,
  saveContestRecord,
  logAuditAction,
} from '../db';
import { createAdminClient } from '../supabase/admin';
import { LeetCodeConnector } from './leetcode';
import { CodeChefConnector } from './codechef';
import { ScanJob, PlatformAccount } from '../types';

export class ScanEngine {
  /**
   * Run a scan job asynchronously
   */
  public static async executeScanJob(jobId: string): Promise<void> {
    const job = await getScanJobById(jobId);
    if (!job) return;

    const startTime = new Date().toISOString();
    await updateScanJob(jobId, {
      status: 'running',
      started_at: startTime,
    });

    const items = await getScanJobItems(jobId);
    let processed = 0;
    let successful = 0;
    let partial = 0;
    let failed = 0;

    const supabase = createAdminClient();

    for (const item of items) {
      const itemStart = new Date().toISOString();
      await updateScanJobItem(item.id, {
        status: 'running',
        started_at: itemStart,
      });

      // Find the account
      const { data: accountData } = await supabase
        .from('platform_accounts')
        .select('*')
        .eq('id', item.platform_account_id)
        .maybeSingle();

      const account = accountData as PlatformAccount | null;

      if (!account) {
        failed++;
        processed++;
        await updateScanJobItem(item.id, {
          status: 'failed',
          error_code: 'ACCOUNT_NOT_FOUND',
          error_message: 'Platform account was removed before scan',
          completed_at: new Date().toISOString(),
        });
        await updateScanJob(jobId, {
          processed_accounts: processed,
          failed_accounts: failed,
        });
        continue;
      }

      try {
        if (item.platform === 'leetcode') {
          // LeetCode extraction
          const result = await LeetCodeConnector.fetchProfileData(account.username);

          if (!result.success || !result.data) {
            failed++;
            processed++;
            const newStatus = result.errorCode === 'USER_NOT_FOUND' ? 'not_found' : 'error';
            await supabase
              .from('platform_accounts')
              .update({ account_status: newStatus })
              .eq('id', account.id);

            await updateScanJobItem(item.id, {
              status: 'failed',
              error_code: result.errorCode,
              error_message: result.errorMessage,
              missing_fields: result.unavailableFields,
              completed_at: new Date().toISOString(),
            });
          } else {
            // Save verified snapshot
            const data = result.data;
            await savePlatformSnapshot({
              platform_account_id: account.id,
              scan_job_id: jobId,
              total_solved: data.totalSolved,
              easy_solved: data.easySolved,
              medium_solved: data.mediumSolved,
              hard_solved: data.hardSolved,
              total_questions: data.totalQuestions,
              total_submissions: data.totalSubmissions,
              accepted_submissions: data.acceptedSubmissions,
              acceptance_rate: data.acceptanceRate,
              global_rank: data.ranking,
              contest_rating: data.contestRating,
              contests_attended: data.attendedContestsCount,
              source: 'leetcode_graphql',
              source_version: 'v1.0',
              validation_status: 'valid',
              available_fields: result.availableFields,
              unavailable_fields: result.unavailableFields,
              raw_data: {
                badge: data.contestBadge,
                recentSubmissionsCount: data.recentSubmissions.length,
              },
            });

            // Save daily activity
            const todayKolkata = data.dailyActivityAsiaKolkata.todayDate;
            const yesterdayKolkata = data.dailyActivityAsiaKolkata.yesterdayDate;

            await saveDailyActivity({
              platform_account_id: account.id,
              activity_date: todayKolkata,
              submission_count: data.dailyActivityAsiaKolkata.todaySubmissions,
              activity_status: data.dailyActivityAsiaKolkata.todaySubmissions > 0 ? 'active' : 'no_activity',
              source_coverage: 'leetcode_submission_calendar',
            });

            await saveDailyActivity({
              platform_account_id: account.id,
              activity_date: yesterdayKolkata,
              submission_count: data.dailyActivityAsiaKolkata.yesterdaySubmissions,
              activity_status: data.dailyActivityAsiaKolkata.yesterdaySubmissions > 0 ? 'active' : 'no_activity',
              source_coverage: 'leetcode_submission_calendar',
            });

            // Save contest records
            for (const c of data.contestHistory) {
              const contestDateIso = new Date(c.startTime * 1000).toISOString();
              await saveContestRecord({
                platform_account_id: account.id,
                contest_name: c.title,
                contest_date: contestDateIso,
                participation_status: 'attended',
                rank: c.ranking,
                score: null,
                problems_solved: c.problemsSolved,
                total_problems: c.totalProblems,
                rating_after: c.rating,
                evidence_source: 'leetcode_graphql_contest_history',
                data_availability_status: 'complete',
              });
            }

            successful++;
            processed++;
            await supabase
              .from('platform_accounts')
              .update({ account_status: 'active' })
              .eq('id', account.id);

            await updateScanJobItem(item.id, {
              status: 'succeeded',
              fields_retrieved: result.availableFields,
              missing_fields: result.unavailableFields,
              completed_at: new Date().toISOString(),
            });
          }
        } else if (item.platform === 'codechef') {
          // Polite delay for CodeChef to respect rate limits
          await CodeChefConnector.sleep(1500);

          const result = await CodeChefConnector.fetchProfileData(account.username);

          if (!result.success || !result.data) {
            failed++;
            processed++;
            const newStatus = result.errorCode === 'USER_NOT_FOUND' ? 'not_found' : 'error';
            await supabase
              .from('platform_accounts')
              .update({ account_status: newStatus })
              .eq('id', account.id);

            await updateScanJobItem(item.id, {
              status: 'failed',
              error_code: result.errorCode,
              error_message: result.errorMessage,
              missing_fields: result.unavailableFields,
              completed_at: new Date().toISOString(),
            });
          } else {
            const data = result.data;
            await savePlatformSnapshot({
              platform_account_id: account.id,
              scan_job_id: jobId,
              total_solved: data.totalSolved || 0,
              global_rank: data.globalRank,
              country_rank: data.countryRank,
              contest_rating: data.currentRating,
              highest_rating: data.highestRating,
              highest_score: data.highestRatingInHistory,
              contests_attended: data.totalContests,
              source: 'codechef_profile_html',
              source_version: 'v1.0',
              validation_status: 'valid',
              available_fields: result.availableFields,
              unavailable_fields: result.unavailableFields,
              raw_data: {
                stars: data.stars,
              },
            });

            // Save daily activity
            const todayKolkata = data.dailyActivityAsiaKolkata.todayDate;
            const yesterdayKolkata = data.dailyActivityAsiaKolkata.yesterdayDate;

            await saveDailyActivity({
              platform_account_id: account.id,
              activity_date: todayKolkata,
              submission_count: data.dailyActivityAsiaKolkata.todaySubmissions,
              activity_status: data.dailyActivityAsiaKolkata.todaySubmissions > 0 ? 'active' : 'no_activity',
              source_coverage: 'codechef_daily_submissions',
            });

            await saveDailyActivity({
              platform_account_id: account.id,
              activity_date: yesterdayKolkata,
              submission_count: data.dailyActivityAsiaKolkata.yesterdaySubmissions,
              activity_status: data.dailyActivityAsiaKolkata.yesterdaySubmissions > 0 ? 'active' : 'no_activity',
              source_coverage: 'codechef_daily_submissions',
            });

            // Save contest records
            for (const c of data.contestHistory) {
              await saveContestRecord({
                platform_account_id: account.id,
                platform_contest_id: c.code,
                contest_name: c.name,
                contest_date: c.date,
                participation_status: 'attended',
                rank: c.rank,
                rating_after: c.rating,
                evidence_source: 'codechef_all_rating_blob',
                data_availability_status: 'complete',
              });
            }

            successful++;
            processed++;
            await supabase
              .from('platform_accounts')
              .update({ account_status: 'active' })
              .eq('id', account.id);

            await updateScanJobItem(item.id, {
              status: 'succeeded',
              fields_retrieved: result.availableFields,
              missing_fields: result.unavailableFields,
              completed_at: new Date().toISOString(),
            });
          }
        }
      } catch (err: any) {
        failed++;
        processed++;
        await updateScanJobItem(item.id, {
          status: 'failed',
          error_code: 'UNHANDLED_EXCEPTION',
          error_message: err?.message || 'Unexpected error during account extraction',
          completed_at: new Date().toISOString(),
        });
      }

      // Update intermediate scan job status
      await updateScanJob(jobId, {
        processed_accounts: processed,
        successful_accounts: successful,
        partial_accounts: partial,
        failed_accounts: failed,
      });
    }

    // Determine final status
    let finalStatus: ScanJob['status'] = 'succeeded';
    if (failed === items.length && items.length > 0) {
      finalStatus = 'failed';
    } else if (failed > 0 || partial > 0) {
      finalStatus = 'partial';
    }

    const endTime = new Date().toISOString();
    await updateScanJob(jobId, {
      status: finalStatus,
      completed_at: endTime,
      error_summary: failed > 0 ? `${failed} account(s) encountered retrieval errors` : null,
    });

    await logAuditAction({
      user_id: job.requested_by,
      action: 'SCAN_COMPLETED',
      resource_type: 'scan_job',
      resource_id: jobId,
      details: {
        total: items.length,
        successful,
        failed,
        status: finalStatus,
      },
    });
  }
}
