import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserByAuthId, getUserByEmail, createUser, updateUserAuthId } from '@/lib/db';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error) {
    console.error('Google OAuth error:', error, errorDescription);
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error exchanging OAuth code:', exchangeError);
      return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(exchangeError.message)}`);
    }

    const authUser = data.user;
    if (authUser && authUser.email) {
      // Ensure user profile exists and is properly linked
      let profile = await getUserByAuthId(authUser.id);

      if (!profile) {
        // Check if there is an existing profile migrated with this email
        const existingByEmail = await getUserByEmail(authUser.email);
        if (existingByEmail) {
          // Link the Supabase Auth ID to the existing profile
          profile = await updateUserAuthId(existingByEmail.id, authUser.id);
        } else {
          // New user signing in: create profile with 'student' default role (secure: public cannot self-assign teacher)
          const metaName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email.split('@')[0];
          profile = await createUser({
            auth_user_id: authUser.id,
            email: authUser.email.toLowerCase(),
            display_name: metaName,
            role: 'student',
            avatar_url: authUser.user_metadata?.avatar_url || null,
          });
        }
      }
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/`);
}
