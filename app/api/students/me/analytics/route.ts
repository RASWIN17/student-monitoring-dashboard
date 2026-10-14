import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getPlatformAccount,
  getLatestSnapshotForAccount,
  getContestsForAccount,
  savePlatformSnapshot,
  saveDailyActivity,
  saveContestRecord,
  logAuditAction,
} from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';
import { LeetCodeConnector } from '@/lib/connectors/leetcode';
import { CodeChefConnector } from '@/lib/connectors/codechef';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform');

  if (!platform || (platform !== 'leetcode' && platform !== 'codechef')) {
    return NextResponse.json({ error: 'Valid platform (leetcode or codechef) is required' }, { status: 400 });
  }

  // 1. Retrieve the authenticated student's platform account (strictly isolated by user.id)
  const account = await getPlatformAccount(user.id, platform);

  // State 2: Not Connected
  if (!account) {
    return NextResponse.json({
      connected: false,
      account: null,
      snapshot: null,
      contests: [],
      dailyActivity: [],
      state: 'not_connected',
    });
  }

  // 2. Retrieve verified snapshot from database
  const snapshot = await getLatestSnapshotForAccount(account.id);

  // 3. Retrieve verified contest records (STRICT RESTRICTION: never return upcoming contests)
  const allContests = await getContestsForAccount(account.id, 50);
  const verifiedContests = (allContests || []).filter(
    (c) => c.participation_status === 'attended' || c.participation_status === 'not_attended' || c.participation_status === 'pending_verification'
  );

  // 4. Retrieve daily activity
  const supabase = createAdminClient();
  const { data: dailyActivity } = await supabase
    .from('daily_activity_snapshots')
    .select('*')
    .eq('platform_account_id', account.id)
    .order('activity_date', { ascending: false })
    .limit(30);

  // Determine the verified state
  if (account.account_status === 'error' || account.account_status === 'rate_limited') {
    return NextResponse.json({
      connected: true,
      account,
      snapshot,
      contests: verifiedContests,
      dailyActivity: dailyActivity || [],
      state: snapshot ? 'connected' : 'data_unavailable',
      warning: 'Platform data connection is currently experiencing errors or rate limits.',
    });
  }

  if (!snapshot) {
    return NextResponse.json({
      connected: true,
      account,
      snapshot: null,
      contests: verifiedContests,
      dailyActivity: dailyActivity || [],
      state: 'no_statistics',
    });
  }

  return NextResponse.json({
    connected: true,
    account,
    snapshot,
    contests: verifiedContests,
    dailyActivity: dailyActivity || [],
    state: 'connected',
  });
}

/**
 * Trigger verified real-data synchronization for the currently authenticated student
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const platform = body.platform;

    if (!platform || (platform !== 'leetcode' && platform !== 'codechef')) {
      return NextResponse.json({ error: 'Valid platform is required' }, { status: 400 });
    }

    const account = await getPlatformAccount(user.id, platform);
    if (!account) {
      return NextResponse.json({ error: 'Account not connected' }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (platform === 'leetcode') {
      const result = await LeetCodeConnector.fetchProfileData(account.username);

      if (!result.success || !result.data) {
        await supabase
          .from('platform_accounts')
          .update({ account_status: result.errorCode === 'USER_NOT_FOUND' ? 'not_found' : 'error' })
          .eq('id', account.id);

        return NextResponse.json({
          success: false,
          error: result.errorMessage || 'Unable to fetch data from LeetCode. Data temporarily unavailable.',
        }, { status: 502 });
      }

      const data = result.data;
      const snapshot = await savePlatformSnapshot({
        platform_account_id: account.id,
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
      if (data.dailyActivityAsiaKolkata) {
        await saveDailyActivity({
          platform_account_id: account.id,
          activity_date: data.dailyActivityAsiaKolkata.todayDate,
          submission_count: data.dailyActivityAsiaKolkata.todaySubmissions,
          activity_status: data.dailyActivityAsiaKolkata.todaySubmissions > 0 ? 'active' : 'no_activity',
          source_coverage: 'leetcode_submission_calendar',
        });
      }

      // Save contest history
      if (data.contestHistory && Array.isArray(data.contestHistory)) {
        for (const c of data.contestHistory) {
          await saveContestRecord({
            platform_account_id: account.id,
            contest_name: c.title,
            contest_date: new Date(c.startTime * 1000).toISOString(),
            participation_status: 'attended',
            rank: c.ranking,
            problems_solved: c.problemsSolved,
            total_problems: c.totalProblems,
            rating_after: c.rating,
            evidence_source: 'leetcode_contest_ranking',
            data_availability_status: 'official_rating_published',
          });
        }
      }

      await supabase
        .from('platform_accounts')
        .update({ account_status: 'active', last_successful_sync_at: new Date().toISOString() })
        .eq('id', account.id);

      await logAuditAction({
        user_id: user.id,
        action: 'STUDENT_LEETCODE_SYNCED',
        resource_type: 'platform_profile_snapshots',
        resource_id: snapshot.id,
        details: { username: account.username },
      });

      return NextResponse.json({ success: true, snapshot });
    } else {
      // CodeChef sync
      const result = await CodeChefConnector.fetchProfileData(account.username);

      if (!result.success || !result.data) {
        await supabase
          .from('platform_accounts')
          .update({ account_status: result.errorCode === 'USER_NOT_FOUND' ? 'not_found' : 'error' })
          .eq('id', account.id);

        return NextResponse.json({
          success: false,
          error: result.errorMessage || 'Unable to fetch data from CodeChef. Data temporarily unavailable.',
        }, { status: 502 });
      }

      const data = result.data;
      const snapshot = await savePlatformSnapshot({
        platform_account_id: account.id,
        total_solved: data.totalSolved ?? 0,
        global_rank: data.globalRank,
        country_rank: data.countryRank,
        contest_rating: data.currentRating,
        highest_rating: data.highestRating,
        contests_attended: data.totalContests,
        source: 'codechef_scraper',
        source_version: 'v1.0',
        validation_status: 'valid',
        available_fields: result.availableFields,
        unavailable_fields: result.unavailableFields,
        raw_data: {
          stars: data.stars,
        },
      });

      // Save daily activity
      if (data.dailyActivityAsiaKolkata) {
        await saveDailyActivity({
          platform_account_id: account.id,
          activity_date: data.dailyActivityAsiaKolkata.todayDate,
          submission_count: data.dailyActivityAsiaKolkata.todaySubmissions,
          activity_status: data.dailyActivityAsiaKolkata.todaySubmissions > 0 ? 'active' : 'no_activity',
          source_coverage: 'codechef_daily_submissions',
        });
      }

      // Save contest history
      if (data.contestHistory && Array.isArray(data.contestHistory)) {
        for (const c of data.contestHistory) {
          await saveContestRecord({
            platform_account_id: account.id,
            platform_contest_id: c.code,
            contest_name: c.name,
            contest_date: c.date,
            participation_status: 'attended',
            rank: c.rank,
            rating_after: c.rating,
            evidence_source: 'codechef_contest_ratings',
            data_availability_status: 'official_rating_published',
          });
        }
      }

      await supabase
        .from('platform_accounts')
        .update({ account_status: 'active', last_successful_sync_at: new Date().toISOString() })
        .eq('id', account.id);

      await logAuditAction({
        user_id: user.id,
        action: 'STUDENT_CODECHEF_SYNCED',
        resource_type: 'platform_profile_snapshots',
        resource_id: snapshot.id,
        details: { username: account.username },
      });

      return NextResponse.json({ success: true, snapshot });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error syncing platform account' }, { status: 500 });
  }
}
