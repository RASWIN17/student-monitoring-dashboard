import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getUserById,
  checkDuplicateRegisterNumber,
  updateStudentProfile,
  logAuditAction,
} from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await getUserById(user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'student') {
    return NextResponse.json({ error: 'Only students can create a student profile' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = (body.name || body.display_name || '').trim();
    const registerNumber = (body.register_number || body.registerNumber || '').trim();
    const className = (body.class_name || body.class || '').trim();
    const section = (body.section || '').trim();

    // 1. Mandatory field validation
    if (!name) {
      return NextResponse.json({ error: 'Student Name is required' }, { status: 400 });
    }
    if (!registerNumber) {
      return NextResponse.json({ error: 'Register Number is required' }, { status: 400 });
    }
    if (!className) {
      return NextResponse.json({ error: 'Class is required' }, { status: 400 });
    }

    // 2. Prevent duplicate profile creation for the same account if already completed
    const currentProfile = await getUserById(user.id);
    if (currentProfile?.profile_completed) {
      return NextResponse.json(
        { error: 'Profile already created. You can update your details in Settings.' },
        { status: 400 }
      );
    }

    // 3. Duplicate register number check across students
    const isDuplicate = await checkDuplicateRegisterNumber(registerNumber, user.id);
    if (isDuplicate) {
      return NextResponse.json(
        { error: `Register Number "${registerNumber}" is already in use by another student.` },
        { status: 400 }
      );
    }

    // 4. Update the student profile and set profile_completed to true
    // Authenticated email is strictly preserved from the Google auth account
    const updated = await updateStudentProfile(user.id, {
      display_name: name,
      register_number: registerNumber,
      class_name: className,
      section: section || null,
      profile_completed: true,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Failed to save student profile' }, { status: 500 });
    }

    await logAuditAction({
      user_id: user.id,
      action: 'STUDENT_PROFILE_CREATED',
      resource_type: 'user_profiles',
      resource_id: user.id,
      details: {
        register_number: registerNumber,
        class_name: className,
        section,
        email: user.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Student profile created successfully',
      profile: updated,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error saving profile' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = (body.name || body.display_name || '').trim();
    const registerNumber = (body.register_number || body.registerNumber || '').trim();
    const className = (body.class_name || body.class || '').trim();
    const section = (body.section || '').trim();

    // Field validation
    if (!name) {
      return NextResponse.json({ error: 'Student Name is required' }, { status: 400 });
    }
    if (!registerNumber) {
      return NextResponse.json({ error: 'Register Number is required' }, { status: 400 });
    }
    if (!className) {
      return NextResponse.json({ error: 'Class is required' }, { status: 400 });
    }

    // Check duplicate register number excluding this user
    const isDuplicate = await checkDuplicateRegisterNumber(registerNumber, user.id);
    if (isDuplicate) {
      return NextResponse.json(
        { error: `Register Number "${registerNumber}" is already in use by another student.` },
        { status: 400 }
      );
    }

    // Save updates to existing profile record (no new duplicate profile)
    const updated = await updateStudentProfile(user.id, {
      display_name: name,
      register_number: registerNumber,
      class_name: className,
      section: section || null,
      profile_completed: true,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update student profile' }, { status: 500 });
    }

    await logAuditAction({
      user_id: user.id,
      action: 'STUDENT_PROFILE_UPDATED',
      resource_type: 'user_profiles',
      resource_id: user.id,
      details: {
        register_number: registerNumber,
        class_name: className,
        section,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error updating profile' }, { status: 500 });
  }
}
