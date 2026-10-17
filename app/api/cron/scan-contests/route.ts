import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { ContestService } from '@/lib/connectors/contests';

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

async function handleCron(req: Request) {
  const workerSecret = process.env.SCRAPER_WORKER_SECRET?.trim();

  // Fail closed: If SCRAPER_WORKER_SECRET is not configured or left as default placeholder, reject execution
  if (!workerSecret || workerSecret === 'your-random-long-secret-key') {
    return NextResponse.json(
      { error: 'Service Unavailable: Cron secret is unconfigured or disabled' },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get('authorization') || '';
  const url = new URL(req.url);
  const secretParam = url.searchParams.get('secret') || '';

  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const isSecretValid = safeCompare(bearerToken, workerSecret) || safeCompare(secretParam, workerSecret);

  if (!isSecretValid) {
    return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
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
    console.error('[CRON_ERROR] Contest scan cron failed:', err?.message || err);
    return NextResponse.json({ error: 'Cron task execution failed' }, { status: 500 });
  }
}

