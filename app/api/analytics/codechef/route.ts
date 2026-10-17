import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClassroomById, isStudentInClassroom, getClassroomsForTeacher } from '@/lib/db';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const classroomId = searchParams.get('classroomId');

  const supabase = createAdminClient();

  try {
    let studentIds: string[] | null = null;

    // 1. Role-based scoping and authorization
    if (user.role === 'student') {
      if (!classroomId) {
        return NextResponse.json(
          { error: 'Forbidden: Students cannot access institution-wide analytics' },
          { status: 403 }
        );
      }
      const isEnrolled = await isStudentInClassroom(classroomId, user.id);
      if (!isEnrolled) {
        return NextResponse.json(
          { error: 'Access denied: You are not enrolled in this classroom' },
          { status: 403 }
        );
      }
    } else if (user.role === 'teacher') {
      if (classroomId) {
        const classroom = await getClassroomById(classroomId);
        if (!classroom) {
          return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        }
        if (classroom.owner_teacher_id !== user.id) {
          return NextResponse.json(
            { error: 'Forbidden: You do not have permission to view analytics for this classroom' },
            { status: 403 }
          );
        }
      } else {
        const myClassrooms = await getClassroomsForTeacher(user.id);
        const myClassroomIds = myClassrooms.map((c) => c.id);
        if (myClassroomIds.length === 0) {
          return NextResponse.json({
            students: [],
            aggregates: {
              totalAccounts: 0,
              totalSolvedSum: 0,
              totalContestsSum: 0,
              averageRating: null,
              ratedUsersCount: 0,
            },
          });
        }

        const { data: teacherMemberships } = await supabase
          .from('classroom_memberships')
          .select('student_id')
          .in('classroom_id', myClassroomIds)
          .eq('membership_status', 'enrolled');

        studentIds = Array.from(new Set((teacherMemberships || []).map((m) => m.student_id)));
        if (studentIds.length === 0) {
          return NextResponse.json({
            students: [],
            aggregates: {
              totalAccounts: 0,
              totalSolvedSum: 0,
              totalContestsSum: 0,
              averageRating: null,
              ratedUsersCount: 0,
            },
          });
        }
      }
    } else if (user.role === 'admin') {
      if (classroomId) {
        const classroom = await getClassroomById(classroomId);
        if (!classroom) {
          return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
        }
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (classroomId) {
      const { data: memberships } = await supabase
        .from('classroom_memberships')
        .select('student_id')
        .eq('classroom_id', classroomId)
        .eq('membership_status', 'enrolled');

      studentIds = (memberships || []).map((m) => m.student_id);
      if (studentIds.length === 0) {
        return NextResponse.json({
          students: [],
          aggregates: {
            totalAccounts: 0,
            totalSolvedSum: 0,
            totalContestsSum: 0,
            averageRating: null,
            ratedUsersCount: 0,
          },
        });
      }
    }

  let accQuery = supabase
    .from('platform_accounts')
    .select('id, student_id, username, public_profile_url, last_successful_sync_at, account_status')
    .eq('platform', 'codechef');

  if (studentIds) {
    accQuery = accQuery.in('student_id', studentIds);
  }

  const { data: accounts } = await accQuery;
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({
      students: [],
      aggregates: {
        totalAccounts: 0,
        totalSolvedSum: 0,
        totalContestsSum: 0,
        averageRating: null,
        ratedUsersCount: 0,
      },
    });
  }

  const allStudentIds = accounts.map((a) => a.student_id);
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('id', allStudentIds);

  const profileMap: Record<string, string> = {};
  for (const p of profiles || []) {
    profileMap[p.id] = p.display_name;
  }

  const accountIds = accounts.map((a) => a.id);
  const { data: snapshots } = await supabase
    .from('platform_profile_snapshots')
    .select('id, platform_account_id, total_solved, global_rank, country_rank, contest_rating, highest_rating, highest_score, contests_attended, observed_at')
    .in('platform_account_id', accountIds)
    .order('observed_at', { ascending: false });

  const latestSnapMap: Record<string, any> = {};
  for (const s of snapshots || []) {
    if (!latestSnapMap[s.platform_account_id]) {
      latestSnapMap[s.platform_account_id] = s;
    }
  }

  const rows = accounts.map((p) => {
    const s = latestSnapMap[p.id] || {};
    return {
      display_name: profileMap[p.student_id] || 'Student',
      username: p.username,
      public_profile_url: p.public_profile_url,
      last_successful_sync_at: p.last_successful_sync_at,
      account_status: p.account_status,
      total_solved: s.total_solved || 0,
      global_rank: s.global_rank ?? null,
      country_rank: s.country_rank ?? null,
      contest_rating: s.contest_rating ?? null,
      highest_rating: s.highest_rating ?? null,
      highest_score: s.highest_score ?? null,
      contests_attended: s.contests_attended ?? null,
      validation_status: s.validation_status ?? 'pending',
      observed_at: s.observed_at ?? null,
    };
  });

  // Sort descending by contest_rating
  rows.sort((a, b) => (b.contest_rating || 0) - (a.contest_rating || 0));

  let totalSolvedSum = 0;
  let totalContestsSum = 0;
  let ratedUsersCount = 0;
  let contestRatingSum = 0;

  for (const r of rows) {
    if (r.total_solved) totalSolvedSum += r.total_solved;
    if (r.contests_attended) totalContestsSum += r.contests_attended;
    if (r.contest_rating) {
      ratedUsersCount++;
      contestRatingSum += r.contest_rating;
    }
  }

  const averageRating = ratedUsersCount > 0 ? Number((contestRatingSum / ratedUsersCount).toFixed(1)) : null;

  return NextResponse.json({
    students: rows,
    aggregates: {
      totalAccounts: rows.length,
      totalSolvedSum,
      totalContestsSum,
      averageRating,
      ratedUsersCount,
    },
  });
  } catch (err: any) {
    console.error('[ANALYTICS_CODECHEF_ERROR]:', err?.message || err);
    return NextResponse.json({ error: 'Failed to retrieve CodeChef analytics' }, { status: 500 });
  }
}
