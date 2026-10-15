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
} from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';
import { ScanEngine } from '@/lib/connectors/scanner';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const classroomId = searchParams.get('classroomId');

  const jobs = await getScanJobsForClassroom(classroomId || null, 25);
  return NextResponse.json({ jobs });
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
    return NextResponse.json({ error: err?.message || 'Failed to start scan' }, { status: 500 });
  }
}
