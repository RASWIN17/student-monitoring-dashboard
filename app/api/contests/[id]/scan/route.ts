import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ContestService } from '@/lib/connectors/contests';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Only teachers can initiate contest scans' }, { status: 403 });
  }

  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const classroomId = body.classroomId || body.classroom_id;

  try {
    const result = await ContestService.scanContest(id, classroomId || null);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error(`Error in /api/contests/${id}/scan:`, err);
    return NextResponse.json({ error: err?.message || 'Failed to scan contest' }, { status: 500 });
  }
}
