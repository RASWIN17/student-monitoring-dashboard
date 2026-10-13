import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ContestService } from '@/lib/connectors/contests';
import { getContests, getContestAnalyticsForClassroom } from '@/lib/db';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const platform = (searchParams.get('platform') as 'leetcode' | 'codechef' | 'all') || 'all';
  const status = searchParams.get('status') || 'all';
  const classroomId = searchParams.get('classroomId');
  const sync = searchParams.get('sync') === 'true';

  try {
    // 1. Sync live contest schedule from platforms dynamically
    // If sync requested or we have fewer than 2 contests in db
    const existing = await getContests({ platform, status, limit: 100 });
    if (sync || existing.length === 0) {
      await ContestService.syncContests();
    } else {
      // Trigger background sync without awaiting to keep page load fast
      ContestService.syncContests().catch((err) => console.warn('Background sync error:', err));
    }

    // Also check for any scheduled auto-scans for ended contests
    ContestService.checkAndRunScheduledScans().catch((err) => console.warn('Scheduled scan error:', err));

    // 2. Fetch up-to-date contests
    const contests = await getContests({ platform, status, limit: 100 });

    // 3. If classroomId is provided, enrich with attendance summary
    const enriched = await Promise.all(
      contests.map(async (c) => {
        try {
          const analytics = await getContestAnalyticsForClassroom(c.id, classroomId || null);
          return {
            ...c,
            linked_accounts_count: analytics?.summary.totalLinked ?? 0,
            attended_count: analytics?.summary.attendedCount ?? 0,
            not_attended_count: analytics?.summary.notAttendedCount ?? 0,
            pending_verification_count: analytics?.summary.pendingCount ?? 0,
          };
        } catch {
          return c;
        }
      })
    );

    return NextResponse.json({ contests: enriched });
  } catch (err: any) {
    console.error('Error in /api/contests:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch contests' }, { status: 500 });
  }
}
