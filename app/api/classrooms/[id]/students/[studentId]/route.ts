import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getClassroomById, removeStudentFromClassroom, logAuditAction } from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  const { id, studentId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Only teachers can remove students' }, { status: 403 });
  }

  const classroom = await getClassroomById(id);
  if (!classroom || classroom.owner_teacher_id !== user.id) {
    return NextResponse.json({ error: 'Classroom not found or unauthorized' }, { status: 404 });
  }

  const removed = await removeStudentFromClassroom(id, studentId);
  if (removed) {
    await logAuditAction({
      user_id: user.id,
      action: 'STUDENT_REMOVED_FROM_CLASSROOM',
      resource_type: 'classroom_memberships',
      resource_id: `${id}_${studentId}`,
      details: { classroomId: id, studentId },
    });
  }

  return NextResponse.json({ success: removed });
}
