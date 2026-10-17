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

  // Parallel fetch: student profile and enrolled classrooms
  const [student, classrooms] = await Promise.all([
    getUserById(id),
    getClassroomsForStudent(id),
  ]);

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  // If user is a teacher, verify they teach at least one classroom this student belongs to
  if (user.role === 'teacher') {
    const teachesStudent = classrooms.some((c) => c.owner_teacher_id === user.id);
    if (!teachesStudent) {
      return NextResponse.json(
        { error: 'Access forbidden: You do not teach this student' },
        { status: 403 }
      );
    }
  }

  // Parallel fetch: LeetCode and CodeChef platform accounts
  const [lcAccount, ccAccount] = await Promise.all([
    getPlatformAccount(id, 'leetcode'),
    getPlatformAccount(id, 'codechef'),
  ]);

  const supabase = createAdminClient();

  // Parallel fetch: snapshots, contest records, daily activity, and historical metrics for both platforms
  const [
    lcSnapshot,
    lcContests,
    lcDailyRes,
    lcHistoryRes,
    ccSnapshot,
    ccContests,
    ccDailyRes,
    ccHistoryRes,
  ] = await Promise.all([
    lcAccount ? getLatestSnapshotForAccount(lcAccount.id) : Promise.resolve(null),
    lcAccount ? getContestsForAccount(lcAccount.id, 20) : Promise.resolve([]),
    lcAccount
      ? supabase
          .from('daily_activity_snapshots')
          .select('*')
          .eq('platform_account_id', lcAccount.id)
          .order('activity_date', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    lcAccount
      ? supabase
          .from('platform_profile_snapshots')
          .select('total_solved, contest_rating, acceptance_rate, observed_at')
          .eq('platform_account_id', lcAccount.id)
          .order('observed_at', { ascending: true })
          .limit(50)
      : Promise.resolve({ data: [] }),
    ccAccount ? getLatestSnapshotForAccount(ccAccount.id) : Promise.resolve(null),
    ccAccount ? getContestsForAccount(ccAccount.id, 20) : Promise.resolve([]),
    ccAccount
      ? supabase
          .from('daily_activity_snapshots')
          .select('*')
          .eq('platform_account_id', ccAccount.id)
          .order('activity_date', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    ccAccount
      ? supabase
          .from('platform_profile_snapshots')
          .select('total_solved, contest_rating, observed_at')
          .eq('platform_account_id', ccAccount.id)
          .order('observed_at', { ascending: true })
          .limit(50)
      : Promise.resolve({ data: [] }),
  ]);

  const lcDaily = lcDailyRes.data || [];
  const lcHistory = lcHistoryRes.data || [];
  const ccDaily = ccDailyRes.data || [];
  const ccHistory = ccHistoryRes.data || [];

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
