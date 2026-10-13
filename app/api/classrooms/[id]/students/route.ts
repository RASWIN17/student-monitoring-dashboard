import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getClassroomById,
  getClassroomOverview,
  getUserByEmail,
  joinClassroom,
  logAuditAction,
} from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'student') {
    return NextResponse.json({ error: 'Only teachers can access the classroom student roster' }, { status: 403 });
  }

  const classroom = await getClassroomById(id);
  if (!classroom) {
    return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
  }

  const overview = await getClassroomOverview(id);
  return NextResponse.json({ students: overview });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Only teachers can manually enroll students' }, { status: 403 });
  }

  const classroom = await getClassroomById(id);
  if (!classroom || classroom.owner_teacher_id !== user.id) {
    return NextResponse.json({ error: 'Classroom not found or unauthorized' }, { status: 404 });
  }

  try {
    const { studentEmail } = await req.json();
    if (!studentEmail) {
      return NextResponse.json({ error: 'Student email is required' }, { status: 400 });
    }

    const student = await getUserByEmail(studentEmail.trim());
    if (!student) {
      return NextResponse.json({ error: 'No student found with this email' }, { status: 404 });
    }

    if (student.role !== 'student') {
      return NextResponse.json({ error: 'User is not a student' }, { status: 400 });
    }

    const membership = await joinClassroom(id, student.id);
    await logAuditAction({
      user_id: user.id,
      action: 'STUDENT_ENROLLED_BY_TEACHER',
      resource_type: 'classroom_memberships',
      resource_id: membership.id,
      details: { classroomId: id, studentEmail: student.email },
    });

    return NextResponse.json({ membership, student });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to enroll student' }, { status: 500 });
  }
}
