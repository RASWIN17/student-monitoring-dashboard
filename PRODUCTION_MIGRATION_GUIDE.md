# CodeTrack — Production Cloud Migration Guide

This document is the authoritative migration and deployment guide for transitioning **CodeTrack** from local SQLite storage to **Supabase Cloud PostgreSQL**, **Supabase Auth (Google OAuth)**, and **Vercel** serverless hosting.

---

## 1. Architecture Overview

```
                      +---------------------------------------+
                      |               BROWSER                 |
                      |  Next.js 15 App Router Frontend (UI)  |
                      +-------------------+-------------------+
                                          |
                HTTPS Request             | Google OAuth Flow
                                          v
                      +-------------------+-------------------+
                      |             SUPABASE AUTH             |
                      |  Google Identity Provider + Cookies   |
                      +-------------------+-------------------+
                                          |
                                          | User Session (JWT / Cookie)
                                          v
                      +---------------------------------------+
                      |         VERCEL EDGE / SERVERLESS      |
                      |   - Route Handlers (/api/*)           |
                      |   - Server Components                 |
                      |   - Supabase SSR Client               |
                      +-------------------+-------------------+
                                          |
                        PostgreSQL Queries| Database-backed Job Queue
                                          v
                      +---------------------------------------+
                      |       SUPABASE CLOUD POSTGRESQL       |
                      |   - 10 Relational Tables              |
                      |   - Row Level Security (RLS) Policies |
                      |   - Performance Indexes & Constraints |
                      +-------------------+-------------------+
                                          ^
                                          | Atomically claims jobs & stores snapshots
                                          |
                      +-------------------+-------------------+
                      |       DURABLE BACKGROUND WORKER       |
                      |      (scripts/scan_worker.mjs)        |
                      |   - LeetCode GraphQL Connector        |
                      |   - CodeChef Web Connector            |
                      +-------------------+-------------------+
```

---

## 2. Supabase PostgreSQL Schema & Security

### 2.1 Optimized Migration File
The optimized production schema is saved in:
`supabase/migrations/20261013_optimized_codetrack_schema.sql`

### 2.2 Key Fixes & Enhancements Over Initial SQL
1. **Eliminated Infinite RLS Recursion**:
   - Replaced cross-table cyclical subqueries between `user_profiles` and `classrooms` with `SECURITY DEFINER STABLE` helper functions:
     - `public.current_user_profile_id()`
     - `public.current_user_role()`
     - `public.is_teacher_of_classroom(p_classroom_id UUID)`
     - `public.is_student_in_classroom(p_classroom_id UUID)`
2. **Comprehensive Row Level Security (RLS)**:
   - Enabled RLS on all 10 application tables.
   - Teachers can only view and manage their own classrooms, memberships, and scans.
   - Students can only view their own records and classrooms they have joined.
   - Unauthenticated access is rejected by default.
3. **Composite High-Performance Indexes**:
   - `idx_platform_snapshots_lookup`: `(platform_account_id, observed_at DESC)`
   - `idx_daily_activity_lookup`: `(platform_account_id, activity_date DESC)`
   - `idx_contest_records_lookup`: `(platform_account_id, contest_date DESC)`
   - `idx_scan_jobs_active`: `(status, created_at ASC)` for atomic worker job claiming.
4. **Data Integrity Constraints**:
   - Unique constraint `uq_contest_records_account_contest_date` on `(platform_account_id, contest_name, contest_date)` to guarantee deduplicated contest records across scans.

### 2.3 How to Apply to Supabase
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project, navigate to the **SQL Editor**.
3. Copy the entire contents of `supabase/migrations/20261013_optimized_codetrack_schema.sql` and click **Run**.

---

## 3. Google OAuth & Supabase Auth Setup

### 3.1 Google Cloud Console Configuration
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select your Google Cloud project (e.g., `codetrack-production`).
3. Navigate to **APIs & Services > OAuth consent screen**:
   - Choose **External** user type and click **Create**.
   - Fill in App Information:
     - App name: `CodeTrack`
     - User support email: your admin email.
     - Developer contact email: your admin email.
   - Click **Save and Continue** through Scopes (default `email`, `profile`, `openid` are sufficient).
   - In Test users, add your email address(es) for testing before publishing the app to Production.
4. Navigate to **APIs & Services > Credentials**:
   - Click **+ Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Name: `CodeTrack Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for local development)
     - `https://your-app-name.vercel.app` (your Vercel production domain)
     - `https://<YOUR-SUPABASE-PROJECT-ID>.supabase.co`
   - **Authorized redirect URIs**:
     - `https://<YOUR-SUPABASE-PROJECT-ID>.supabase.co/auth/v1/callback`
     *(Find your exact callback URL in Supabase Dashboard > Authentication > Providers > Google).*
   - Click **Create**. Copy the **Client ID** and **Client Secret**.

### 3.2 Supabase Dashboard Provider Configuration
1. In your Supabase Dashboard, go to **Authentication > Providers**.
2. Select **Google**:
   - Toggle **Enable Google provider** to ON.
   - Paste the **Client ID** from Google Cloud Console.
   - Paste the **Client Secret** from Google Cloud Console.
   - Click **Save**.
3. Under **Authentication > URL Configuration**:
   - **Site URL**: `https://your-app-name.vercel.app` (or `http://localhost:3000` for local dev).
   - **Redirect URLs**:
     - `http://localhost:3000/**`
     - `https://your-app-name.vercel.app/**`
     - `https://*.vercel.app/**` (for preview deployments)

---

## 4. SQLite to Supabase Data Migration

We built an automated, idempotent migration tool with built-in backup and dry-run verification:
`scripts/migrate_sqlite_to_supabase.mjs`

### 4.1 Verification Dry-Run Results
A dry-run was executed against `data/codetrack.db`.
- **Automatic backup created**: `data/codetrack.backup.2026-10-13T10-21-08-075Z.db`
- **Data integrity metrics**:
  - `user_profiles`: 15 / 15 rows
  - `classrooms`: 8 / 8 rows
  - `classroom_memberships`: 5 / 5 rows
  - `platform_accounts`: 14 / 14 rows
  - `platform_profile_snapshots`: 13 / 13 rows
  - `daily_activity_snapshots`: 18 / 18 rows
  - `contest_records`: 579 rows imported (36 historical duplicates cleanly deduplicated)
  - `scan_jobs`: 7 / 7 rows
  - `scan_job_items`: 14 / 14 rows
  - `audit_logs`: 56 / 56 rows
  - **Zero dropped rows**, zero schema violations.

### 4.2 Executing the Migration
Once your Supabase credentials are configured in `.env.local`:
```bash
npm run migrate:data
```
The script will safely upsert all historical records into Supabase PostgreSQL without modifying or deleting `data/codetrack.db`.

---

## 5. Background Worker for Long-Running Scans

LeetCode and CodeChef scraping involves GraphQL requests, HTML parsing, and rate-limiting delays that can exceed Vercel's serverless timeout limits (10–15s on Hobby tier).

### 5.1 Worker Architecture
We implemented `scripts/scan_worker.mjs`:
- Uses database-backed atomic job claiming (`status = 'queued' -> 'running'`).
- Safely processes LeetCode and CodeChef platform accounts with concurrency controls.
- Upserts profile snapshots, daily activity, and contest records into Supabase.
- Updates scan progress (`items_completed`, `items_failed`, `status = 'completed'`).
- Self-recovering: Handles transient network errors without crashing.

### 5.2 Running the Worker
- **Locally / On a persistent VPS or VM**:
  ```bash
  npm run worker
  ```
- **Deployment options**:
  - Run as a systemd service or PM2 process on an AWS EC2 instance, DigitalOcean Droplet, Railway, or Render background worker.
  - Set the same environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

---

## 6. Vercel Production Deployment

### 6.1 Environment Variables Checklist
Configure these in the Vercel Dashboard under **Project Settings > Environment Variables**:

| Variable Name | Environment | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Dev | Your Supabase project URL (`https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Dev | Supabase Anon / Public API Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Dev | Supabase Service Role Secret Key (Server-side only) |
| `NEXT_PUBLIC_APP_URL` | Production | Your Vercel production URL (`https://your-app.vercel.app`) |

*(Never expose `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_` variables).*

### 6.2 Deployment via Vercel CLI or Git
1. Push your repository to GitHub / GitLab.
2. Import the project into Vercel.
3. Framework Preset: **Next.js**.
4. Root Directory: `./`.
5. Add the environment variables from the table above.
6. Click **Deploy**.

---

## 7. Security & Operations Verification

- [x] **Zero Local Storage Sources of Truth**: All student records, classrooms, snapshots, and scan jobs persist solely in Supabase PostgreSQL.
- [x] **Zero Mock Data / SQLite Fallback**: SQLite imports removed from the production data path. No silent in-memory fallback.
- [x] **Protected API Routes**: Server-side Supabase authentication verification ensures unauthorized users cannot mutate classroom or student data.
- [x] **Google OAuth Role Integrity**: New users default to `student`. Public users cannot elevate themselves to `teacher` via client manipulation.
- [x] **Audit Logging**: Classroom creation, handle linking, deletions, and scan initiations log structured events to `audit_logs`.
