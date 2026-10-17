import { NextResponse } from 'next/server';
import { getCurrentUser, signOut } from '@/lib/auth';
import { deleteUserAccount } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  // 1. Verify authenticated user identity via secure server session (never trust browser-supplied user ID)
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: You must be logged in to delete your account.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { confirmation } = body;

    // 2. Strict confirmation check: Require typing DELETE
    if (confirmation !== 'DELETE') {
      return NextResponse.json(
        { error: 'Explicit confirmation required. Please type DELETE to confirm account deletion.' },
        { status: 400 }
      );
    }

    // 3. Perform complete server-side database cleanup with teacher and student safeguards
    const result = await deleteUserAccount(user.id);

    // 4. Delete authentication identity through privileged admin API
    if (result.authUserId) {
      try {
        const admin = createAdminClient();
        await admin.auth.admin.deleteUser(result.authUserId);
      } catch (authErr: any) {
        console.warn('Note: Could not delete auth.users record via Admin API:', authErr?.message);
      }
    }

    // 5. Terminate current user session and revoke cookies
    await signOut();

    const response = NextResponse.json({
      success: true,
      message: 'Your account and all associated personal records have been permanently deleted.',
    });

    response.cookies.delete('codetrack_user_role');
    response.cookies.delete('codetrack_intended_role');

    return response;
  } catch (err: any) {
    const status = err?.message?.includes('Cannot delete account') ? 409 : 500;
    return NextResponse.json(
      { error: err?.message || 'Failed to complete account deletion' },
      { status }
    );
  }
}
