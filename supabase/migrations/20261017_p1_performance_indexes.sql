-- ====================================================================
-- CodeTrack: P1 Performance Optimization Indexes & Materialized Views
-- Version: 20261017_p1_performance_indexes.sql
-- ====================================================================

-- 1. Fast foreign key lookup and cascade performance for scan jobs and snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_scan_job_id 
    ON public.platform_profile_snapshots(scan_job_id);

CREATE INDEX IF NOT EXISTS idx_scan_job_items_platform_account 
    ON public.scan_job_items(platform_account_id);

-- 2. Fast active scan debouncing on student scans
CREATE INDEX IF NOT EXISTS idx_scan_jobs_target_status 
    ON public.scan_jobs(target_student_id, status);

-- 3. Composite index for scheduled auto-scan sweeps on completed contests
CREATE INDEX IF NOT EXISTS idx_contests_auto_scan 
    ON public.contests(status, scan_status, end_time);

-- 4. Lightweight view of latest platform snapshot per account (excluding raw_data JSONB)
CREATE OR REPLACE VIEW public.v_latest_platform_snapshots AS
SELECT DISTINCT ON (platform_account_id)
    id,
    platform_account_id,
    scan_job_id,
    total_solved,
    easy_solved,
    medium_solved,
    hard_solved,
    total_questions,
    total_submissions,
    accepted_submissions,
    acceptance_rate,
    global_rank,
    country_rank,
    contest_rating,
    highest_rating,
    highest_score,
    contests_attended,
    source,
    source_version,
    validation_status,
    observed_at
FROM public.platform_profile_snapshots
ORDER BY platform_account_id, observed_at DESC;
