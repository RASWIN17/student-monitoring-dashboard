import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getContestAnalyticsForClassroom, getContestById } from '@/lib/db';
import { ContestService } from '@/lib/connectors/contests';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const classroomId = searchParams.get('classroomId');

  try {
    let contest = await getContestById(id);
    if (!contest) {
      // Try syncing once if this is a newly discovered contest slug
      await ContestService.syncContests();
      contest = await getContestById(id);
      if (!contest) {
        return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
      }
    }

    const analytics = await getContestAnalyticsForClassroom(id, classroomId || null);
    if (!analytics) {
      return NextResponse.json({ error: 'Contest analytics not found' }, { status: 404 });
    }

    return NextResponse.json(analytics);
  } catch (err: any) {
    console.error(`Error in /api/contests/${id}:`, err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch contest analytics' }, { status: 500 });
  }
}
