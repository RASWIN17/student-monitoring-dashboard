import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getClassroomById, getClassroomOverview, getClassroomsForTeacher } from '@/lib/db';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'student') {
    return NextResponse.json({ error: 'Only teachers can access student rosters' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const classroomId = searchParams.get('classroomId');

  try {
    if (classroomId) {
      const classroom = await getClassroomById(classroomId);
      if (!classroom) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
      }
      const students = await getClassroomOverview(classroomId);
      return NextResponse.json({ students, classroom });
    }

    // If no classroomId, get all classrooms for teacher
    const classrooms = await getClassroomsForTeacher(user.id);
    if (classrooms.length === 0) {
      return NextResponse.json({ students: [], classrooms: [] });
    }

    // Default to the first classroom or combine
    const firstClassroomId = classrooms[0].id;
    const students = await getClassroomOverview(firstClassroomId);
    return NextResponse.json({ students, classroom: classrooms[0], classrooms });
  } catch (err: any) {
    console.error('Error fetching students:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch students' }, { status: 500 });
  }
}
