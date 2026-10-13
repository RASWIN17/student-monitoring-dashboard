import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getClassroomsForTeacher, getClassroomsForStudent, createClassroom, logAuditAction } from '@/lib/db';

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
    const body = await req.json();
    const name = body.name;
    const course = body.course;
    const batch = body.batch;
    const department = body.department;
    const academic_year = body.academic_year || body.academicYear;
    const section = body.section;

    if (!name || !course || !batch || !department || !academic_year || !section) {
      return NextResponse.json({ error: 'All classroom fields are required' }, { status: 400 });
    }

    const classroom = await createClassroom({
      owner_teacher_id: user.id,
      name: name.trim(),
      course: course.trim(),
      batch: batch.trim(),
      department: department.trim(),
      academic_year: academic_year.trim(),
      section: section.trim(),
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
    return NextResponse.json({ error: error?.message || 'Failed to create classroom' }, { status: 500 });
  }
}
