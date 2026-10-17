import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getClassroomById } from '@/lib/db';
import { ContestService } from '@/lib/connectors/contests';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Only teachers can initiate contest scans' }, { status: 403 });
  }

  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const classroomId = body.classroomId || body.classroom_id;

  if (user.role === 'teacher') {
    if (!classroomId) {
      return NextResponse.json(
        { error: 'Classroom ID is required to initiate a contest scan' },
        { status: 400 }
      );
    }
    const classroom = await getClassroomById(classroomId);
    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }
    if (classroom.owner_teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to scan this classroom' },
        { status: 403 }
      );
    }
  }

  try {
    const result = await ContestService.scanContest(id, classroomId || null);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error(`[Contest Scan Error in /api/contests/${id}/scan]:`, err);
    return NextResponse.json({ error: 'Failed to scan contest. Please try again later.' }, { status: 500 });
  }
}
