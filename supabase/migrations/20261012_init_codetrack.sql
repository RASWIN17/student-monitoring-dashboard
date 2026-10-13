-- ====================================================================
-- CodeTrack: Real-Time Student Coding Activity Monitor
-- Supabase PostgreSQL Relational Schema & Row Level Security (RLS)
-- ZERO FAKE DATA MANDATE: Strict schema constraints and audit logs
-- ====================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USER PROFILES
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth ON user_profiles(auth_user_id);

-- 2. CLASSROOMS
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
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

CREATE INDEX IF NOT EXISTS idx_classrooms_owner ON classrooms(owner_teacher_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code ON classrooms(join_code);

-- 3. CLASSROOM MEMBERSHIPS
CREATE TABLE IF NOT EXISTS classroom_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    membership_status TEXT NOT NULL DEFAULT 'enrolled' CHECK (membership_status IN ('enrolled', 'dropped', 'pending')),
    CONSTRAINT uq_classroom_student UNIQUE (classroom_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_classroom ON classroom_memberships(classroom_id);
CREATE INDEX IF NOT EXISTS idx_memberships_student ON classroom_memberships(student_id);

-- 4. PLATFORM ACCOUNTS
CREATE TABLE IF NOT EXISTS platform_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_platform_accounts_student ON platform_accounts(student_id);
CREATE INDEX IF NOT EXISTS idx_platform_accounts_platform ON platform_accounts(platform);

-- 5. PLATFORM PROFILE SNAPSHOTS
CREATE TABLE IF NOT EXISTS platform_profile_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_account_id UUID NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_snapshots_account ON platform_profile_snapshots(platform_account_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_observed ON platform_profile_snapshots(observed_at);

-- 6. DAILY ACTIVITY SNAPSHOTS
CREATE TABLE IF NOT EXISTS daily_activity_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_account_id UUID NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    submission_count INTEGER NOT NULL DEFAULT 0,
    accepted_submission_count INTEGER NULL,
    activity_status TEXT NOT NULL CHECK (activity_status IN ('active', 'no_activity', 'unknown', 'stale')),
    source_coverage TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_account_activity_date UNIQUE (platform_account_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_account_date ON daily_activity_snapshots(platform_account_id, activity_date);

-- 7. CONTEST RECORDS
CREATE TABLE IF NOT EXISTS contest_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_account_id UUID NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
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
    observed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_contest_records_account ON contest_records(platform_account_id);
CREATE INDEX IF NOT EXISTS idx_contest_records_date ON contest_records(contest_date);

-- 8. SCAN JOBS
CREATE TABLE IF NOT EXISTS scan_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NULL REFERENCES classrooms(id) ON DELETE SET NULL,
    requested_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    selected_platforms TEXT NOT NULL DEFAULT 'all' CHECK (selected_platforms IN ('all', 'leetcode', 'codechef')),
    requested_scope TEXT NOT NULL DEFAULT 'classroom' CHECK (requested_scope IN ('classroom', 'student')),
    target_student_id UUID NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_scan_jobs_classroom ON scan_jobs(classroom_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_status ON scan_jobs(status);

-- 9. SCAN JOB ITEMS
CREATE TABLE IF NOT EXISTS scan_job_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_job_id UUID NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
    platform_account_id UUID NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('leetcode', 'codechef')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'partial', 'failed')),
    fields_retrieved JSONB NULL,
    missing_fields JSONB NULL,
    error_code TEXT NULL,
    error_message TEXT NULL,
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_scan_job_items_job ON scan_job_items(scan_job_id);

-- 10. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES user_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NULL,
    details JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_profile_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- User Profiles: users can read their own profile; teachers can read profiles of enrolled students
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid()::text = auth_user_id);

CREATE POLICY "Teachers can view enrolled students profile" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classrooms c
            JOIN classroom_memberships m ON m.classroom_id = c.id
            JOIN user_profiles teacher_profile ON teacher_profile.id = c.owner_teacher_id
            WHERE m.student_id = user_profiles.id
              AND teacher_profile.auth_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid()::text = auth_user_id);

-- Classrooms: Teachers can manage own classrooms; enrolled students can read active classrooms
CREATE POLICY "Teachers manage own classrooms" ON classrooms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = classrooms.owner_teacher_id
              AND up.auth_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Students view joined classrooms" ON classrooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classroom_memberships m
            JOIN user_profiles up ON up.id = m.student_id
            WHERE m.classroom_id = classrooms.id
              AND up.auth_user_id = auth.uid()::text
        )
    );

-- Platform Accounts: Students manage own; Teachers view their classroom students' accounts
CREATE POLICY "Students manage own platform accounts" ON platform_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = platform_accounts.student_id
              AND up.auth_user_id = auth.uid()::text
        )
    );

CREATE POLICY "Teachers view platform accounts in classroom" ON platform_accounts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM classrooms c
            JOIN classroom_memberships m ON m.classroom_id = c.id
            JOIN user_profiles up ON up.id = c.owner_teacher_id
            WHERE m.student_id = platform_accounts.student_id
              AND up.auth_user_id = auth.uid()::text
        )
    );

-- Scan Jobs: Teachers manage scans they requested for their classrooms
CREATE POLICY "Teachers manage their scan jobs" ON scan_jobs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = scan_jobs.requested_by
              AND up.auth_user_id = auth.uid()::text
        )
    );
