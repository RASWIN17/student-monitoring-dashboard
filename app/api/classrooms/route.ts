import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { getClassroomsForTeacher, getClassroomsForStudent, createClassroom, logAuditAction } from '@/lib/db';

const ClassroomCreateSchema = z.object({
  name: z.string().trim().min(1, 'Classroom name is required').max(100),
  course: z.string().trim().min(1, 'Course is required').max(100),
  batch: z.string().trim().min(1, 'Batch is required').max(50),
  department: z.string().trim().min(1, 'Department is required').max(100),
  academic_year: z.string().trim().min(1, 'Academic year is required').max(50).optional(),
  academicYear: z.string().trim().min(1, 'Academic year is required').max(50).optional(),
  section: z.string().trim().min(1, 'Section is required').max(50),
}).strict();

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let classrooms = [];
  if (user.role === 'teacher' || user.role === 'admin') {
    classrooms = await getClassroomsForTeacher(user.id);
  } else {
    classrooms = await getClassroomsForStudent(user.id);
  }

  return NextResponse.json({ classrooms });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Only teachers can create classrooms' }, { status: 403 });
  }

  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parseResult = ClassroomCreateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid classroom data' },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const academicYear = data.academic_year || data.academicYear;
    if (!academicYear) {
      return NextResponse.json({ error: 'Academic year is required' }, { status: 400 });
    }

    const classroom = await createClassroom({
      owner_teacher_id: user.id,
      name: data.name,
      course: data.course,
      batch: data.batch,
      department: data.department,
      academic_year: academicYear,
      section: data.section,
    });

    await logAuditAction({
      user_id: user.id,
      action: 'CLASSROOM_CREATED',
      resource_type: 'classrooms',
      resource_id: classroom.id,
      details: { name: classroom.name, course: classroom.course, joinCode: classroom.join_code },
    });

    return NextResponse.json({ classroom }, { status: 201 });
  } catch (error: any) {
    console.error('[CLASSROOM_POST_ERROR]:', error?.message || error);
    return NextResponse.json({ error: 'Failed to create classroom' }, { status: 500 });
  }
}
