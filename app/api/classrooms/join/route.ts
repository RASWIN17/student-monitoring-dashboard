import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getClassroomByJoinCode, joinClassroom, logAuditAction } from '@/lib/db';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const joinCode = body.joinCode || body.join_code;
    if (!joinCode) {
      return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
    }

    const classroom = await getClassroomByJoinCode(joinCode.trim());
    if (!classroom) {
      return NextResponse.json({ error: 'Invalid or expired classroom join code' }, { status: 404 });
    }

    const membership = await joinClassroom(classroom.id, user.id);
    await logAuditAction({
      user_id: user.id,
      action: 'STUDENT_JOINED_CLASSROOM',
      resource_type: 'classroom_memberships',
      resource_id: membership.id,
      details: { classroomId: classroom.id, joinCode: joinCode.trim() },
    });

    return NextResponse.json({ success: true, classroom });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to join classroom' }, { status: 500 });
  }
}
