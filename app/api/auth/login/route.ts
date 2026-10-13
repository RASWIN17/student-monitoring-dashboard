import { NextResponse } from 'next/server';
import { getUserByEmail, logAuditAction } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await getUserByEmail(email.trim());
    if (!user) {
      return NextResponse.json({ error: 'No account found with this email. Please sign in with Google.' }, { status: 404 });
    }

    await logAuditAction({
      user_id: user.id,
      action: 'USER_LOGIN_ATTEMPT',
      resource_type: 'user_profiles',
      resource_id: user.id,
      details: { email: user.email },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Login failed' }, { status: 500 });
  }
}
