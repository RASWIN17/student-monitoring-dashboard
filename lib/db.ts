import { createAdminClient } from './supabase/admin';
import {
  UserProfile,
  Classroom,
  ClassroomMembership,
  PlatformAccount,
  PlatformProfileSnapshot,
  DailyActivitySnapshot,
  ContestRecord,
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

export async function createUser(profile: {
  id?: string;
  auth_user_id?: string | null;
  email: string;
  display_name: string;
  role: 'teacher' | 'student' | 'admin';
  avatar_url?: string | null;
}): Promise<UserProfile> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const payload = {
    id: profile.id || crypto.randomUUID(),
    auth_user_id: profile.auth_user_id || null,
    email: profile.email.trim().toLowerCase(),
    display_name: profile.display_name.trim(),
    role: profile.role,
    avatar_url: profile.avatar_url || null,
    created_at: now,
    updated_at: now,
  };

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
        .update({ membership_status: 'enrolled' })
        .eq('id', existing.id);
    }
    return { ...existing, membership_status: 'enrolled' } as ClassroomMembership;
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
    .delete()
    .eq('classroom_id', classroomId)
    .eq('student_id', studentId);

  return !error;
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
      .select('*')
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
      .select('*')
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
