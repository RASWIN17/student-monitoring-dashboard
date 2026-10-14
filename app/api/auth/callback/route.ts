import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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
      // 1. Retrieve the user's selected role preference from query param or secure cookie
      const cookieStore = await cookies();
      const cookieRole = cookieStore.get('codetrack_intended_role')?.value;
      const queryRole = requestUrl.searchParams.get('intended_role') || requestUrl.searchParams.get('role');
      
      const rawRole = (queryRole || cookieRole || '').toLowerCase();
      const selectedRole: 'teacher' | 'student' | null =
        rawRole === 'teacher' || rawRole === 'student' ? rawRole : null;

      // 2. Check if user profile already exists
      let profile = await getUserByAuthId(authUser.id);

      if (!profile) {
        // Check if there is an existing profile migrated with this email
        const existingByEmail = await getUserByEmail(authUser.email);
        if (existingByEmail) {
          // Link the Supabase Auth ID to the existing profile without overwriting their assigned role
          profile = await updateUserAuthId(existingByEmail.id, authUser.id);
        } else {
          // New user signing in: create profile with the explicitly selected role (or default to 'student')
          const assignedRole = selectedRole || 'student';
          const metaName =
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            authUser.email.split('@')[0];

          profile = await createUser({
            auth_user_id: authUser.id,
            email: authUser.email.toLowerCase(),
            display_name: metaName,
            role: assignedRole,
            avatar_url: authUser.user_metadata?.avatar_url || null,
          });
        }
      }

      if (!profile) {
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=${encodeURIComponent('Failed to retrieve user profile')}`
        );
      }

      // 3. Ensure Supabase Auth user metadata is synchronized with verified database role
      try {
        await supabase.auth.updateUser({
          data: { role: profile.role },
        });
      } catch (metaErr) {
        console.warn('Could not update auth metadata with role:', metaErr);
      }

      // 4. Role-Based Dashboard Redirection
      const isTeacher = profile.role === 'teacher' || profile.role === 'admin';
      const redirectPath = isTeacher ? '/students' : '/student/dashboard';
      const response = NextResponse.redirect(`${requestUrl.origin}${redirectPath}`);

      // Set verified role cookie for fast, low-overhead server middleware authorization
      response.cookies.set('codetrack_user_role', profile.role, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });

      // Clear the temporary intended role cookie
      response.cookies.delete('codetrack_intended_role');

      return response;
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent('Authentication code missing')}`);
}
