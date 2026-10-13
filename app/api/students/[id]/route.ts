import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getUserById,
  getClassroomsForStudent,
  getPlatformAccount,
  getLatestSnapshotForAccount,
  getContestsForAccount,
} from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // If user is a student, ensure they can only view their own profile
  if (user.role === 'student' && user.id !== id) {
    return NextResponse.json({ error: 'Access forbidden' }, { status: 403 });
  }

  const student = await getUserById(id);
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const classrooms = await getClassroomsForStudent(id);

  // LeetCode data
  const lcAccount = await getPlatformAccount(id, 'leetcode');
  const lcSnapshot = lcAccount ? await getLatestSnapshotForAccount(lcAccount.id) : null;
  const lcContests = lcAccount ? await getContestsForAccount(lcAccount.id, 20) : [];

  // CodeChef data
  const ccAccount = await getPlatformAccount(id, 'codechef');
  const ccSnapshot = ccAccount ? await getLatestSnapshotForAccount(ccAccount.id) : null;
  const ccContests = ccAccount ? await getContestsForAccount(ccAccount.id, 20) : [];

  // Daily activity history for both
  const supabase = createAdminClient();

  let lcDaily: any[] = [];
  if (lcAccount) {
    const { data } = await supabase
      .from('daily_activity_snapshots')
      .select('*')
      .eq('platform_account_id', lcAccount.id)
      .order('activity_date', { ascending: false })
      .limit(30);
    lcDaily = data || [];
  }

  let ccDaily: any[] = [];
  if (ccAccount) {
    const { data } = await supabase
      .from('daily_activity_snapshots')
      .select('*')
      .eq('platform_account_id', ccAccount.id)
      .order('activity_date', { ascending: false })
      .limit(30);
    ccDaily = data || [];
  }

  // Historical snapshots (for metric changes over time)
  let lcHistory: any[] = [];
  if (lcAccount) {
    const { data } = await supabase
      .from('platform_profile_snapshots')
      .select('total_solved, contest_rating, acceptance_rate, observed_at')
      .eq('platform_account_id', lcAccount.id)
      .order('observed_at', { ascending: true })
      .limit(50);
    lcHistory = data || [];
  }

  let ccHistory: any[] = [];
  if (ccAccount) {
    const { data } = await supabase
      .from('platform_profile_snapshots')
      .select('total_solved, contest_rating, observed_at')
      .eq('platform_account_id', ccAccount.id)
      .order('observed_at', { ascending: true })
      .limit(50);
    ccHistory = data || [];
  }

  return NextResponse.json({
    student,
    classrooms,
    leetcode: {
      account: lcAccount,
      snapshot: lcSnapshot,
      contests: lcContests,
      dailyActivity: lcDaily,
      history: lcHistory,
    },
    codechef: {
      account: ccAccount,
      snapshot: ccSnapshot,
      contests: ccContests,
      dailyActivity: ccDaily,
      history: ccHistory,
    },
  });
}
