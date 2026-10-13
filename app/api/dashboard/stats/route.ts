import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getClassroomKPIs } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const classroomId = searchParams.get('classroomId');

  const kpis = await getClassroomKPIs(classroomId || null);

  const supabase = createAdminClient();

  // 1. Daily activity trends for the last 14 days from real database records
  let accountIds: string[] = [];

  if (classroomId) {
    const { data: members } = await supabase
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId)
      .eq('membership_status', 'enrolled');

    const studentIds = (members || []).map((m) => m.student_id);
    if (studentIds.length > 0) {
      const { data: accs } = await supabase
        .from('platform_accounts')
        .select('id')
        .in('student_id', studentIds);
      accountIds = (accs || []).map((a) => a.id);
    }
  }

  let activityQuery = supabase
    .from('daily_activity_snapshots')
    .select('activity_date, submission_count')
    .order('activity_date', { ascending: false });

  if (classroomId) {
    if (accountIds.length > 0) {
      activityQuery = activityQuery.in('platform_account_id', accountIds);
    } else {
      // No accounts in classroom
      activityQuery = activityQuery.in('platform_account_id', ['00000000-0000-0000-0000-000000000000']);
    }
  }

  const { data: rawActivities } = await activityQuery;

  // Aggregate by date (last 14 active dates)
  const dateMap: Record<string, { activeStudents: number; totalSubmissions: number }> = {};
  for (const act of rawActivities || []) {
    if (!dateMap[act.activity_date]) {
      dateMap[act.activity_date] = { activeStudents: 0, totalSubmissions: 0 };
    }
    if (act.submission_count > 0) {
      dateMap[act.activity_date].activeStudents += 1;
    }
    dateMap[act.activity_date].totalSubmissions += act.submission_count;
  }

  const sortedDates = Object.keys(dateMap).sort().slice(-14);
  const trends = sortedDates.map((date) => ({
    date,
    activeStudents: dateMap[date].activeStudents,
    totalSubmissions: dateMap[date].totalSubmissions,
  }));

  // 2. Platform distribution
  let lcAccountsCount = 0;
  let ccAccountsCount = 0;

  if (classroomId) {
    if (accountIds.length > 0) {
      const { data: accs } = await supabase
        .from('platform_accounts')
        .select('platform')
        .in('id', accountIds);

      for (const a of accs || []) {
        if (a.platform === 'leetcode') lcAccountsCount++;
        if (a.platform === 'codechef') ccAccountsCount++;
      }
    }
  } else {
    const { data: accs } = await supabase
      .from('platform_accounts')
      .select('platform');

    for (const a of accs || []) {
      if (a.platform === 'leetcode') lcAccountsCount++;
      if (a.platform === 'codechef') ccAccountsCount++;
    }
  }

  return NextResponse.json({
    kpis,
    trends,
    platforms: {
      leetcodeCount: lcAccountsCount,
      codechefCount: ccAccountsCount,
    },
  });
}
