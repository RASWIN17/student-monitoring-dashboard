import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getContestAnalyticsForClassroom, getContestById, getClassroomById, isStudentInClassroom } from '@/lib/db';
import { ContestService } from '@/lib/connectors/contests';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const classroomId = searchParams.get('classroomId');

  // Enforce role-based access control and classroom scoping
  if (user.role === 'student') {
    if (!classroomId) {
      return NextResponse.json(
        { error: 'Forbidden: Students cannot access institution-wide contest analytics' },
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
    if (!classroomId) {
      return NextResponse.json(
        { error: 'Classroom ID is required for contest analytics' },
        { status: 400 }
      );
    }
    const classroom = await getClassroomById(classroomId);
    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }
    if (classroom.owner_teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view contest analytics for this classroom' },
        { status: 403 }
      );
    }
  }

  try {
    let contest = await getContestById(id);
    if (!contest) {
      // Try syncing once if this is a newly discovered contest slug
      await ContestService.syncContests();
      contest = await getContestById(id);
      if (!contest) {
        return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
      }
    }

    const analytics = await getContestAnalyticsForClassroom(id, classroomId || null);
    if (!analytics) {
      return NextResponse.json({ error: 'Contest analytics not found' }, { status: 404 });
    }

    return NextResponse.json(analytics);
  } catch (err: any) {
    console.error(`[Contest Analytics Error in /api/contests/${id}]:`, err);
    return NextResponse.json({ error: 'Failed to fetch contest analytics. Please try again later.' }, { status: 500 });
  }
}
