import { NextResponse } from 'next/server';
import { ContestService } from '@/lib/connectors/contests';

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  const authHeader = req.headers.get('authorization');
  const workerSecret = process.env.SCRAPER_WORKER_SECRET;

  const url = new URL(req.url);
  const secretParam = url.searchParams.get('secret');

  // Verify secret if SCRAPER_WORKER_SECRET is configured
  if (workerSecret && workerSecret !== 'your-random-long-secret-key') {
    const isSecretValid =
      authHeader === `Bearer ${workerSecret}` ||
      secretParam === workerSecret;

    if (!isSecretValid) {
      return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
    }
  }

  try {
    // 1. Sync upcoming & completed contest schedules
    const syncRes = await ContestService.syncContests();

    // 2. Check and run scans for contests that ended >= 1 minute ago
    const scanRes = await ContestService.checkAndRunScheduledScans();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      synced: {
        leetcode: syncRes.leetcode.length,
        codechef: syncRes.codechef.length,
      },
      triggeredContestScans: scanRes.triggeredContests,
    });
  } catch (err: any) {
    console.error('Cron job error:', err);
    return NextResponse.json({ error: err?.message || 'Cron job failed' }, { status: 500 });
  }
}
