-- ====================================================================
-- CodeTrack: Contests & Scheduled Contest Scanning Migration
-- Version: 20261014_contests_system.sql
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.contests (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('leetcode', 'codechef')),
    contest_code TEXT NOT NULL,
    title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_seconds INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed')),
    card_image_url TEXT NULL,
    scan_status TEXT NOT NULL DEFAULT 'not_started' CHECK (scan_status IN ('not_started', 'scheduled', 'scanning', 'completed', 'retrying', 'failed')),
    last_scanned_at TIMESTAMPTZ NULL,
    scan_message TEXT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_contests_platform_code UNIQUE (platform, contest_code)
);

CREATE INDEX IF NOT EXISTS idx_contests_platform_status ON public.contests(platform, status);
CREATE INDEX IF NOT EXISTS idx_contests_start_time ON public.contests(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_contests_end_time ON public.contests(end_time);

ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contests are viewable by authenticated users" ON public.contests
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Contests insertable by admin/service role" ON public.contests
    FOR ALL TO service_role
    USING (true);
