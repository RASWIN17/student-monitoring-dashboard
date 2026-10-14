import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email') || 'raswinmoto@gmail.com';
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/students';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  try {
    const admin = createAdminClient(supabaseUrl, serviceKey);
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      return NextResponse.json({ error: linkError?.message || 'Failed to generate token' }, { status: 500 });
    }

    const supabase = await createServerClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });

    if (verifyError) {
      return NextResponse.json({ error: verifyError.message }, { status: 500 });
    }

    const redirectUrl = new URL(returnTo, request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Authentication failed' }, { status: 500 });
  }
}
