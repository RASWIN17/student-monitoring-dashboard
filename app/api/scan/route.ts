import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getClassroomById,
  getEnrolledStudents,
  getPlatformAccountsForStudent,
  createScanJob,
  createScanJobItem,
  getScanJobsForClassroom,
  logAuditAction,
  getClassroomsForStudent,
  getClassroomsForTeacher,
} from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';
import { ScanEngine } from '@/lib/connectors/scanner';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Reject students from accessing scan logs
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Access restricted to authorized staff' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const classroomId = searchParams.get('classroomId');

  try {
    if (classroomId) {
      const classroom = await getClassroomById(classroomId);
      if (!classroom) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
      }
      if (classroom.owner_teacher_id !== user.id && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to view scan jobs for this classroom' },
          { status: 403 }
        );
      }
      const jobs = await getScanJobsForClassroom(classroomId, 25);
      return NextResponse.json({ jobs });
    }

    if (user.role === 'admin') {
      const jobs = await getScanJobsForClassroom(null, 25);
      return NextResponse.json({ jobs });
    }

    // Teacher without classroomId: only return jobs belonging to teacher's classrooms
    const teacherClassrooms = await getClassroomsForTeacher(user.id);
    const teacherClassroomIds = teacherClassrooms.map((c) => c.id);
    if (teacherClassroomIds.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const supabase = createAdminClient();
    const { data: jobs, error } = await supabase
      .from('scan_jobs')
      .select('*')
      .in('classroom_id', teacherClassroomIds)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      console.error('[SCAN_GET_ERROR] Error fetching teacher scan jobs:', error);
      return NextResponse.json({ error: 'Failed to retrieve scan jobs' }, { status: 500 });
    }

    return NextResponse.json({ jobs: jobs || [] });
  } catch (err: any) {
    console.error('[SCAN_GET_ERROR]:', err?.message || err);
    return NextResponse.json({ error: 'Failed to retrieve scan jobs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Only teachers can initiate scans' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const classroomId = body.classroomId || body.classroom_id;
    const targetStudentId = body.targetStudentId || body.target_student_id;
    let platform = body.platform || body.platforms || 'all';
    if (platform === 'both') platform = 'all';

    if (!classroomId && !targetStudentId) {
      return NextResponse.json({ error: 'Classroom ID or Target Student ID is required' }, { status: 400 });
    }

    if (classroomId) {
      const classroom = await getClassroomById(classroomId);
      if (!classroom) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
      }
      if (classroom.owner_teacher_id !== user.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized to scan this classroom' }, { status: 403 });
      }
    } else if (targetStudentId && user.role !== 'admin') {
      const studentClassrooms = await getClassroomsForStudent(targetStudentId);
      const teacherOwnsClassroom = studentClassrooms.some((c) => c.owner_teacher_id === user.id);
      if (!teacherOwnsClassroom) {
        return NextResponse.json({ error: 'Unauthorized to scan this student' }, { status: 403 });
      }
    }

    // Check for duplicate active scans running right now
    const supabase = createAdminClient();
    let activeQuery = supabase
      .from('scan_jobs')
      .select('id')
      .in('status', ['queued', 'running']);

    if (targetStudentId) {
      activeQuery = activeQuery.eq('target_student_id', targetStudentId);
    } else if (classroomId) {
      activeQuery = activeQuery.eq('classroom_id', classroomId);
    }

    const { data: activeRunning } = await activeQuery.limit(1);

    if (activeRunning && activeRunning.length > 0) {
      return NextResponse.json(
        {
          error: targetStudentId
            ? 'A scan is already currently in progress for this student. Please wait for it to complete.'
            : 'A scan is already currently in progress for this classroom. Please wait for it to complete.',
        },
        { status: 429 }
      );
    }

    // Determine target students
    let targetStudents: { id: string }[] = [];
    if (targetStudentId) {
      targetStudents = [{ id: targetStudentId }];
    } else if (classroomId) {
      targetStudents = await getEnrolledStudents(classroomId);
    }

    // Collect linked accounts to scan
    const accountsToScan: { accountId: string; platform: 'leetcode' | 'codechef' }[] = [];

    for (const student of targetStudents) {
      const accounts = await getPlatformAccountsForStudent(student.id);
      for (const acc of accounts) {
        if (platform === 'all' || platform === acc.platform) {
          accountsToScan.push({
            accountId: acc.id,
            platform: acc.platform,
          });
        }
      }
    }

    if (accountsToScan.length === 0) {
      return NextResponse.json(
        { error: 'No linked LeetCode or CodeChef accounts found to scan for the selected scope.' },
        { status: 400 }
      );
    }

    // Create the persistent scan job
    const job = await createScanJob({
      classroom_id: classroomId ?? null,
      requested_by: user.id,
      selected_platforms: platform,
      requested_scope: targetStudentId ? 'student' : 'classroom',
      target_student_id: targetStudentId ?? null,
      total_accounts: accountsToScan.length,
    });

    // Create individual scan job items
    for (const item of accountsToScan) {
      await createScanJobItem({
        scan_job_id: job.id,
        platform_account_id: item.accountId,
        platform: item.platform,
      });
    }

    await logAuditAction({
      user_id: user.id,
      action: 'SCAN_INITIATED',
      resource_type: 'scan_jobs',
      resource_id: job.id,
      details: {
        classroomId,
        targetStudentId,
        platform,
        totalAccounts: accountsToScan.length,
      },
    });

    // Fire background execution asynchronously
    ScanEngine.executeScanJob(job.id).catch((err) => {
      console.error(`Error executing scan job ${job.id}:`, err);
    });

    return NextResponse.json({ job }, { status: 202 });
  } catch (err: any) {
    console.error('[SCAN_POST_ERROR] Failed to start scan:', err?.message || err);
    return NextResponse.json({ error: 'Failed to start scan job' }, { status: 500 });
  }
}
