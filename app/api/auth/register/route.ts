import { NextResponse } from 'next/server';
import { getUserByEmail, createUser, logAuditAction } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email;
    const displayName = body.displayName || body.display_name;
    const role = body.role;

    if (!email || !displayName || !role) {
      return NextResponse.json({ error: 'Email, display name, and role are required' }, { status: 400 });
    }

    if (!['teacher', 'student'].includes(role)) {
      return NextResponse.json({ error: 'Role must be teacher or student' }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const newUser = await createUser({
      email: email.trim().toLowerCase(),
      display_name: displayName.trim(),
      role: role as 'teacher' | 'student',
    });

    await logAuditAction({
      user_id: newUser.id,
      action: 'USER_REGISTERED',
      resource_type: 'user_profiles',
      resource_id: newUser.id,
      details: { email: newUser.email, role: newUser.role },
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Registration failed' }, { status: 500 });
  }
}
