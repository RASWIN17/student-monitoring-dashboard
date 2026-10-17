import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getClassroomOverview, getClassroomById, logAuditAction } from '@/lib/db';

function sanitizeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  // Prevent CSV Formula Injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Only authorized staff can export data' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const classroomId = searchParams.get('classroomId') || searchParams.get('classroom_id');
  const type = searchParams.get('type') || 'overview'; // 'overview' | 'leetcode' | 'codechef'

  if (!classroomId) {
    return NextResponse.json({ error: 'Classroom ID is required for export' }, { status: 400 });
  }

  const classroom = await getClassroomById(classroomId);
  if (!classroom) {
    return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
  }

  // Enforce role-based classroom authorization: prevent cross-teacher IDOR
  if (user.role !== 'admin' && classroom.owner_teacher_id !== user.id) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to export records for this classroom' },
      { status: 403 }
    );
  }

  try {
    const students = await getClassroomOverview(classroomId);

    let csvContent = '';
    let filename = `codetrack_${classroom.name.toLowerCase().replace(/\s+/g, '_')}_${type}_export.csv`;

  if (type === 'leetcode') {
    const headers = [
      'Student ID',
      'Student Name',
      'Student Email',
      'LeetCode Username',
      'LeetCode Profile URL',
      'Account Status',
      'Total Solved',
      'Easy Solved',
      'Medium Solved',
      'Hard Solved',
      'Acceptance Rate (%)',
      'Contest Rating',
      'Global Contest Rank',
      'Contests Attended',
      'Today Submissions (Asia/Kolkata)',
      'Yesterday Submissions (Asia/Kolkata)',
      'Last Successful Sync',
      'Data Availability',
    ];
    csvContent += headers.map(sanitizeCsvCell).join(',') + '\n';

    for (const item of students) {
      const lc = item.leetcodeAccount;
      const snap = item.leetcodeSnapshot;
      const row = [
        item.student.id,
        item.student.display_name,
        item.student.email,
        lc ? lc.username : '',
        lc ? lc.public_profile_url : '',
        lc ? lc.account_status : 'not_linked',
        snap ? snap.total_solved : '',
        snap?.easy_solved !== null && snap?.easy_solved !== undefined ? snap.easy_solved : '',
        snap?.medium_solved !== null && snap?.medium_solved !== undefined ? snap.medium_solved : '',
        snap?.hard_solved !== null && snap?.hard_solved !== undefined ? snap.hard_solved : '',
        snap?.acceptance_rate !== null && snap?.acceptance_rate !== undefined ? snap.acceptance_rate : '',
        snap?.contest_rating !== null && snap?.contest_rating !== undefined ? snap.contest_rating : '',
        snap?.global_rank !== null && snap?.global_rank !== undefined ? snap.global_rank : '',
        snap?.contests_attended !== null && snap?.contests_attended !== undefined ? snap.contests_attended : '',
        item.leetcodeTodayActivity?.submission_count ?? '',
        item.leetcodeYesterdayActivity?.submission_count ?? '',
        lc?.last_successful_sync_at ?? '',
        snap ? snap.validation_status : (lc ? 'pending_scan' : 'not_linked'),
      ];
      csvContent += row.map(sanitizeCsvCell).join(',') + '\n';
    }
  } else if (type === 'codechef') {
    const headers = [
      'Student ID',
      'Student Name',
      'Student Email',
      'CodeChef Username',
      'CodeChef Profile URL',
      'Account Status',
      'Total Solved',
      'Current Rating',
      'Highest Rating',
      'Global Rank',
      'Country Rank',
      'Contests Attended',
      'Today Submissions (Asia/Kolkata)',
      'Yesterday Submissions (Asia/Kolkata)',
      'Last Successful Sync',
      'Data Availability',
    ];
    csvContent += headers.map(sanitizeCsvCell).join(',') + '\n';

    for (const item of students) {
      const cc = item.codechefAccount;
      const snap = item.codechefSnapshot;
      const row = [
        item.student.id,
        item.student.display_name,
        item.student.email,
        cc ? cc.username : '',
        cc ? cc.public_profile_url : '',
        cc ? cc.account_status : 'not_linked',
        snap ? snap.total_solved : '',
        snap?.contest_rating !== null && snap?.contest_rating !== undefined ? snap.contest_rating : '',
        snap?.highest_rating !== null && snap?.highest_rating !== undefined ? snap.highest_rating : '',
        snap?.global_rank !== null && snap?.global_rank !== undefined ? snap.global_rank : '',
        snap?.country_rank !== null && snap?.country_rank !== undefined ? snap.country_rank : '',
        snap?.contests_attended !== null && snap?.contests_attended !== undefined ? snap.contests_attended : '',
        item.codechefTodayActivity?.submission_count ?? '',
        item.codechefYesterdayActivity?.submission_count ?? '',
        cc?.last_successful_sync_at ?? '',
        snap ? snap.validation_status : (cc ? 'pending_scan' : 'not_linked'),
      ];
      csvContent += row.map(sanitizeCsvCell).join(',') + '\n';
    }
  } else {
    // Overview export
    const headers = [
      'Student ID',
      'Student Name',
      'Student Email',
      'LeetCode Username',
      'LeetCode Solved',
      'LeetCode Rating',
      'LeetCode Today Activity',
      'CodeChef Username',
      'CodeChef Solved',
      'CodeChef Rating',
      'CodeChef Today Activity',
      'LeetCode Last Sync',
      'CodeChef Last Sync',
    ];
    csvContent += headers.map(sanitizeCsvCell).join(',') + '\n';

    for (const item of students) {
      const lcSnap = item.leetcodeSnapshot;
      const ccSnap = item.codechefSnapshot;
      const row = [
        item.student.id,
        item.student.display_name,
        item.student.email,
        item.leetcodeAccount ? item.leetcodeAccount.username : '',
        lcSnap ? lcSnap.total_solved : '',
        lcSnap?.contest_rating ?? '',
        item.leetcodeTodayActivity?.activity_status ?? (item.leetcodeAccount ? 'no_record' : 'not_linked'),
        item.codechefAccount ? item.codechefAccount.username : '',
        ccSnap ? ccSnap.total_solved : '',
        ccSnap?.contest_rating ?? '',
        item.codechefTodayActivity?.activity_status ?? (item.codechefAccount ? 'no_record' : 'not_linked'),
        item.leetcodeAccount?.last_successful_sync_at ?? '',
        item.codechefAccount?.last_successful_sync_at ?? '',
      ];
      csvContent += row.map(sanitizeCsvCell).join(',') + '\n';
    }
  }

  await logAuditAction({
    user_id: user.id,
    action: 'DATA_EXPORTED_CSV',
    resource_type: 'classrooms',
    resource_id: classroomId,
    details: { exportType: type, classroomName: classroom.name, rowCount: students.length },
  });

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
  } catch (err: any) {
    console.error('[EXPORT_ERROR] Failed to export classroom data:', err?.message || err);
    return NextResponse.json({ error: 'Failed to generate export file' }, { status: 500 });
  }
}
