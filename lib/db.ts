import { createAdminClient } from './supabase/admin';
import {
  UserProfile,
  Classroom,
  ClassroomMembership,
  PlatformAccount,
  PlatformProfileSnapshot,
  DailyActivitySnapshot,
  ContestRecord,
  Contest,
  ContestStatus,
  StudentContestAttendanceRow,
  ScanJob,
  ScanJobItem,
  StudentPerformanceOverview,
} from './types';

function getSupabase() {
  return createAdminClient();
}

// ----------------------------------------------------
// USER PROFILES
// ----------------------------------------------------

export async function getUserById(id: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .ilike('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function getUserByAuthId(authUserId: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function updateUserAuthId(id: string, authUserId: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ auth_user_id: authUserId, updated_at: now })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function updateUserRole(id: string, role: 'teacher' | 'student' | 'admin'): Promise<UserProfile | null> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ role, updated_at: now })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function createUser(profile: {
  id?: string;
  auth_user_id?: string | null;
  email: string;
  display_name: string;
  role: 'teacher' | 'student' | 'admin';
  avatar_url?: string | null;
  register_number?: string | null;
  class_name?: string | null;
  section?: string | null;
  profile_completed?: boolean;
}): Promise<UserProfile> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const payload: any = {
    id: profile.id || crypto.randomUUID(),
    auth_user_id: profile.auth_user_id || null,
    email: profile.email.trim().toLowerCase(),
    display_name: profile.display_name.trim(),
    role: profile.role,
    avatar_url: profile.avatar_url || null,
    created_at: now,
    updated_at: now,
  };
  if (profile.register_number !== undefined) payload.register_number = profile.register_number ? profile.register_number.trim() : null;
  if (profile.class_name !== undefined) payload.class_name = profile.class_name ? profile.class_name.trim() : null;
  if (profile.section !== undefined) payload.section = profile.section ? profile.section.trim() : null;
  if (profile.profile_completed !== undefined) payload.profile_completed = profile.profile_completed;

  const { data, error } = await supabase
    .from('user_profiles')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create user profile: ${error?.message || 'Unknown error'}`);
  }

  return data as UserProfile;
}

export async function checkDuplicateRegisterNumber(registerNumber: string, excludeUserId?: string): Promise<boolean> {
  if (!registerNumber || !registerNumber.trim()) return false;
  const supabase = getSupabase();
  let query = supabase
    .from('user_profiles')
    .select('id')
    .ilike('register_number', registerNumber.trim());

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query.limit(1);
  if (error || !data) return false;
  return data.length > 0;
}

export async function updateStudentProfile(
  id: string,
  updates: {
    display_name?: string;
    register_number?: string | null;
    class_name?: string | null;
    section?: string | null;
    profile_completed?: boolean;
  }
): Promise<UserProfile | null> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const payload: any = { updated_at: now };

  if (updates.display_name !== undefined) payload.display_name = updates.display_name.trim();
  if (updates.register_number !== undefined) payload.register_number = updates.register_number ? updates.register_number.trim() : null;
  if (updates.class_name !== undefined) payload.class_name = updates.class_name ? updates.class_name.trim() : null;
  if (updates.section !== undefined) payload.section = updates.section ? updates.section.trim() : null;
  if (updates.profile_completed !== undefined) payload.profile_completed = updates.profile_completed;

  const { data, error } = await supabase
    .from('user_profiles')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return null;

  return data as UserProfile;
}

// ----------------------------------------------------
// CLASSROOMS
// ----------------------------------------------------

export async function createClassroom(data: {
  owner_teacher_id: string;
  name: string;
  course: string;
  batch: string;
  department: string;
  academic_year: string;
  section: string;
}): Promise<Classroom> {
  const supabase = getSupabase();
  const id = crypto.randomUUID();
  const joinCode = 'CT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const joinCodeHash = crypto.randomUUID();
  const now = new Date().toISOString();

  const payload = {
    id,
    owner_teacher_id: data.owner_teacher_id,
    name: data.name.trim(),
    course: data.course.trim(),
    batch: data.batch.trim(),
    department: data.department.trim(),
    academic_year: data.academic_year.trim(),
    section: data.section.trim(),
    join_code: joinCode,
    join_code_hash: joinCodeHash,
    created_at: now,
    updated_at: now,
  };

  const { data: created, error } = await supabase
    .from('classrooms')
    .insert(payload)
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Failed to create classroom: ${error?.message || 'Unknown error'}`);
  }

  return {
    ...created,
    enrolled_count: 0,
    last_scan_at: null,
    last_scan_status: null,
  } as Classroom;
}

export async function getClassroomById(id: string): Promise<Classroom | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('classrooms')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  // Enrolled count
  const { count: enrolledCount } = await supabase
    .from('classroom_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', id)
    .eq('membership_status', 'enrolled');

  // Last scan
  const { data: lastScan } = await supabase
    .from('scan_jobs')
    .select('completed_at, status')
    .eq('classroom_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ...data,
    enrolled_count: enrolledCount || 0,
    last_scan_at: lastScan?.completed_at || null,
    last_scan_status: lastScan?.status || null,
  } as Classroom;
}

export async function getClassroomsForTeacher(teacherId: string, includeArchived = false): Promise<Classroom[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('classrooms')
    .select('*')
    .eq('owner_teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (!includeArchived) {
    query = query.is('archived_at', null);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  if (data.length === 0) return [];

  const classroomIds = data.map((c) => c.id);

  // Batch membership counts
  const { data: memberships } = await supabase
    .from('classroom_memberships')
    .select('classroom_id')
    .in('classroom_id', classroomIds)
    .eq('membership_status', 'enrolled');

  const countMap: Record<string, number> = {};
  for (const m of memberships || []) {
    countMap[m.classroom_id] = (countMap[m.classroom_id] || 0) + 1;
  }

  // Batch scan jobs
  const { data: scans } = await supabase
    .from('scan_jobs')
    .select('classroom_id, completed_at, status, created_at')
    .in('classroom_id', classroomIds)
    .order('created_at', { ascending: false });

  const scanMap: Record<string, { completed_at: string | null; status: string }> = {};
  for (const s of scans || []) {
    if (s.classroom_id && !scanMap[s.classroom_id]) {
      scanMap[s.classroom_id] = { completed_at: s.completed_at, status: s.status };
    }
  }

  return data.map((c) => ({
    ...c,
    enrolled_count: countMap[c.id] || 0,
    last_scan_at: scanMap[c.id]?.completed_at || null,
    last_scan_status: scanMap[c.id]?.status || null,
  })) as Classroom[];
}

export async function getClassroomByJoinCode(code: string): Promise<Classroom | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('classrooms')
    .select('id')
    .ilike('join_code', code.trim())
    .is('archived_at', null)
    .maybeSingle();

  if (error || !data) return null;
  return getClassroomById(data.id);
}

export async function updateClassroom(id: string, updates: Partial<Classroom>): Promise<Classroom | null> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const payload: any = { updated_at: now };

  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.course !== undefined) payload.course = updates.course;
  if (updates.batch !== undefined) payload.batch = updates.batch;
  if (updates.department !== undefined) payload.department = updates.department;
  if (updates.academic_year !== undefined) payload.academic_year = updates.academic_year;
  if (updates.section !== undefined) payload.section = updates.section;

  const { error } = await supabase
    .from('classrooms')
    .update(payload)
    .eq('id', id);

  if (error) return null;
  return getClassroomById(id);
}

export async function archiveClassroom(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('classrooms')
    .update({ archived_at: now, updated_at: now })
    .eq('id', id);

  return !error;
}

// ----------------------------------------------------
// CLASSROOM MEMBERSHIPS
// ----------------------------------------------------

export async function joinClassroom(classroomId: string, studentId: string): Promise<ClassroomMembership> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  // Check existing
  const { data: existing } = await supabase
    .from('classroom_memberships')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) {
    if (existing.membership_status !== 'enrolled') {
      await supabase
        .from('classroom_memberships')
        .update({ membership_status: 'enrolled', joined_at: now })
        .eq('id', existing.id);
    }
    return { ...existing, membership_status: 'enrolled', joined_at: now } as ClassroomMembership;
  }

  const id = crypto.randomUUID();
  const payload = {
    id,
    classroom_id: classroomId,
    student_id: studentId,
    joined_at: now,
    membership_status: 'enrolled',
  };

  const { data, error } = await supabase
    .from('classroom_memberships')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to join classroom: ${error?.message || 'Unknown error'}`);
  }
  return data as ClassroomMembership;
}

export async function removeStudentFromClassroom(classroomId: string, studentId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('classroom_memberships')
    .update({ membership_status: 'dropped' })
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId);

  return !error;
}

export async function isStudentInClassroom(classroomId: string, studentId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('classroom_memberships')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId)
    .eq('membership_status', 'enrolled')
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

export async function getEnrolledStudents(classroomId: string): Promise<UserProfile[]> {
  const supabase = getSupabase();
  const { data: memberships, error: memError } = await supabase
    .from('classroom_memberships')
    .select('student_id')
    .eq('classroom_id', classroomId)
    .eq('membership_status', 'enrolled');

  if (memError || !memberships || memberships.length === 0) return [];

  const studentIds = memberships.map((m) => m.student_id);
  const { data: students, error: studError } = await supabase
    .from('user_profiles')
    .select('*')
    .in('id', studentIds)
    .order('display_name', { ascending: true });

  if (studError || !students) return [];
  return students as UserProfile[];
}

export async function getClassroomsForStudent(studentId: string): Promise<Classroom[]> {
  const supabase = getSupabase();
  const { data: memberships, error } = await supabase
    .from('classroom_memberships')
    .select('classroom_id')
    .eq('student_id', studentId)
    .eq('membership_status', 'enrolled');

  if (error || !memberships || memberships.length === 0) return [];

  const classroomIds = memberships.map((m) => m.classroom_id);
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('*')
    .in('id', classroomIds)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (!classrooms || classrooms.length === 0) return [];

  return Promise.all(classrooms.map((c) => getClassroomById(c.id).then((r) => r || c)));
}

// ----------------------------------------------------
// PLATFORM ACCOUNTS
// ----------------------------------------------------

export async function getPlatformAccountsForStudent(studentId: string): Promise<PlatformAccount[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('platform_accounts')
    .select('*')
    .eq('student_id', studentId);

  if (error || !data) return [];
  return data as PlatformAccount[];
}

export async function getPlatformAccount(studentId: string, platform: 'leetcode' | 'codechef'): Promise<PlatformAccount | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('platform_accounts')
    .select('*')
    .eq('student_id', studentId)
    .eq('platform', platform)
    .maybeSingle();

  if (error || !data) return null;
  return data as PlatformAccount;
}

export async function linkPlatformAccount(data: {
  student_id: string;
  platform: 'leetcode' | 'codechef';
  username: string;
  public_profile_url: string;
}): Promise<PlatformAccount> {
  const supabase = getSupabase();
  const normalized = data.username.trim().toLowerCase();
  const now = new Date().toISOString();

  const existing = await getPlatformAccount(data.student_id, data.platform);
  if (existing) {
    const { data: updated, error } = await supabase
      .from('platform_accounts')
      .update({
        username: data.username.trim(),
        normalized_username: normalized,
        public_profile_url: data.public_profile_url,
        ownership_verification_status: 'linked_public_profile',
        account_status: 'active',
        linked_at: now,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update handle: ${error?.message}`);
    }
    return updated as PlatformAccount;
  }

  const id = crypto.randomUUID();
  const payload = {
    id,
    student_id: data.student_id,
    platform: data.platform,
    username: data.username.trim(),
    normalized_username: normalized,
    public_profile_url: data.public_profile_url,
    ownership_verification_status: 'linked_public_profile',
    linked_at: now,
    account_status: 'active',
  };

  const { data: created, error } = await supabase
    .from('platform_accounts')
    .insert(payload)
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Failed to link handle: ${error?.message}`);
  }
  return created as PlatformAccount;
}

export async function unlinkPlatformAccount(studentId: string, platform: 'leetcode' | 'codechef'): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('platform_accounts')
    .delete()
    .eq('student_id', studentId)
    .eq('platform', platform);

  return !error;
}

// ----------------------------------------------------
// SNAPSHOTS & ACTIVITY
// ----------------------------------------------------

export async function savePlatformSnapshot(snapshot: {
  platform_account_id: string;
  scan_job_id?: string | null;
  total_solved: number;
  easy_solved?: number | null;
  medium_solved?: number | null;
  hard_solved?: number | null;
  total_questions?: number | null;
  total_submissions?: number | null;
  accepted_submissions?: number | null;
  acceptance_rate?: number | null;
  global_rank?: number | null;
  country_rank?: number | null;
  contest_rating?: number | null;
  highest_rating?: number | null;
  highest_score?: number | null;
  contests_attended?: number | null;
  source: string;
  source_version: string;
  validation_status: 'valid' | 'partial' | 'invalid';
  available_fields: string[];
  unavailable_fields: string[];
  raw_data?: any;
}): Promise<PlatformProfileSnapshot> {
  const supabase = getSupabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const payload = {
    id,
    platform_account_id: snapshot.platform_account_id,
    scan_job_id: snapshot.scan_job_id || null,
    total_solved: snapshot.total_solved,
    easy_solved: snapshot.easy_solved ?? null,
    medium_solved: snapshot.medium_solved ?? null,
    hard_solved: snapshot.hard_solved ?? null,
    total_questions: snapshot.total_questions ?? null,
    total_submissions: snapshot.total_submissions ?? null,
    accepted_submissions: snapshot.accepted_submissions ?? null,
    acceptance_rate: snapshot.acceptance_rate ?? null,
    global_rank: snapshot.global_rank ?? null,
    country_rank: snapshot.country_rank ?? null,
    contest_rating: snapshot.contest_rating ?? null,
    highest_rating: snapshot.highest_rating ?? null,
    highest_score: snapshot.highest_score ?? null,
    contests_attended: snapshot.contests_attended ?? null,
    source: snapshot.source,
    source_version: snapshot.source_version,
    validation_status: snapshot.validation_status,
    available_fields: snapshot.available_fields || [],
    unavailable_fields: snapshot.unavailable_fields || [],
    raw_data: snapshot.raw_data || null,
    observed_at: now,
  };

  const { data, error } = await supabase
    .from('platform_profile_snapshots')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to save platform snapshot: ${error?.message}`);
  }

  if (snapshot.validation_status !== 'invalid') {
    await supabase
      .from('platform_accounts')
      .update({ last_successful_sync_at: now })
      .eq('id', snapshot.platform_account_id);
  }

  return data as PlatformProfileSnapshot;
}

export async function getLatestSnapshotForAccount(platformAccountId: string): Promise<PlatformProfileSnapshot | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('platform_profile_snapshots')
    .select('*')
    .eq('platform_account_id', platformAccountId)
    .order('observed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as PlatformProfileSnapshot;
}

export async function saveDailyActivity(data: {
  platform_account_id: string;
  activity_date: string;
  submission_count: number;
  accepted_submission_count?: number | null;
  activity_status: 'active' | 'no_activity' | 'unknown' | 'stale';
  source_coverage: string;
}): Promise<DailyActivitySnapshot> {
  const supabase = getSupabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const payload = {
    id,
    platform_account_id: data.platform_account_id,
    activity_date: data.activity_date,
    submission_count: data.submission_count,
    accepted_submission_count: data.accepted_submission_count ?? null,
    activity_status: data.activity_status,
    source_coverage: data.source_coverage,
    observed_at: now,
  };

  const { data: upserted, error } = await supabase
    .from('daily_activity_snapshots')
    .upsert(payload, { onConflict: 'platform_account_id,activity_date' })
    .select()
    .single();

  if (error || !upserted) {
    throw new Error(`Failed to save daily activity: ${error?.message}`);
  }
  return upserted as DailyActivitySnapshot;
}

export async function getDailyActivityForAccount(platformAccountId: string, date: string): Promise<DailyActivitySnapshot | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('daily_activity_snapshots')
    .select('*')
    .eq('platform_account_id', platformAccountId)
    .eq('activity_date', date)
    .maybeSingle();

  if (error || !data) return null;
  return data as DailyActivitySnapshot;
}

export async function saveContestRecord(record: {
  platform_account_id: string;
  platform_contest_id?: string | null;
  contest_name: string;
  contest_date: string;
  participation_status: 'attended' | 'not_attended' | 'upcoming' | 'pending_verification' | 'unknown';
  rank?: number | null;
  score?: number | null;
  problems_solved?: number | null;
  total_problems?: number | null;
  rating_before?: number | null;
  rating_after?: number | null;
  evidence_source: string;
  data_availability_status: string;
}): Promise<ContestRecord> {
  const supabase = getSupabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const payload = {
    id,
    platform_account_id: record.platform_account_id,
    platform_contest_id: record.platform_contest_id || null,
    contest_name: record.contest_name,
    contest_date: record.contest_date,
    participation_status: record.participation_status,
    rank: record.rank ?? null,
    score: record.score ?? null,
    problems_solved: record.problems_solved ?? null,
    total_problems: record.total_problems ?? null,
    rating_before: record.rating_before ?? null,
    rating_after: record.rating_after ?? null,
    evidence_source: record.evidence_source,
    data_availability_status: record.data_availability_status,
    observed_at: now,
  };

  const { data, error } = await supabase
    .from('contest_records')
    .upsert(payload, { onConflict: 'platform_account_id,contest_name,contest_date' })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to save contest record: ${error?.message}`);
  }
  return data as ContestRecord;
}

export async function getLatestContestForAccount(platformAccountId: string): Promise<ContestRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('contest_records')
    .select('*')
    .eq('platform_account_id', platformAccountId)
    .order('contest_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as ContestRecord;
}

export async function getContestsForAccount(platformAccountId: string, limit = 20): Promise<ContestRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('contest_records')
    .select('*')
    .eq('platform_account_id', platformAccountId)
    .order('contest_date', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as ContestRecord[];
}

// ----------------------------------------------------
// CONTEST MANAGEMENT & CLASSROOM ANALYTICS
// ----------------------------------------------------

export async function upsertContest(contest: {
  id: string;
  platform: 'leetcode' | 'codechef';
  contest_code: string;
  title: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  status: 'upcoming' | 'live' | 'completed';
  card_image_url?: string | null;
  scan_status?: 'not_started' | 'scheduled' | 'scanning' | 'completed' | 'retrying' | 'failed';
  scan_message?: string | null;
}): Promise<Contest> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  // Check if existing to preserve scan_status and last_scanned_at
  const { data: existing } = await supabase
    .from('contests')
    .select('*')
    .eq('id', contest.id)
    .maybeSingle();

  const payload: any = {
    id: contest.id,
    platform: contest.platform,
    contest_code: contest.contest_code,
    title: contest.title,
    start_time: contest.start_time,
    end_time: contest.end_time,
    duration_seconds: contest.duration_seconds,
    status: contest.status,
    card_image_url: contest.card_image_url ?? null,
    scan_status: existing?.scan_status || contest.scan_status || 'not_started',
    last_scanned_at: existing?.last_scanned_at || null,
    scan_message: existing?.scan_message || contest.scan_message || null,
    retry_count: existing?.retry_count || 0,
    updated_at: now,
  };

  if (!existing) {
    payload.created_at = now;
  }

  const { data: saved, error } = await supabase
    .from('contests')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error || !saved) {
    console.error('Failed to upsert contest:', error);
    return {
      ...payload,
      created_at: existing?.created_at || now,
    } as Contest;
  }

  return saved as Contest;
}

/**
 * Accurately compute dynamic contest status based on UTC timestamps
 */
export function computeContestStatus(contest: { start_time: string; end_time: string; status?: string }): ContestStatus {
  if (!contest.start_time || !contest.end_time) {
    return (contest.status as ContestStatus) || 'upcoming';
  }
  const nowMs = Date.now();
  const startMs = new Date(contest.start_time).getTime();
  const endMs = new Date(contest.end_time).getTime();

  if (nowMs < startMs) return 'upcoming';
  if (nowMs < endMs) return 'live';
  return 'completed';
}

/**
 * Robust matcher between a contest record and a contest.
 * Handles CodeChef division letters (START260 vs START260D), parenthetical text,
 * LeetCode slugs, and titles.
 */
export function isContestRecordMatching(
  r: { contest_name?: string | null; platform_contest_id?: string | null; contest_id?: string | null },
  contest: { id?: string; title?: string; contest_code?: string; platform?: string }
): boolean {
  if (r.contest_id && contest.id && r.contest_id === contest.id) {
    return true;
  }

  const contestCode = (contest.contest_code || '').trim().toLowerCase();
  const recCode = (r.platform_contest_id || '').trim().toLowerCase();

  // 1. Exact platform_contest_id match
  if (contestCode && recCode && contestCode === recCode) {
    return true;
  }

  // 2. CodeChef division code matching:
  // e.g. record has START260D (or START260A/B/C) and contest has START260
  if (contestCode && recCode) {
    const normContestCode = contestCode.replace(/[a-d]$/i, '');
    const normRecCode = recCode.replace(/[a-d]$/i, '');
    if (normContestCode === normRecCode || recCode.startsWith(contestCode) || contestCode.startsWith(recCode)) {
      return true;
    }
  }

  // 3. Title / Name matching
  const contestTitle = (contest.title || '').trim().toLowerCase();
  const recName = (r.contest_name || '').trim().toLowerCase();

  if (contestTitle && recName) {
    if (contestTitle === recName) return true;

    // Direct containment
    if (recName.includes(contestTitle) || contestTitle.includes(recName)) {
      return true;
    }

    // Strip parenthetical text, e.g. "Starters 260 (Rated till 5 Star)" vs "Starters 260 (Rated)"
    const cleanTitle = contestTitle.replace(/\s*\([^)]*\)/g, '').trim();
    const cleanRec = recName.replace(/\s*\([^)]*\)/g, '').trim();
    if (cleanTitle && cleanRec && (cleanTitle === cleanRec || cleanTitle.includes(cleanRec) || cleanRec.includes(cleanTitle))) {
      return true;
    }

    // Slug normalized comparison (remove dashes, underscores, spaces)
    const slugTitle = contestTitle.replace(/[-_\s]+/g, '');
    const slugRec = recName.replace(/[-_\s]+/g, '');
    if (slugTitle && slugRec && (slugTitle === slugRec || slugTitle.includes(slugRec) || slugRec.includes(slugTitle))) {
      return true;
    }

    // Number matching if both mention standard prefixes (e.g., starters 260, weekly contest 524)
    const matchContestNum = contestTitle.match(/(?:starters|weekly\s*contest|biweekly\s*contest|starters\s*challenge)\s*(\d+)/i);
    const matchRecNum = recName.match(/(?:starters|weekly\s*contest|biweekly\s*contest|starters\s*challenge)\s*(\d+)/i);
    if (matchContestNum && matchRecNum && matchContestNum[1] === matchRecNum[1]) {
      return true;
    }
  }

  // 4. Cross match between platform_contest_id and contest title or slug
  if (recCode && contestTitle) {
    const slugRec = recCode.replace(/[-_\s]+/g, '');
    const slugTitle = contestTitle.replace(/[-_\s]+/g, '');
    if (slugRec && slugTitle && (slugRec === slugTitle || slugTitle.includes(slugRec) || slugRec.includes(slugTitle))) {
      return true;
    }
  }

  if (contestCode && recName) {
    const slugContest = contestCode.replace(/[-_\s]+/g, '');
    const slugRecName = recName.replace(/[-_\s]+/g, '');
    if (slugContest && slugRecName && (slugContest === slugRecName || slugRecName.includes(slugContest) || slugContest.includes(slugRecName))) {
      return true;
    }
  }

  return false;
}

export async function getContestById(id: string): Promise<Contest | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('contests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  const contest = data as Contest;
  const effectiveStatus = computeContestStatus(contest);
  if (contest.status !== effectiveStatus) {
    contest.status = effectiveStatus;
    // Async update in database
    supabase
      .from('contests')
      .update({ status: effectiveStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .then();
  }
  return contest;
}

export async function getContests(filters?: {
  platform?: 'leetcode' | 'codechef' | 'all';
  status?: string;
  limit?: number;
}): Promise<Contest[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('contests')
    .select('*');

  if (filters?.status === 'upcoming' || filters?.status === 'live') {
    query = query.order('start_time', { ascending: true });
  } else {
    query = query.order('start_time', { ascending: false });
  }

  if (filters?.platform && filters.platform !== 'all') {
    query = query.eq('platform', filters.platform);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit * 2);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const nowIso = new Date().toISOString();
  const results: Contest[] = [];

  for (const row of data as Contest[]) {
    const effectiveStatus = computeContestStatus(row);
    if (row.status !== effectiveStatus) {
      row.status = effectiveStatus;
      supabase
        .from('contests')
        .update({ status: effectiveStatus, updated_at: nowIso })
        .eq('id', row.id)
        .then();
    }

    if (filters?.status && filters.status !== 'all' && row.status !== filters.status) {
      continue;
    }
    results.push(row);
    if (filters?.limit && results.length >= filters.limit) {
      break;
    }
  }

  return results;
}

export async function updateContest(id: string, updates: Partial<Contest>): Promise<Contest | null> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const payload = { ...updates, updated_at: now };

  const { data, error } = await supabase
    .from('contests')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return null;
  return data as Contest;
}

export async function getContestAnalyticsForClassroom(contestId: string, classroomId?: string | null) {
  const supabase = getSupabase();
  const contest = await getContestById(contestId);
  if (!contest) return null;

  // 1. Get enrolled students
  let students: UserProfile[] = [];
  if (classroomId) {
    students = await getEnrolledStudents(classroomId);
  } else {
    const { data: allStudents } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'student')
      .order('display_name', { ascending: true });
    students = (allStudents || []) as UserProfile[];
  }

  if (students.length === 0) {
    return {
      contest,
      linkedAccounts: [],
      attended: [],
      notAttended: [],
      pendingVerification: [],
      summary: {
        totalLinked: 0,
        attendedCount: 0,
        notAttendedCount: 0,
        pendingCount: 0,
      },
    };
  }

  const studentIds = students.map((s) => s.id);

  // 2. Fetch platform accounts for these students for the contest's platform
  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('*')
    .in('student_id', studentIds)
    .eq('platform', contest.platform);

  if (!accounts || accounts.length === 0) {
    return {
      contest,
      linkedAccounts: [],
      attended: [],
      notAttended: [],
      pendingVerification: [],
      summary: {
        totalLinked: 0,
        attendedCount: 0,
        notAttendedCount: 0,
        pendingCount: 0,
      },
    };
  }

  const accountIds = accounts.map((a) => a.id);

  // 3. Batch fetch latest snapshots
  const { data: snapshots } = await supabase
    .from('platform_profile_snapshots')
    .select('id, platform_account_id, total_solved, easy_solved, medium_solved, hard_solved, accepted_submissions, acceptance_rate, contest_rating, highest_rating, global_rank, country_rank, observed_at')
    .in('platform_account_id', accountIds)
    .order('observed_at', { ascending: false });

  const latestSnapByAccount: Record<string, PlatformProfileSnapshot> = {};
  for (const s of (snapshots || []) as PlatformProfileSnapshot[]) {
    if (!latestSnapByAccount[s.platform_account_id]) {
      latestSnapByAccount[s.platform_account_id] = s;
    }
  }

  // 4. Batch fetch contest records matching contest_name or platform_contest_id
  const { data: records } = await supabase
    .from('contest_records')
    .select('*')
    .in('platform_account_id', accountIds);

  const contestRecordByAccount: Record<string, ContestRecord> = {};
  for (const r of (records || []) as ContestRecord[]) {
    if (isContestRecordMatching(r, contest)) {
      const existing = contestRecordByAccount[r.platform_account_id];
      // Always prefer 'attended' over 'pending_verification' or 'not_attended'
      if (!existing || r.participation_status === 'attended' || existing.participation_status !== 'attended') {
        contestRecordByAccount[r.platform_account_id] = r;
      }
    }
  }

  const studentMap: Record<string, UserProfile> = {};
  for (const st of students) {
    studentMap[st.id] = st;
  }

  // 5. Construct rows
  const linkedRows: StudentContestAttendanceRow[] = [];
  const attendedRows: StudentContestAttendanceRow[] = [];
  const notAttendedRows: StudentContestAttendanceRow[] = [];
  const pendingRows: StudentContestAttendanceRow[] = [];

  const effectiveContestStatus = computeContestStatus(contest);

  for (const acc of accounts as PlatformAccount[]) {
    const st = studentMap[acc.student_id];
    if (!st) continue;
    const snap = latestSnapByAccount[acc.id] || null;
    const cRec = contestRecordByAccount[acc.id] || null;

    let partStatus: 'attended' | 'not_attended' | 'pending_verification' = 'not_attended';
    let problemsSolved: number | null = null;
    let totalProblems: number | null = null;
    let rank: number | null = null;
    let ratingAfter: number | null = null;

    if (cRec && cRec.participation_status === 'attended') {
      partStatus = 'attended';
      problemsSolved = cRec.problems_solved ?? null;
      totalProblems = cRec.total_problems ?? (contest.platform === 'leetcode' ? 4 : null);
      rank = cRec.rank ?? null;
      ratingAfter = cRec.rating_after ?? null;
    } else if (cRec && cRec.participation_status === 'pending_verification') {
      partStatus = 'pending_verification';
    } else if (cRec && cRec.participation_status === 'not_attended') {
      partStatus = 'not_attended';
    } else if (effectiveContestStatus === 'upcoming' || effectiveContestStatus === 'live') {
      partStatus = 'pending_verification';
    } else if (contest.scan_status === 'retrying' || contest.scan_status === 'not_started' || contest.scan_status === 'scheduled') {
      partStatus = 'pending_verification';
    } else {
      partStatus = 'not_attended';
    }

    const row: StudentContestAttendanceRow = {
      student_id: st.id,
      student_name: st.display_name,
      register_number: st.register_number || null,
      username: acc.username,
      public_profile_url: acc.public_profile_url,
      platform: acc.platform,
      verification_status: acc.ownership_verification_status,
      account_status: acc.account_status,
      participation_status: partStatus,
      contest_problems_solved: problemsSolved,
      contest_total_problems: totalProblems,
      contest_rank: rank,
      contest_rating_after: ratingAfter,
      lifetime_total_solved: snap?.total_solved ?? null,
      easy_solved: snap?.easy_solved ?? null,
      medium_solved: snap?.medium_solved ?? null,
      hard_solved: snap?.hard_solved ?? null,
      accepted_submissions: snap?.accepted_submissions ?? null,
      acceptance_rate: snap?.acceptance_rate ?? null,
      contest_rating: snap?.contest_rating ?? null,
      highest_rating: snap?.highest_rating ?? null,
      profile_rank: snap?.global_rank ?? null,
      country_rank: snap?.country_rank ?? null,
      last_sync: acc.last_successful_sync_at || snap?.observed_at || null,
    };

    linkedRows.push(row);
    if (partStatus === 'attended') {
      attendedRows.push(row);
    } else if (partStatus === 'pending_verification') {
      pendingRows.push(row);
    } else {
      notAttendedRows.push(row);
    }
  }

  // Sort attended by rank ascending or problems solved descending
  attendedRows.sort((a, b) => {
    if (a.contest_rank && b.contest_rank) return a.contest_rank - b.contest_rank;
    if (a.contest_rank) return -1;
    if (b.contest_rank) return 1;
    return (b.contest_problems_solved || 0) - (a.contest_problems_solved || 0);
  });

  return {
    contest,
    linkedAccounts: linkedRows,
    attended: attendedRows,
    notAttended: notAttendedRows,
    pendingVerification: pendingRows,
    summary: {
      totalLinked: linkedRows.length,
      attendedCount: attendedRows.length,
      notAttendedCount: notAttendedRows.length,
      pendingCount: pendingRows.length,
    },
  };
}

export interface ContestAttendanceSummary {
  totalLinked: number;
  attendedCount: number;
  notAttendedCount: number;
  pendingCount: number;
}

export async function getBatchContestSummaryForClassroom(
  contests: Contest[],
  classroomId?: string | null
): Promise<Record<string, ContestAttendanceSummary>> {
  const result: Record<string, ContestAttendanceSummary> = {};
  if (!contests || contests.length === 0) return result;

  for (const c of contests) {
    result[c.id] = {
      totalLinked: 0,
      attendedCount: 0,
      notAttendedCount: 0,
      pendingCount: 0,
    };
  }

  const supabase = getSupabase();

  // 1. Fetch students for classroom or all students if no classroomId
  let students: UserProfile[] = [];
  if (classroomId) {
    students = await getEnrolledStudents(classroomId);
  } else {
    const { data: allStudents } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'student');
    students = (allStudents || []) as UserProfile[];
  }

  if (students.length === 0) {
    return result;
  }

  const studentIds = students.map((s) => s.id);

  // 2. Fetch platform accounts for these students in a single query
  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('id, student_id, platform')
    .in('student_id', studentIds);

  if (!accounts || accounts.length === 0) {
    return result;
  }

  const accountIds = accounts.map((a) => a.id);
  const leetcodeAccounts = accounts.filter((a) => a.platform === 'leetcode');
  const codechefAccounts = accounts.filter((a) => a.platform === 'codechef');

  // 3. Batch fetch contest records matching all these accountIds in a single query
  const { data: records } = await supabase
    .from('contest_records')
    .select('platform_account_id, contest_name, platform_contest_id, participation_status')
    .in('platform_account_id', accountIds);

  const allRecords = (records || []) as ContestRecord[];

  // 4. Calculate summary for each contest in memory
  for (const contest of contests) {
    const targetAccounts = contest.platform === 'leetcode'
      ? leetcodeAccounts
      : contest.platform === 'codechef'
        ? codechefAccounts
        : accounts.filter((a) => a.platform === contest.platform);

    const totalLinked = targetAccounts.length;
    if (totalLinked === 0) {
      result[contest.id] = {
        totalLinked: 0,
        attendedCount: 0,
        notAttendedCount: 0,
        pendingCount: 0,
      };
      continue;
    }

    // Index matching records for this contest by platform_account_id
    const contestRecordByAccount: Record<string, ContestRecord> = {};
    for (const r of allRecords) {
      if (isContestRecordMatching(r, contest)) {
        const existing = contestRecordByAccount[r.platform_account_id];
        // Always prefer 'attended' over 'pending_verification' or 'not_attended'
        if (!existing || r.participation_status === 'attended' || existing.participation_status !== 'attended') {
          contestRecordByAccount[r.platform_account_id] = r;
        }
      }
    }

    let attendedCount = 0;
    let notAttendedCount = 0;
    let pendingCount = 0;

    const effectiveContestStatus = computeContestStatus(contest);

    for (const acc of targetAccounts) {
      const cRec = contestRecordByAccount[acc.id] || null;

      let partStatus: 'attended' | 'not_attended' | 'pending_verification' = 'not_attended';
      if (cRec && cRec.participation_status === 'attended') {
        partStatus = 'attended';
      } else if (cRec && cRec.participation_status === 'pending_verification') {
        partStatus = 'pending_verification';
      } else if (cRec && cRec.participation_status === 'not_attended') {
        partStatus = 'not_attended';
      } else if (effectiveContestStatus === 'upcoming' || effectiveContestStatus === 'live') {
        partStatus = 'pending_verification';
      } else if (
        contest.scan_status === 'retrying' ||
        contest.scan_status === 'not_started' ||
        contest.scan_status === 'scheduled'
      ) {
        partStatus = 'pending_verification';
      } else {
        partStatus = 'not_attended';
      }

      if (partStatus === 'attended') {
        attendedCount++;
      } else if (partStatus === 'pending_verification') {
        pendingCount++;
      } else {
        notAttendedCount++;
      }
    }

    result[contest.id] = {
      totalLinked,
      attendedCount,
      notAttendedCount,
      pendingCount,
    };
  }

  return result;
}


// ----------------------------------------------------
// SCAN JOBS
// ----------------------------------------------------

export async function createScanJob(data: {
  classroom_id?: string | null;
  requested_by: string;
  selected_platforms: 'all' | 'leetcode' | 'codechef';
  requested_scope: 'classroom' | 'student';
  target_student_id?: string | null;
  total_accounts: number;
}): Promise<ScanJob> {
  const supabase = getSupabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const payload = {
    id,
    classroom_id: data.classroom_id || null,
    requested_by: data.requested_by,
    selected_platforms: data.selected_platforms,
    requested_scope: data.requested_scope,
    target_student_id: data.target_student_id || null,
    status: 'queued',
    total_accounts: data.total_accounts,
    processed_accounts: 0,
    successful_accounts: 0,
    partial_accounts: 0,
    failed_accounts: 0,
    created_at: now,
  };

  const { data: created, error } = await supabase
    .from('scan_jobs')
    .insert(payload)
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Failed to create scan job: ${error?.message}`);
  }
  return created as ScanJob;
}

export async function getScanJobById(id: string): Promise<ScanJob | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('scan_jobs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data as ScanJob;
}

export async function updateScanJob(id: string, updates: Partial<ScanJob>): Promise<ScanJob | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('scan_jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return null;
  return data as ScanJob;
}

export async function getScanJobsForClassroom(classroomId: string | null, limit = 20): Promise<ScanJob[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('scan_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (classroomId) {
    query = query.eq('classroom_id', classroomId);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as ScanJob[];
}

export async function createScanJobItem(data: {
  scan_job_id: string;
  platform_account_id: string;
  platform: 'leetcode' | 'codechef';
}): Promise<ScanJobItem> {
  const supabase = getSupabase();
  const id = crypto.randomUUID();

  const payload = {
    id,
    scan_job_id: data.scan_job_id,
    platform_account_id: data.platform_account_id,
    platform: data.platform,
    status: 'queued',
  };

  const { data: created, error } = await supabase
    .from('scan_job_items')
    .insert(payload)
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Failed to create scan job item: ${error?.message}`);
  }
  return created as ScanJobItem;
}

export async function createScanJobItems(items: Array<{
  scan_job_id: string;
  platform_account_id: string;
  platform: 'leetcode' | 'codechef';
}>): Promise<ScanJobItem[]> {
  if (items.length === 0) return [];
  const supabase = getSupabase();
  const payloads = items.map((item) => ({
    id: crypto.randomUUID(),
    scan_job_id: item.scan_job_id,
    platform_account_id: item.platform_account_id,
    platform: item.platform,
    status: 'queued',
  }));

  const { data: created, error } = await supabase
    .from('scan_job_items')
    .insert(payloads)
    .select();

  if (error || !created) {
    throw new Error(`Failed to create scan job items: ${error?.message}`);
  }
  return created as ScanJobItem[];
}

export async function updateScanJobItem(id: string, updates: Partial<ScanJobItem>): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from('scan_job_items')
    .update(updates)
    .eq('id', id);
}

export async function getScanJobItems(scanJobId: string): Promise<ScanJobItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('scan_job_items')
    .select('*')
    .eq('scan_job_id', scanJobId);

  if (error || !data) return [];
  return data as ScanJobItem[];
}

// ----------------------------------------------------
// AUDIT LOGS
// ----------------------------------------------------

export async function logAuditAction(data: {
  user_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: any;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await supabase.from('audit_logs').insert({
      id,
      user_id: data.user_id || null,
      action: data.action,
      resource_type: data.resource_type,
      resource_id: data.resource_id || null,
      details: data.details || null,
      created_at: now,
    });
  } catch (err) {
    console.error('Audit log write error:', err);
  }
}

// ----------------------------------------------------
// DYNAMIC DASHBOARD AGGREGATIONS (ZERO FAKE DATA)
// High-efficiency batched querying without N+1 loops
// ----------------------------------------------------

export async function getClassroomOverview(classroomId: string): Promise<StudentPerformanceOverview[]> {
  const students = await getEnrolledStudents(classroomId);
  if (students.length === 0) return [];

  const supabase = getSupabase();
  const studentIds = students.map((s) => s.id);
  const today = getTodayAsiaKolkata();
  const yesterday = getYesterdayAsiaKolkata();

  // 1. Batch fetch all platform accounts for enrolled students
  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('*')
    .in('student_id', studentIds);

  const accountIds = (accounts || []).map((a) => a.id);

  // 2. Batch fetch latest snapshots using composite index
  let snapshots: PlatformProfileSnapshot[] = [];
  if (accountIds.length > 0) {
    const { data: snapData } = await supabase
      .from('platform_profile_snapshots')
      .select('id, platform_account_id, scan_job_id, total_solved, easy_solved, medium_solved, hard_solved, total_questions, total_submissions, accepted_submissions, acceptance_rate, global_rank, country_rank, contest_rating, highest_rating, highest_score, contests_attended, validation_status, observed_at')
      .in('platform_account_id', accountIds)
      .order('observed_at', { ascending: false });

    snapshots = (snapData || []) as PlatformProfileSnapshot[];
  }

  // 3. Batch fetch activity for today and yesterday
  let activities: DailyActivitySnapshot[] = [];
  if (accountIds.length > 0) {
    const { data: actData } = await supabase
      .from('daily_activity_snapshots')
      .select('*')
      .in('platform_account_id', accountIds)
      .in('activity_date', [today, yesterday]);

    activities = (actData || []) as DailyActivitySnapshot[];
  }

  // 4. Batch fetch latest contest records
  let contests: ContestRecord[] = [];
  if (accountIds.length > 0) {
    const { data: contData } = await supabase
      .from('contest_records')
      .select('*')
      .in('platform_account_id', accountIds)
      .order('contest_date', { ascending: false });

    contests = (contData || []) as ContestRecord[];
  }

  // Map indexes for instant lookup
  const accountByStudentAndPlatform: Record<string, PlatformAccount> = {};
  for (const acc of accounts || []) {
    accountByStudentAndPlatform[`${acc.student_id}_${acc.platform}`] = acc as PlatformAccount;
  }

  const latestSnapshotByAccount: Record<string, PlatformProfileSnapshot> = {};
  for (const s of snapshots) {
    if (!latestSnapshotByAccount[s.platform_account_id]) {
      latestSnapshotByAccount[s.platform_account_id] = s;
    }
  }

  const activityByAccountAndDate: Record<string, DailyActivitySnapshot> = {};
  for (const act of activities) {
    activityByAccountAndDate[`${act.platform_account_id}_${act.activity_date}`] = act;
  }

  const latestContestByAccount: Record<string, ContestRecord> = {};
  for (const c of contests) {
    if (!latestContestByAccount[c.platform_account_id]) {
      latestContestByAccount[c.platform_account_id] = c;
    }
  }

  return students.map((student) => {
    const lcAcc = accountByStudentAndPlatform[`${student.id}_leetcode`] || null;
    const ccAcc = accountByStudentAndPlatform[`${student.id}_codechef`] || null;

    const lcSnap = lcAcc ? latestSnapshotByAccount[lcAcc.id] || null : null;
    const ccSnap = ccAcc ? latestSnapshotByAccount[ccAcc.id] || null : null;

    const lcToday = lcAcc ? activityByAccountAndDate[`${lcAcc.id}_${today}`] || null : null;
    const ccToday = ccAcc ? activityByAccountAndDate[`${ccAcc.id}_${today}`] || null : null;

    const lcYesterday = lcAcc ? activityByAccountAndDate[`${lcAcc.id}_${yesterday}`] || null : null;
    const ccYesterday = ccAcc ? activityByAccountAndDate[`${ccAcc.id}_${yesterday}`] || null : null;

    const lcContest = lcAcc ? latestContestByAccount[lcAcc.id] || null : null;
    const ccContest = ccAcc ? latestContestByAccount[ccAcc.id] || null : null;

    return {
      student,
      leetcodeAccount: lcAcc,
      codechefAccount: ccAcc,
      leetcodeSnapshot: lcSnap,
      codechefSnapshot: ccSnap,
      leetcodeTodayActivity: lcToday,
      codechefTodayActivity: ccToday,
      leetcodeYesterdayActivity: lcYesterday,
      codechefYesterdayActivity: ccYesterday,
      leetcodeLatestContest: lcContest,
      codechefLatestContest: ccContest,
    };
  });
}

export async function getClassroomKPIs(classroomId: string | null) {
  const supabase = getSupabase();
  const today = getTodayAsiaKolkata();
  const yesterday = getYesterdayAsiaKolkata();

  let enrolledStudents: UserProfile[] = [];
  if (classroomId) {
    enrolledStudents = await getEnrolledStudents(classroomId);
  } else {
    const { data: allStudents } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'student');
    enrolledStudents = (allStudents || []) as UserProfile[];
  }

  const studentCount = enrolledStudents.length;
  if (studentCount === 0) {
    return {
      totalEnrolled: 0,
      activeToday: 0,
      activeYesterday: 0,
      noActivityToday: 0,
      dataUnavailableCount: 0,
      staleCount: 0,
      unlinkedCount: 0,
      leetcodeTotalSolved: 0,
      codechefTotalSolved: 0,
      totalContestsParticipated: 0,
    };
  }

  const studentIds = enrolledStudents.map((s) => s.id);
  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('*')
    .in('student_id', studentIds);

  const accountIds = (accounts || []).map((a) => a.id);

  let snapshots: PlatformProfileSnapshot[] = [];
  let activities: DailyActivitySnapshot[] = [];

  if (accountIds.length > 0) {
    const { data: snapData } = await supabase
      .from('platform_profile_snapshots')
      .select('id, platform_account_id, total_solved, observed_at')
      .in('platform_account_id', accountIds)
      .order('observed_at', { ascending: false });
    snapshots = (snapData || []) as PlatformProfileSnapshot[];

    const { data: actData } = await supabase
      .from('daily_activity_snapshots')
      .select('*')
      .in('platform_account_id', accountIds)
      .in('activity_date', [today, yesterday]);
    activities = (actData || []) as DailyActivitySnapshot[];
  }

  const accountByStudentAndPlatform: Record<string, PlatformAccount> = {};
  for (const acc of accounts || []) {
    accountByStudentAndPlatform[`${acc.student_id}_${acc.platform}`] = acc as PlatformAccount;
  }

  const latestSnapshotByAccount: Record<string, PlatformProfileSnapshot> = {};
  for (const s of snapshots) {
    if (!latestSnapshotByAccount[s.platform_account_id]) {
      latestSnapshotByAccount[s.platform_account_id] = s;
    }
  }

  const activityByAccountAndDate: Record<string, DailyActivitySnapshot> = {};
  for (const act of activities) {
    activityByAccountAndDate[`${act.platform_account_id}_${act.activity_date}`] = act;
  }

  let activeToday = 0;
  let activeYesterday = 0;
  let noActivityToday = 0;
  let dataUnavailableCount = 0;
  let staleCount = 0;
  let unlinkedCount = 0;
  let leetcodeTotalSolved = 0;
  let codechefTotalSolved = 0;
  let totalContestsParticipated = 0;

  for (const student of enrolledStudents) {
    const lcAcc = accountByStudentAndPlatform[`${student.id}_leetcode`] || null;
    const ccAcc = accountByStudentAndPlatform[`${student.id}_codechef`] || null;

    if (!lcAcc && !ccAcc) {
      unlinkedCount++;
    }

    if (lcAcc) {
      const snap = latestSnapshotByAccount[lcAcc.id];
      if (snap) {
        leetcodeTotalSolved += snap.total_solved || 0;
      }
      if (lcAcc.account_status === 'error' || lcAcc.account_status === 'not_found') {
        dataUnavailableCount++;
      }
      const act = activityByAccountAndDate[`${lcAcc.id}_${today}`];
      if (act && act.activity_status === 'active') {
        activeToday++;
      } else if (act && act.activity_status === 'no_activity') {
        noActivityToday++;
      }
      const yAct = activityByAccountAndDate[`${lcAcc.id}_${yesterday}`];
      if (yAct && yAct.activity_status === 'active') {
        activeYesterday++;
      }
    }

    if (ccAcc) {
      const snap = latestSnapshotByAccount[ccAcc.id];
      if (snap) {
        codechefTotalSolved += snap.total_solved || 0;
        totalContestsParticipated += snap.contests_attended || 0;
      }
      if (ccAcc.account_status === 'error' || ccAcc.account_status === 'not_found') {
        dataUnavailableCount++;
      }
      const act = activityByAccountAndDate[`${ccAcc.id}_${today}`];
      if (act && act.activity_status === 'active') {
        activeToday++;
      } else if (act && act.activity_status === 'no_activity') {
        noActivityToday++;
      }
      const yAct = activityByAccountAndDate[`${ccAcc.id}_${yesterday}`];
      if (yAct && yAct.activity_status === 'active') {
        activeYesterday++;
      }
    }
  }

  return {
    totalEnrolled: studentCount,
    activeToday,
    activeYesterday,
    noActivityToday,
    dataUnavailableCount,
    staleCount,
    unlinkedCount,
    leetcodeTotalSolved,
    codechefTotalSolved,
    totalContestsParticipated,
  };
}

// ----------------------------------------------------
// TIMEZONE HELPER: Asia/Kolkata
// ----------------------------------------------------

export function getTodayAsiaKolkata(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

export function getYesterdayAsiaKolkata(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
}

// ----------------------------------------------------
// COMPLETE ACCOUNT DELETION (STUDENT & TEACHER SAFEGUARDS)
// ----------------------------------------------------

export async function deleteUserAccount(userId: string): Promise<{ success: boolean; authUserId?: string | null; message: string }> {
  const supabase = getSupabase();

  // 1. Fetch user profile
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User account not found');
  }

  // 2. Teacher-specific safeguards:
  // Inspect whether this teacher owns active classrooms with enrolled students
  if (user.role === 'teacher' || user.role === 'admin') {
    const { data: ownedClassrooms } = await supabase
      .from('classrooms')
      .select('id, name')
      .eq('owner_teacher_id', userId);

    if (ownedClassrooms && ownedClassrooms.length > 0) {
      const classroomIds = ownedClassrooms.map((c) => c.id);
      const { data: activeMemberships } = await supabase
        .from('classroom_memberships')
        .select('id, classroom_id')
        .in('classroom_id', classroomIds)
        .eq('membership_status', 'enrolled');

      if (activeMemberships && activeMemberships.length > 0) {
        throw new Error(
          'Cannot delete account: You are the owner of classrooms with active enrolled students. ' +
          'To protect institutional records and enrolled students, please transfer classroom ownership or contact an administrator before deleting your account.'
        );
      }

      // If teacher owns classrooms with 0 active students, safely delete the empty classrooms
      for (const c of ownedClassrooms) {
        await supabase.from('classroom_memberships').delete().eq('classroom_id', c.id);
        await supabase.from('scan_jobs').update({ classroom_id: null }).eq('classroom_id', c.id);
        await supabase.from('classrooms').delete().eq('id', c.id);
      }
    }
  }

  // 3. Student-specific records:
  // Remove classroom memberships for student
  await supabase
    .from('classroom_memberships')
    .delete()
    .eq('student_id', userId);

  // 4. Platform Accounts & Dependent Snapshots/Activities/Contests:
  const { data: accounts } = await supabase
    .from('platform_accounts')
    .select('id')
    .eq('student_id', userId);

  if (accounts && accounts.length > 0) {
    const accountIds = accounts.map((a) => a.id);

    // Delete daily activity snapshots
    await supabase
      .from('daily_activity_snapshots')
      .delete()
      .in('platform_account_id', accountIds);

    // Delete platform profile snapshots
    await supabase
      .from('platform_profile_snapshots')
      .delete()
      .in('platform_account_id', accountIds);

    // Delete contest records
    await supabase
      .from('contest_records')
      .delete()
      .in('platform_account_id', accountIds);

    // Delete scan job items
    await supabase
      .from('scan_job_items')
      .delete()
      .in('platform_account_id', accountIds);

    // Delete platform accounts
    await supabase
      .from('platform_accounts')
      .delete()
      .eq('student_id', userId);
  }

  // 5. Scan jobs disassociation
  await supabase
    .from('scan_jobs')
    .update({ target_student_id: null })
    .eq('target_student_id', userId);

  await supabase
    .from('scan_jobs')
    .update({ requested_by: null })
    .eq('requested_by', userId);

  // 6. Audit logs anonymization (preserve security log but remove user ID link)
  await supabase
    .from('audit_logs')
    .update({ user_id: null })
    .eq('user_id', userId);

  // Log final deletion audit entry
  await logAuditAction({
    user_id: null,
    action: 'USER_ACCOUNT_DELETED',
    resource_type: 'user_profiles',
    resource_id: userId,
    details: {
      deletedEmail: user.email,
      role: user.role,
      deletedAt: new Date().toISOString(),
    },
  });

  // 7. Delete user profile record
  const { error: profileDeleteError } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  if (profileDeleteError) {
    throw new Error(`Failed to delete user profile: ${profileDeleteError.message}`);
  }

  return {
    success: true,
    authUserId: user.auth_user_id || null,
    message: 'User account and all associated personal data successfully deleted.',
  };
}
