import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ContestService } from '@/lib/connectors/contests';
import { getContests, getContestAnalyticsForClassroom, getClassroomById, isStudentInClassroom } from '@/lib/db';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const platform = (searchParams.get('platform') as 'leetcode' | 'codechef' | 'all') || 'all';
  const status = searchParams.get('status') || 'all';
  const classroomId = searchParams.get('classroomId');
  const sync = searchParams.get('sync') === 'true';

  // If classroomId is provided, enforce access control
  if (classroomId) {
    if (user.role === 'student') {
      const isEnrolled = await isStudentInClassroom(classroomId, user.id);
      if (!isEnrolled) {
        return NextResponse.json(
          { error: 'Access denied: You are not enrolled in this classroom' },
          { status: 403 }
        );
      }
    } else if (user.role === 'teacher') {
      const classroom = await getClassroomById(classroomId);
      if (!classroom) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
      }
      if (classroom.owner_teacher_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to view contest data for this classroom' },
          { status: 403 }
        );
      }
    }
  }

  try {
    // 1. Sync live contest schedule from platforms dynamically
    // If sync requested or we have fewer than 2 contests in db
    const existing = await getContests({ platform, status, limit: 100 });
    if (sync || existing.length === 0) {
      await ContestService.syncContests();
    } else {
      // Trigger background sync without awaiting to keep page load fast
      ContestService.syncContests().catch((err) => console.warn('Background sync error:', err));
    }

    // Also check for any scheduled auto-scans for ended contests
    ContestService.checkAndRunScheduledScans().catch((err) => console.warn('Scheduled scan error:', err));

    // 2. Fetch up-to-date contests
    const contests = await getContests({ platform, status, limit: 100 });

    // 3. If classroomId is provided (and authorized), enrich with attendance summary
    const shouldEnrichAttendance = Boolean(classroomId || user.role === 'admin');
    const enriched = await Promise.all(
      contests.map(async (c) => {
        if (!shouldEnrichAttendance) {
          return c;
        }
        try {
          const analytics = await getContestAnalyticsForClassroom(c.id, classroomId || null);
          return {
            ...c,
            linked_accounts_count: analytics?.summary.totalLinked ?? 0,
            attended_count: analytics?.summary.attendedCount ?? 0,
            not_attended_count: analytics?.summary.notAttendedCount ?? 0,
            pending_verification_count: analytics?.summary.pendingCount ?? 0,
          };
        } catch {
          return c;
        }
      })
    );

    // 4. Ensure upcoming & live contests are ordered in ascending chronological order (soonest first)
    // while completed contests remain in descending order (most recently completed first)
    const upcomingAndLive = enriched
      .filter((c) => c.status !== 'completed')
      .sort((a, b) => {
        const timeA = new Date(a.start_time).getTime();
        const timeB = new Date(b.start_time).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.title.localeCompare(b.title);
      });

    const completed = enriched
      .filter((c) => c.status === 'completed')
      .sort((a, b) => {
        const timeA = new Date(a.start_time).getTime();
        const timeB = new Date(b.start_time).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return a.title.localeCompare(b.title);
      });

    const sortedContests =
      status === 'completed'
        ? completed
        : status === 'upcoming' || status === 'live'
          ? upcomingAndLive
          : [...upcomingAndLive, ...completed];

    return NextResponse.json({ contests: sortedContests });
  } catch (err: any) {
    console.error('Error in /api/contests:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch contests' }, { status: 500 });
  }
}
