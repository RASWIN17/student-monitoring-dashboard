import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { pathname } = request.nextUrl;

  // Static files and internal Next.js requests are skipped
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return supabaseResponse;
  }

  // Refresh and verify authentication session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    // 1. Try to obtain role from metadata or cached cookie
    role =
      (user.user_metadata?.role as string) ||
      (user.app_metadata?.role as string) ||
      request.cookies.get('codetrack_user_role')?.value ||
      null;

    // 2. Fall back to user_profiles table query if not cached
    if (!role) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (profile && profile.role) {
        const userRole: string = String(profile.role);
        role = userRole;
        supabaseResponse.cookies.set('codetrack_user_role', userRole, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
        });
      }
    }
  }

  const isTeacherOnlyRoute =
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/students') ||
    pathname.startsWith('/scans') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/admin');

  const isSharedAuthRoute =
    pathname.startsWith('/classrooms') ||
    pathname.startsWith('/leetcode') ||
    pathname.startsWith('/codechef') ||
    pathname.startsWith('/settings');

  const isStudentRoute = pathname === '/student' || pathname.startsWith('/student/');

  // 1. Unauthenticated users: default entry page is /login; protect all internal/dashboard routes
  if (!user) {
    if (pathname === '/login' || pathname === '/register') {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/') {
      url.searchParams.set('returnTo', pathname);
    }
    return NextResponse.redirect(url);
  }

  // 2. Authenticated user authorization & role-based routing
  if (user) {
    const userRole = role || 'student';
    const isTeacher = userRole === 'teacher' || userRole === 'admin';

    // Prevent student from accessing teacher-only features
    if (!isTeacher && isTeacherOnlyRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/classrooms';
      url.searchParams.set('error', 'Access restricted to teachers only');
      return NextResponse.redirect(url);
    }

    // Redirect legacy student dashboard route to classrooms
    if (pathname.startsWith('/student/dashboard')) {
      const url = request.nextUrl.clone();
      url.pathname = isTeacher ? '/students' : '/classrooms';
      return NextResponse.redirect(url);
    }

    // Direct teachers trying to access student routes to students section
    if (isTeacher && isStudentRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/students';
      return NextResponse.redirect(url);
    }

    // Direct teachers trying to access teacher dashboard to students section
    if (isTeacher && pathname.startsWith('/teacher/dashboard')) {
      const url = request.nextUrl.clone();
      url.pathname = '/students';
      return NextResponse.redirect(url);
    }

    // Root page redirection: already authenticated users go directly to their section
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = isTeacher ? '/students' : '/classrooms';
      return NextResponse.redirect(url);
    }

    // Prevent authenticated users from getting stuck on login/register
    if (pathname === '/login' || pathname === '/register') {
      const url = request.nextUrl.clone();
      url.pathname = isTeacher ? '/students' : '/classrooms';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
