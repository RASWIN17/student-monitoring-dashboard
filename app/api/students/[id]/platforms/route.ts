import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getPlatformAccountsForStudent,
  linkPlatformAccount,
  unlinkPlatformAccount,
  getClassroomsForStudent,
  logAuditAction,
} from '@/lib/db';
import { LeetCodeConnector } from '@/lib/connectors/leetcode';
import { CodeChefConnector } from '@/lib/connectors/codechef';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // If user is a student, ensure they can only view their own accounts
  if (user.role === 'student' && user.id !== id) {
    return NextResponse.json({ error: 'Access forbidden' }, { status: 403 });
  }

  // If user is a teacher, verify they teach this student (unless admin)
  if (user.role === 'teacher') {
    const classrooms = await getClassroomsForStudent(id);
    const teachesStudent = classrooms.some((c) => c.owner_teacher_id === user.id);
    if (!teachesStudent) {
      return NextResponse.json(
        { error: 'Access forbidden: You do not teach this student' },
        { status: 403 }
      );
    }
  }

  const accounts = await getPlatformAccountsForStudent(id);
  return NextResponse.json({ accounts });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorization check: students can only link their own account, teachers can assist if they teach the student
  if (user.role === 'student' && user.id !== id) {
    return NextResponse.json({ error: 'Cannot modify another student\'s accounts' }, { status: 403 });
  }

  if (user.role === 'teacher') {
    const classrooms = await getClassroomsForStudent(id);
    const teachesStudent = classrooms.some((c) => c.owner_teacher_id === user.id);
    if (!teachesStudent) {
      return NextResponse.json(
        { error: 'Access forbidden: You do not teach this student' },
        { status: 403 }
      );
    }
  }

  try {
    const { platform, username } = await req.json();
    if (!platform || !username) {
      return NextResponse.json({ error: 'Platform and username are required' }, { status: 400 });
    }

    if (!['leetcode', 'codechef'].includes(platform)) {
      return NextResponse.json({ error: 'Platform must be leetcode or codechef' }, { status: 400 });
    }

    const cleanUsername = username.trim();
    let publicProfileUrl = '';
    let validatedUsername = cleanUsername;

    // Validate that profile genuinely exists on the platform
    if (platform === 'leetcode') {
      const validation = await LeetCodeConnector.validateProfile(cleanUsername);
      if (!validation.exists) {
        return NextResponse.json(
          { error: `Validation failed: ${validation.error || 'LeetCode profile does not exist'}` },
          { status: 400 }
        );
      }
      validatedUsername = validation.normalizedUsername || cleanUsername;
      publicProfileUrl = `https://leetcode.com/${encodeURIComponent(validatedUsername)}/`;
    } else if (platform === 'codechef') {
      const validation = await CodeChefConnector.validateProfile(cleanUsername);
      if (!validation.exists) {
        return NextResponse.json(
          { error: `Validation failed: ${validation.error || 'CodeChef profile does not exist'}` },
          { status: 400 }
        );
      }
      validatedUsername = validation.normalizedUsername || cleanUsername;
      publicProfileUrl = `https://www.codechef.com/users/${encodeURIComponent(validatedUsername)}`;
    }

    const linked = await linkPlatformAccount({
      student_id: id,
      platform,
      username: validatedUsername,
      public_profile_url: publicProfileUrl,
    });

    await logAuditAction({
      user_id: user.id,
      action: 'PLATFORM_ACCOUNT_LINKED',
      resource_type: 'platform_accounts',
      resource_id: linked.id,
      details: { platform, username: validatedUsername, studentId: id },
    });

    return NextResponse.json({ account: linked }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to link platform handle' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'student' && user.id !== id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (user.role === 'teacher') {
    const classrooms = await getClassroomsForStudent(id);
    const teachesStudent = classrooms.some((c) => c.owner_teacher_id === user.id);
    if (!teachesStudent) {
      return NextResponse.json(
        { error: 'Access forbidden: You do not teach this student' },
        { status: 403 }
      );
    }
  }

  try {
    const { platform } = await req.json();
    if (!platform || !['leetcode', 'codechef'].includes(platform)) {
      return NextResponse.json({ error: 'Valid platform is required' }, { status: 400 });
    }

    const unlinked = await unlinkPlatformAccount(id, platform);
    await logAuditAction({
      user_id: user.id,
      action: 'PLATFORM_ACCOUNT_UNLINKED',
      resource_type: 'platform_accounts',
      resource_id: `${id}_${platform}`,
      details: { studentId: id, platform },
    });

    return NextResponse.json({ success: unlinked });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to unlink handle' }, { status: 500 });
  }
}
