import { NextResponse } from 'next/server';
import { LeetCodeConnector } from '@/lib/connectors/leetcode';
import { CodeChefConnector } from '@/lib/connectors/codechef';

export async function POST(req: Request) {
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
    return NextResponse.json({ error: err?.message || 'Connector test failed' }, { status: 500 });
  }
}
