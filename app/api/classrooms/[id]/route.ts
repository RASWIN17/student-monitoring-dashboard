import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { getClassroomById, updateClassroom, archiveClassroom, logAuditAction, isStudentInClassroom } from '@/lib/db';

const ClassroomPatchSchema = z.object({
  name: z.string().trim().min(1, 'Classroom name cannot be empty').max(100).optional(),
  course: z.string().trim().min(1, 'Course cannot be empty').max(100).optional(),
  batch: z.string().trim().min(1, 'Batch cannot be empty').max(50).optional(),
  department: z.string().trim().min(1, 'Department cannot be empty').max(100).optional(),
  academic_year: z.string().trim().min(1, 'Academic year cannot be empty').max(50).optional(),
  academicYear: z.string().trim().min(1, 'Academic year cannot be empty').max(50).optional(),
  section: z.string().trim().min(1, 'Section cannot be empty').max(50).optional(),
}).strict();

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
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const parseResult = ClassroomPatchSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid classroom update fields' },
        { status: 400 }
      );
    }

    const validatedData = parseResult.data;
    if (validatedData.academicYear && !validatedData.academic_year) {
      validatedData.academic_year = validatedData.academicYear;
      delete validatedData.academicYear;
    }

    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
    }

    const updated = await updateClassroom(id, validatedData);
    await logAuditAction({
      user_id: user.id,
      action: 'CLASSROOM_UPDATED',
      resource_type: 'classrooms',
      resource_id: id,
      details: validatedData,
    });
    return NextResponse.json({ classroom: updated });
  } catch (err: any) {
    console.error('[CLASSROOM_PATCH_ERROR]:', err?.message || err);
    return NextResponse.json({ error: 'Failed to update classroom' }, { status: 500 });
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
