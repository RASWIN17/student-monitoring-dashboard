import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { LeetCodeConnector } from '@/lib/connectors/leetcode';
import { CodeChefConnector } from '@/lib/connectors/codechef';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Only teachers can access connector diagnostics' }, { status: 403 });
  }

  try {
    const { platform, username } = await req.json();
    if (!platform || !username) {
      return NextResponse.json({ error: 'Platform and username are required' }, { status: 400 });
    }

    if (platform === 'leetcode') {
      const validation = await LeetCodeConnector.validateProfile(username);
      if (!validation.exists) {
        return NextResponse.json({
          platform: 'leetcode',
          username,
          validation,
          extraction: null,
          error: validation.error || 'LeetCode profile not found',
        });
      }

      const extraction = await LeetCodeConnector.fetchProfileData(username);
      return NextResponse.json({
        platform: 'leetcode',
        username,
        validation,
        extraction,
      });
    } else if (platform === 'codechef') {
      const validation = await CodeChefConnector.validateProfile(username);
      if (!validation.exists) {
        return NextResponse.json({
          platform: 'codechef',
          username,
          validation,
          extraction: null,
          error: validation.error || 'CodeChef profile not found',
        });
      }

      const extraction = await CodeChefConnector.fetchProfileData(username);
      return NextResponse.json({
        platform: 'codechef',
        username,
        validation,
        extraction,
      });
    } else {
      return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[Admin Test-Connectors Error]:', err);
    return NextResponse.json({ error: 'Connector test failed. Please verify the platform username.' }, { status: 500 });
  }
}
