import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getClassroomById, updateClassroom, archiveClassroom, logAuditAction, isStudentInClassroom } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const classroom = await getClassroomById(id);
  if (!classroom) {
    return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
  }

  // If user is a student, verify they are enrolled in this classroom
  if (user.role === 'student') {
    const isEnrolled = await isStudentInClassroom(id, user.id);
    if (!isEnrolled) {
      return NextResponse.json(
        { error: 'Access denied: You are not enrolled in this classroom' },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({ classroom });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden: Only teachers can modify classrooms' }, { status: 403 });
  }

  const classroom = await getClassroomById(id);
  if (!classroom || (classroom.owner_teacher_id !== user.id && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Classroom not found or unauthorized' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const updated = await updateClassroom(id, body);
    await logAuditAction({
      user_id: user.id,
      action: 'CLASSROOM_UPDATED',
      resource_type: 'classrooms',
      resource_id: id,
      details: body,
    });
    return NextResponse.json({ classroom: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden: Only teachers can delete classrooms' }, { status: 403 });
  }

  const classroom = await getClassroomById(id);
  if (!classroom || (classroom.owner_teacher_id !== user.id && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Classroom not found or unauthorized' }, { status: 404 });
  }

  await archiveClassroom(id);
  await logAuditAction({
    user_id: user.id,
    action: 'CLASSROOM_ARCHIVED',
    resource_type: 'classrooms',
    resource_id: id,
    details: { name: classroom.name },
  });
  return NextResponse.json({ success: true });
}
