import { NextResponse } from 'next/server';
import { getCurrentUser, signOut } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user });
}

export async function DELETE() {
  await signOut();
  const response = NextResponse.json({ success: true });
  response.cookies.delete('codetrack_user_role');
  response.cookies.delete('codetrack_intended_role');
  return response;
}
