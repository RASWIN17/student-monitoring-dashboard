import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getScanJobById, getScanJobItems, getClassroomById, getClassroomsForStudent } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const job = await getScanJobById(id);
    if (!job) {
      return NextResponse.json({ error: 'Scan job not found' }, { status: 404 });
    }

    // Role-based authorization: prevent cross-user scan job leakage
    if (user.role === 'student') {
      if (job.target_student_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this scan job' }, { status: 403 });
      }
    } else if (user.role === 'teacher') {
      if (job.classroom_id) {
        const classroom = await getClassroomById(job.classroom_id);
        if (!classroom || classroom.owner_teacher_id !== user.id) {
          return NextResponse.json({ error: 'Forbidden: You do not have access to this classroom scan' }, { status: 403 });
        }
      } else if (job.target_student_id) {
        const studentClassrooms = await getClassroomsForStudent(job.target_student_id);
        const teachesStudent = studentClassrooms.some((c) => c.owner_teacher_id === user.id);
        if (!teachesStudent) {
          return NextResponse.json({ error: 'Forbidden: You do not have access to this student scan' }, { status: 403 });
        }
      }
    } else if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const items = await getScanJobItems(id);

  // Enhance items with student name and username for progress visualization
  const supabase = createAdminClient();
  const accountIds = items.map((i) => i.platform_account_id);

  let accounts: any[] = [];
  if (accountIds.length > 0) {
    const { data } = await supabase
      .from('platform_accounts')
      .select('id, username, student_id')
      .in('id', accountIds);
    accounts = data || [];
  }

  const studentIds = accounts.map((a) => a.student_id);
  let students: any[] = [];
  if (studentIds.length > 0) {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .in('id', studentIds);
    students = data || [];
  }

  const studentMap: Record<string, string> = {};
  for (const s of students) {
    studentMap[s.id] = s.display_name;
  }

  const accountMap: Record<string, { username: string; studentName: string }> = {};
  for (const a of accounts) {
    accountMap[a.id] = {
      username: a.username,
      studentName: studentMap[a.student_id] || 'Unknown',
    };
  }

  const enhancedItems = items.map((item) => {
    const info = accountMap[item.platform_account_id];
    return {
      ...item,
      username: info?.username || 'Unknown',
      studentName: info?.studentName || 'Unknown',
    };
  });

  return NextResponse.json({ job, items: enhancedItems });
  } catch (err: any) {
    console.error('[SCAN_ID_GET_ERROR]:', err?.message || err);
    return NextResponse.json({ error: 'Failed to retrieve scan job details' }, { status: 500 });
  }
}
