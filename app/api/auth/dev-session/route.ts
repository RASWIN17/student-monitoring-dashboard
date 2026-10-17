import { NextResponse, type NextRequest } from 'next/server';

/**
 * Dev Session Route
 * Strictly disabled in production. Returns 404 Not Found to prevent any unauthorized authentication.
 */
export async function GET(request: NextRequest) {
  // Unconditionally return 404 in production or when dev auth is not explicitly configured
  if (process.env.NODE_ENV === 'production' || process.env.DEV_AUTH_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Development guard: require configured local dev secret
  const devSecret = process.env.DEV_SESSION_SECRET;
  const providedSecret = request.nextUrl.searchParams.get('dev_secret');
  if (!devSecret || !providedSecret || devSecret !== providedSecret) {
    return NextResponse.json({ error: 'Unauthorized development access' }, { status: 403 });
  }

  return NextResponse.json({ error: 'Development session generator is disabled' }, { status: 403 });
}

