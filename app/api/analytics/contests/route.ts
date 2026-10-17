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

    // Role-based scoping and authorization
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
          return NextResponse.json({ contests: [] });
        }

        const { data: teacherMemberships } = await supabase
          .from('classroom_memberships')
          .select('student_id')
          .in('classroom_id', myClassroomIds)
          .eq('membership_status', 'enrolled');

        studentIds = Array.from(new Set((teacherMemberships || []).map((m) => m.student_id)));
        if (studentIds.length === 0) {
          return NextResponse.json({ contests: [] });
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
        return NextResponse.json({ contests: [] });
      }
    }

  let accQuery = supabase
    .from('platform_accounts')
    .select('id, student_id, platform, username');

  if (studentIds) {
    accQuery = accQuery.in('student_id', studentIds);
  }

  const { data: accounts } = await accQuery;
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ contests: [] });
  }

  const accountIds = accounts.map((a) => a.id);
  const { data: contests } = await supabase
    .from('contest_records')
    .select('*')
    .in('platform_account_id', accountIds)
    .order('contest_date', { ascending: false })
    .limit(100);

  if (!contests || contests.length === 0) {
    return NextResponse.json({ contests: [] });
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

  const accountMap: Record<string, { platform: string; username: string; studentId: string }> = {};
  for (const a of accounts) {
    accountMap[a.id] = { platform: a.platform, username: a.username, studentId: a.student_id };
  }

  const rows = contests.map((c) => {
    const acc = accountMap[c.platform_account_id] || { platform: 'unknown', username: 'unknown', studentId: '' };
    return {
      id: c.id,
      contest_name: c.contest_name,
      contest_date: c.contest_date,
      participation_status: c.participation_status,
      rank: c.rank,
      score: c.score,
      problems_solved: c.problems_solved,
      total_problems: c.total_problems,
      rating_after: c.rating_after,
      evidence_source: c.evidence_source,
      data_availability_status: c.data_availability_status,
      platform: acc.platform,
      username: acc.username,
      display_name: profileMap[acc.studentId] || 'Student',
    };
  });

  return NextResponse.json({ contests: rows });
  } catch (err: any) {
    console.error('[ANALYTICS_CONTESTS_ERROR]:', err?.message || err);
    return NextResponse.json({ error: 'Failed to retrieve contest analytics' }, { status: 500 });
  }
}
