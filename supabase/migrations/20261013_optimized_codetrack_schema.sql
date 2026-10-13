-- ====================================================================
-- CodeTrack: Production Cloud PostgreSQL Schema & Row Level Security (RLS)
-- Optimized for high concurrency, zero fake data, and zero RLS recursion
-- Migration: 20261013_optimized_codetrack_schema.sql
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USER PROFILES
-- Linked to Supabase Auth (auth.users).
-- auth_user_id is nullable to permit idempotent migration of historical SQLite records
-- before the users complete their initial Google OAuth sign-in.
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'admin')),
    avatar_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. CLASSROOMS
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    course TEXT NOT NULL,
    batch TEXT NOT NULL,
    department TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    section TEXT NOT NULL,
    join_code TEXT UNIQUE NOT NULL,
    join_code_hash TEXT UNIQUE NOT NULL,
    archived_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. CLASSROOM MEMBERSHIPS
CREATE TABLE IF NOT EXISTS public.classroom_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    membership_status TEXT NOT NULL DEFAULT 'enrolled' CHECK (membership_status IN ('enrolled', 'dropped', 'pending')),
    CONSTRAINT uq_classroom_student UNIQUE (classroom_id, student_id)
);

-- 5. PLATFORM ACCOUNTS
CREATE TABLE IF NOT EXISTS public.platform_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('leetcode', 'codechef')),
    username TEXT NOT NULL,
    normalized_username TEXT NOT NULL,
    public_profile_url TEXT NOT NULL,
    ownership_verification_status TEXT NOT NULL DEFAULT 'linked_public_profile' 
        CHECK (ownership_verification_status IN ('unverified', 'linked_public_profile', 'verified_owner')),
    linked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    last_successful_sync_at TIMESTAMPTZ NULL,
    account_status TEXT NOT NULL DEFAULT 'active' 
        CHECK (account_status IN ('active', 'unverified', 'error', 'rate_limited', 'not_found')),
    CONSTRAINT uq_student_platform UNIQUE (student_id, platform)
);

-- 6. PLATFORM PROFILE SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.platform_profile_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_account_id UUID NOT NULL REFERENCES public.platform_accounts(id) ON DELETE CASCADE,
    scan_job_id UUID NULL,
    total_solved INTEGER NOT NULL DEFAULT 0,
    easy_solved INTEGER NULL,
    medium_solved INTEGER NULL,
    hard_solved INTEGER NULL,
    total_questions INTEGER NULL,
    total_submissions INTEGER NULL,
    accepted_submissions INTEGER NULL,
    acceptance_rate NUMERIC NULL,
    global_rank INTEGER NULL,
    country_rank INTEGER NULL,
    contest_rating NUMERIC NULL,
    highest_rating NUMERIC NULL,
    highest_score NUMERIC NULL,
    contests_attended INTEGER NULL,
    source TEXT NOT NULL,
    source_version TEXT NOT NULL,
    validation_status TEXT NOT NULL DEFAULT 'valid' CHECK (validation_status IN ('valid', 'partial', 'invalid')),
    available_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    unavailable_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_data JSONB NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. DAILY ACTIVITY SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.daily_activity_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_account_id UUID NOT NULL REFERENCES public.platform_accounts(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    submission_count INTEGER NOT NULL DEFAULT 0,
    accepted_submission_count INTEGER NULL,
    activity_status TEXT NOT NULL CHECK (activity_status IN ('active', 'no_activity', 'unknown', 'stale')),
    source_coverage TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_account_activity_date UNIQUE (platform_account_id, activity_date)
);

-- 8. CONTEST RECORDS
-- Unique constraint prevents duplicate contest records on recurring scans
CREATE TABLE IF NOT EXISTS public.contest_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_account_id UUID NOT NULL REFERENCES public.platform_accounts(id) ON DELETE CASCADE,
    platform_contest_id TEXT NULL,
    contest_name TEXT NOT NULL,
    contest_date TIMESTAMPTZ NOT NULL,
    participation_status TEXT NOT NULL CHECK (participation_status IN ('attended', 'not_attended', 'upcoming', 'pending_verification', 'unknown')),
    rank INTEGER NULL,
    score NUMERIC NULL,
    problems_solved INTEGER NULL,
    total_problems INTEGER NULL,
    rating_before NUMERIC NULL,
    rating_after NUMERIC NULL,
    evidence_source TEXT NOT NULL,
    data_availability_status TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_account_contest UNIQUE (platform_account_id, contest_name, contest_date)
);

-- 9. SCAN JOBS
CREATE TABLE IF NOT EXISTS public.scan_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NULL REFERENCES public.classrooms(id) ON DELETE SET NULL,
    requested_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    selected_platforms TEXT NOT NULL DEFAULT 'all' CHECK (selected_platforms IN ('all', 'leetcode', 'codechef')),
    requested_scope TEXT NOT NULL DEFAULT 'classroom' CHECK (requested_scope IN ('classroom', 'student')),
    target_student_id UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled')),
    total_accounts INTEGER NOT NULL DEFAULT 0,
    processed_accounts INTEGER NOT NULL DEFAULT 0,
    successful_accounts INTEGER NOT NULL DEFAULT 0,
    partial_accounts INTEGER NOT NULL DEFAULT 0,
    failed_accounts INTEGER NOT NULL DEFAULT 0,
    error_summary TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL
);

-- 10. SCAN JOB ITEMS
CREATE TABLE IF NOT EXISTS public.scan_job_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_job_id UUID NOT NULL REFERENCES public.scan_jobs(id) ON DELETE CASCADE,
    platform_account_id UUID NOT NULL REFERENCES public.platform_accounts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('leetcode', 'codechef')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'partial', 'failed')),
    fields_retrieved JSONB NULL,
    missing_fields JSONB NULL,
    error_code TEXT NULL,
    error_message TEXT NULL,
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL
);

-- 11. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NULL,
    details JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ====================================================================
-- HIGH-PERFORMANCE COMPOSITE & COVERING INDEXES
-- Designed for real dashboard and reporting query patterns
-- ====================================================================

-- User profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON public.user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_lower ON public.user_profiles(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Classrooms
CREATE INDEX IF NOT EXISTS idx_classrooms_owner_archived ON public.classrooms(owner_teacher_id, archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code_upper ON public.classrooms(UPPER(join_code));

-- Classroom memberships
CREATE INDEX IF NOT EXISTS idx_memberships_classroom_status ON public.classroom_memberships(classroom_id, membership_status);
CREATE INDEX IF NOT EXISTS idx_memberships_student_status ON public.classroom_memberships(student_id, membership_status);

-- Platform accounts
CREATE INDEX IF NOT EXISTS idx_platform_accounts_student ON public.platform_accounts(student_id, platform);
CREATE INDEX IF NOT EXISTS idx_platform_accounts_normalized ON public.platform_accounts(platform, normalized_username);

-- Snapshots: composite index allows instant reverse chronological scans
CREATE INDEX IF NOT EXISTS idx_snapshots_account_observed ON public.platform_profile_snapshots(platform_account_id, observed_at DESC);

-- Daily activity: composite index allows instant 30-day activity retrieval
CREATE INDEX IF NOT EXISTS idx_daily_activity_account_date ON public.daily_activity_snapshots(platform_account_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_activity_date_trends ON public.daily_activity_snapshots(activity_date DESC);

-- Contests: composite index allows instant latest contest and contest history retrieval
CREATE INDEX IF NOT EXISTS idx_contest_records_account_date ON public.contest_records(platform_account_id, contest_date DESC);
CREATE INDEX IF NOT EXISTS idx_contest_records_date_recent ON public.contest_records(contest_date DESC);

-- Scan jobs
CREATE INDEX IF NOT EXISTS idx_scan_jobs_classroom_created ON public.scan_jobs(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_status_created ON public.scan_jobs(status, created_at ASC);

-- Scan items
CREATE INDEX IF NOT EXISTS idx_scan_job_items_job_status ON public.scan_job_items(scan_job_id, status);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ====================================================================
-- RLS HELPER FUNCTIONS (SECURITY DEFINER to prevent recursion)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_classroom(c_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = c_id AND owner_teacher_id = public.current_user_profile_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled_in_classroom(c_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classroom_memberships
    WHERE classroom_id = c_id
      AND student_id = public.current_user_profile_id()
      AND membership_status = 'enrolled'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_student_in_teacher_classrooms(s_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classroom_memberships m
    JOIN public.classrooms c ON c.id = m.classroom_id
    WHERE m.student_id = s_id
      AND m.membership_status = 'enrolled'
      AND c.owner_teacher_id = public.current_user_profile_id()
  );
$$;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_profile_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- 1. USER PROFILES POLICIES
-- ----------------------------------------------------
CREATE POLICY "Users can read own profile" ON public.user_profiles
    FOR SELECT USING (
        auth.uid() = auth_user_id 
        OR public.current_user_role() = 'admin'
        OR public.is_student_in_teacher_classrooms(id)
    );

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (
        auth.uid() = auth_user_id
    );

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (
        auth.uid() = auth_user_id
    );

-- ----------------------------------------------------
-- 2. CLASSROOMS POLICIES
-- ----------------------------------------------------
CREATE POLICY "Users can view accessible classrooms" ON public.classrooms
    FOR SELECT USING (
        owner_teacher_id = public.current_user_profile_id()
        OR public.is_enrolled_in_classroom(id)
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "Teachers can insert classrooms" ON public.classrooms
    FOR INSERT WITH CHECK (
        (public.current_user_role() IN ('teacher', 'admin'))
        AND owner_teacher_id = public.current_user_profile_id()
    );

CREATE POLICY "Teachers can update own classrooms" ON public.classrooms
    FOR UPDATE USING (
        owner_teacher_id = public.current_user_profile_id()
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "Teachers can delete own classrooms" ON public.classrooms
    FOR DELETE USING (
        owner_teacher_id = public.current_user_profile_id()
        OR public.current_user_role() = 'admin'
    );

-- ----------------------------------------------------
-- 3. CLASSROOM MEMBERSHIPS POLICIES
-- ----------------------------------------------------
CREATE POLICY "Memberships viewable by student, teacher or admin" ON public.classroom_memberships
    FOR SELECT USING (
        student_id = public.current_user_profile_id()
        OR public.is_teacher_of_classroom(classroom_id)
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "Students can join or teachers can enroll" ON public.classroom_memberships
    FOR INSERT WITH CHECK (
        student_id = public.current_user_profile_id()
        OR public.is_teacher_of_classroom(classroom_id)
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "Memberships modifiable by teachers or admin" ON public.classroom_memberships
    FOR UPDATE USING (
        public.is_teacher_of_classroom(classroom_id)
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "Memberships deletable by teachers or admin" ON public.classroom_memberships
    FOR DELETE USING (
        public.is_teacher_of_classroom(classroom_id)
        OR public.current_user_role() = 'admin'
    );

-- ----------------------------------------------------
-- 4. PLATFORM ACCOUNTS POLICIES
-- ----------------------------------------------------
CREATE POLICY "Platform accounts viewable by owner or teachers" ON public.platform_accounts
    FOR SELECT USING (
        student_id = public.current_user_profile_id()
        OR public.is_student_in_teacher_classrooms(student_id)
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "Students can manage own platform accounts" ON public.platform_accounts
    FOR ALL USING (
        student_id = public.current_user_profile_id()
        OR public.current_user_role() = 'admin'
    );

-- ----------------------------------------------------
-- 5. SNAPSHOTS, ACTIVITY & CONTESTS POLICIES
-- ----------------------------------------------------
CREATE POLICY "Snapshots viewable by student or teacher" ON public.platform_profile_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.platform_accounts pa
            WHERE pa.id = platform_profile_snapshots.platform_account_id
              AND (pa.student_id = public.current_user_profile_id()
                   OR public.is_student_in_teacher_classrooms(pa.student_id)
                   OR public.current_user_role() = 'admin')
        )
    );

CREATE POLICY "Snapshots insertable by server or authorized user" ON public.platform_profile_snapshots
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Daily activity viewable by student or teacher" ON public.daily_activity_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.platform_accounts pa
            WHERE pa.id = daily_activity_snapshots.platform_account_id
              AND (pa.student_id = public.current_user_profile_id()
                   OR public.is_student_in_teacher_classrooms(pa.student_id)
                   OR public.current_user_role() = 'admin')
        )
    );

CREATE POLICY "Daily activity insertable/updatable" ON public.daily_activity_snapshots
    FOR ALL USING (true);

CREATE POLICY "Contests viewable by student or teacher" ON public.contest_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.platform_accounts pa
            WHERE pa.id = contest_records.platform_account_id
              AND (pa.student_id = public.current_user_profile_id()
                   OR public.is_student_in_teacher_classrooms(pa.student_id)
                   OR public.current_user_role() = 'admin')
        )
    );

CREATE POLICY "Contests insertable/updatable" ON public.contest_records
    FOR ALL USING (true);

-- ----------------------------------------------------
-- 6. SCAN JOBS & ITEMS POLICIES
-- ----------------------------------------------------
CREATE POLICY "Scan jobs viewable by requester or enrolled students" ON public.scan_jobs
    FOR SELECT USING (
        requested_by = public.current_user_profile_id()
        OR (classroom_id IS NOT NULL AND public.is_enrolled_in_classroom(classroom_id))
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "Teachers can create scan jobs" ON public.scan_jobs
    FOR INSERT WITH CHECK (
        (public.current_user_role() IN ('teacher', 'admin'))
        AND requested_by = public.current_user_profile_id()
    );

CREATE POLICY "Scan jobs updatable by requester or worker" ON public.scan_jobs
    FOR UPDATE USING (
        requested_by = public.current_user_profile_id()
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "Scan items viewable by scan job viewers" ON public.scan_job_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.scan_jobs sj
            WHERE sj.id = scan_job_items.scan_job_id
              AND (sj.requested_by = public.current_user_profile_id()
                   OR (sj.classroom_id IS NOT NULL AND public.is_enrolled_in_classroom(sj.classroom_id))
                   OR public.current_user_role() = 'admin')
        )
    );

CREATE POLICY "Scan items insertable/updatable" ON public.scan_job_items
    FOR ALL USING (true);

-- ----------------------------------------------------
-- 7. AUDIT LOGS POLICIES
-- ----------------------------------------------------
CREATE POLICY "Audit logs viewable by actor or admin" ON public.audit_logs
    FOR SELECT USING (
        user_id = public.current_user_profile_id()
        OR public.current_user_role() = 'admin'
    );

CREATE POLICY "Audit logs insertable" ON public.audit_logs
    FOR INSERT WITH CHECK (true);
