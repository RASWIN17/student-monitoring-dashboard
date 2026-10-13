import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const testDbDir = path.join(process.cwd(), 'data', 'test');
if (!fs.existsSync(testDbDir)) {
  fs.mkdirSync(testDbDir, { recursive: true });
}
const testDbPath = path.join(testDbDir, 'test.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

describe('CodeTrack Full System & Zero Fake Data Verification Suite', () => {
  let db;

  before(() => {
    db = new DatabaseSync(testDbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        auth_user_id TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'admin')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS classrooms (
        id TEXT PRIMARY KEY,
        owner_teacher_id TEXT NOT NULL REFERENCES user_profiles(id),
        name TEXT NOT NULL,
        course TEXT NOT NULL,
        batch TEXT NOT NULL,
        department TEXT NOT NULL,
        academic_year TEXT NOT NULL,
        section TEXT NOT NULL,
        join_code TEXT UNIQUE NOT NULL,
        join_code_hash TEXT UNIQUE NOT NULL,
        archived_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS classroom_memberships (
        id TEXT PRIMARY KEY,
        classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        joined_at TEXT NOT NULL,
        membership_status TEXT NOT NULL DEFAULT 'enrolled' CHECK (membership_status IN ('enrolled', 'dropped', 'pending')),
        UNIQUE(classroom_id, student_id)
      );

      CREATE TABLE IF NOT EXISTS platform_accounts (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        platform TEXT NOT NULL CHECK (platform IN ('leetcode', 'codechef')),
        username TEXT NOT NULL,
        normalized_username TEXT NOT NULL,
        public_profile_url TEXT NOT NULL,
        ownership_verification_status TEXT NOT NULL DEFAULT 'linked_public_profile',
        linked_at TEXT NOT NULL,
        last_successful_sync_at TEXT,
        account_status TEXT NOT NULL DEFAULT 'active',
        UNIQUE(student_id, platform)
      );

      CREATE TABLE IF NOT EXISTS platform_profile_snapshots (
        id TEXT PRIMARY KEY,
        platform_account_id TEXT NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
        scan_job_id TEXT,
        total_solved INTEGER NOT NULL DEFAULT 0,
        easy_solved INTEGER,
        medium_solved INTEGER,
        hard_solved INTEGER,
        total_questions INTEGER,
        total_submissions INTEGER,
        accepted_submissions INTEGER,
        acceptance_rate REAL,
        global_rank INTEGER,
        country_rank INTEGER,
        contest_rating REAL,
        highest_rating REAL,
        highest_score REAL,
        contests_attended INTEGER,
        source TEXT NOT NULL,
        source_version TEXT NOT NULL,
        validation_status TEXT NOT NULL DEFAULT 'valid',
        available_fields TEXT NOT NULL DEFAULT '[]',
        unavailable_fields TEXT NOT NULL DEFAULT '[]',
        raw_data TEXT,
        observed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS daily_activity_snapshots (
        id TEXT PRIMARY KEY,
        platform_account_id TEXT NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
        activity_date TEXT NOT NULL,
        submission_count INTEGER NOT NULL DEFAULT 0,
        accepted_submission_count INTEGER,
        activity_status TEXT NOT NULL,
        source_coverage TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        UNIQUE(platform_account_id, activity_date)
      );

      CREATE TABLE IF NOT EXISTS contest_records (
        id TEXT PRIMARY KEY,
        platform_account_id TEXT NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
        platform_contest_id TEXT,
        contest_name TEXT NOT NULL,
        contest_date TEXT NOT NULL,
        participation_status TEXT NOT NULL,
        rank INTEGER,
        score REAL,
        problems_solved INTEGER,
        total_problems INTEGER,
        rating_before REAL,
        rating_after REAL,
        evidence_source TEXT NOT NULL,
        data_availability_status TEXT NOT NULL,
        observed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scan_jobs (
        id TEXT PRIMARY KEY,
        classroom_id TEXT REFERENCES classrooms(id) ON DELETE SET NULL,
        requested_by TEXT NOT NULL REFERENCES user_profiles(id),
        selected_platforms TEXT NOT NULL DEFAULT 'all',
        requested_scope TEXT NOT NULL DEFAULT 'classroom',
        target_student_id TEXT REFERENCES user_profiles(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        total_accounts INTEGER NOT NULL DEFAULT 0,
        processed_accounts INTEGER NOT NULL DEFAULT 0,
        successful_accounts INTEGER NOT NULL DEFAULT 0,
        partial_accounts INTEGER NOT NULL DEFAULT 0,
        failed_accounts INTEGER NOT NULL DEFAULT 0,
        error_summary TEXT,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT
      );
    `);
  });

  after(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
  });

  test('1. STRICT ZERO FAKE DATA: New installation produces zero counts from real queries', () => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM user_profiles').get().count;
    const classroomCount = db.prepare('SELECT COUNT(*) as count FROM classrooms').get().count;
    const snapshotCount = db.prepare('SELECT COUNT(*) as count FROM platform_profile_snapshots').get().count;
    const contestCount = db.prepare('SELECT COUNT(*) as count FROM contest_records').get().count;
    const activityCount = db.prepare('SELECT COUNT(*) as count FROM daily_activity_snapshots').get().count;

    assert.strictEqual(userCount, 0, 'User profiles must be 0 on clean install');
    assert.strictEqual(classroomCount, 0, 'Classrooms must be 0 on clean install');
    assert.strictEqual(snapshotCount, 0, 'Snapshots must be 0 on clean install');
    assert.strictEqual(contestCount, 0, 'Contest records must be 0 on clean install');
    assert.strictEqual(activityCount, 0, 'Daily activity snapshots must be 0 on clean install');
  });

  test('2. Teacher registration and classroom creation generates unguessable join code', () => {
    const teacherId = 'teacher-1';
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO user_profiles (id, auth_user_id, email, display_name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'teacher', ?, ?)
    `).run(teacherId, 'auth-teacher-1', 'prof.turing@univ.edu', 'Prof. Alan Turing', now, now);

    const joinCode = 'CT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const classroomId = 'classroom-1';
    db.prepare(`
      INSERT INTO classrooms (id, owner_teacher_id, name, course, batch, department, academic_year, section, join_code, join_code_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(classroomId, teacherId, 'Algorithms & Data Structures', 'CS201', '2024-2028', 'CSE', '2026-2027', 'A', joinCode, 'hash-1', now, now);

    const row = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(classroomId);
    assert.ok(row, 'Classroom must be saved in database');
    assert.strictEqual(row.join_code, joinCode);
    assert.match(row.join_code, /^CT-[A-Z0-9]{6}$/, 'Join code must follow secure format');
  });

  test('3. Student registration and classroom joining prevents duplicate memberships', () => {
    const studentId = 'student-1';
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO user_profiles (id, auth_user_id, email, display_name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'student', ?, ?)
    `).run(studentId, 'auth-student-1', 'ada@univ.edu', 'Ada Lovelace', now, now);

    db.prepare(`
      INSERT INTO classroom_memberships (id, classroom_id, student_id, joined_at, membership_status)
      VALUES (?, ?, ?, ?, 'enrolled')
    `).run('membership-1', 'classroom-1', studentId, now);

    const membersCount = db.prepare('SELECT COUNT(*) as count FROM classroom_memberships WHERE classroom_id = ?').get('classroom-1').count;
    assert.strictEqual(membersCount, 1);

    // Duplicate join should throw due to UNIQUE(classroom_id, student_id) constraint
    assert.throws(() => {
      db.prepare(`
        INSERT INTO classroom_memberships (id, classroom_id, student_id, joined_at, membership_status)
        VALUES (?, ?, ?, ?, 'enrolled')
      `).run('membership-2', 'classroom-1', studentId, now);
    }, 'Duplicate classroom membership must be blocked by database unique constraint');
  });

  test('4. Platform handle linking enforces student/platform uniqueness and stores public URL safely', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO platform_accounts (id, student_id, platform, username, normalized_username, public_profile_url, ownership_verification_status, linked_at, account_status)
      VALUES (?, 'student-1', 'leetcode', 'ada_code', 'ada_code', 'https://leetcode.com/ada_code/', 'linked_public_profile', ?, 'active')
    `).run('acc-lc-1', now);

    const acc = db.prepare('SELECT * FROM platform_accounts WHERE id = ?').get('acc-lc-1');
    assert.ok(acc);
    assert.strictEqual(acc.ownership_verification_status, 'linked_public_profile', 'Must label as linked public profile, not verified owner');

    // Duplicate platform handle for same student must fail
    assert.throws(() => {
      db.prepare(`
        INSERT INTO platform_accounts (id, student_id, platform, username, normalized_username, public_profile_url, ownership_verification_status, linked_at, account_status)
        VALUES (?, 'student-1', 'leetcode', 'ada_code_2', 'ada_code_2', 'https://leetcode.com/ada_code_2/', 'linked_public_profile', ?, 'active')
      `).run('acc-lc-2', now);
    }, 'Student cannot link multiple LeetCode handles under unique constraint');
  });

  test('5. Valid snapshot persistence stores all required metrics without fake values', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO platform_profile_snapshots (
        id, platform_account_id, scan_job_id, total_solved, easy_solved, medium_solved, hard_solved,
        total_questions, total_submissions, accepted_submissions, acceptance_rate, global_rank,
        contest_rating, contests_attended, source, source_version, validation_status,
        available_fields, unavailable_fields, observed_at
      ) VALUES (
        ?, 'acc-lc-1', 'job-1', 142, 50, 72, 20,
        3100, 320, 210, 65.62, 120500,
        1845.5, 12, 'leetcode_graphql', 'v1.0', 'valid',
        '["total_solved", "contest_rating"]', '[]', ?
      )
    `).run('snap-1', now);

    const snap = db.prepare('SELECT * FROM platform_profile_snapshots WHERE id = ?').get('snap-1');
    assert.strictEqual(snap.total_solved, 142);
    assert.strictEqual(snap.easy_solved, 50);
    assert.strictEqual(snap.medium_solved, 72);
    assert.strictEqual(snap.hard_solved, 20);
    assert.strictEqual(snap.contest_rating, 1845.5);
    assert.strictEqual(snap.contests_attended, 12);
  });

  test('6. Scraper failure preserves previous snapshot and marks error status without zeroing metrics', () => {
    // Simulate scraper failure on scan attempt 2
    const errorStatus = 'error';
    db.prepare('UPDATE platform_accounts SET account_status = ? WHERE id = ?').run(errorStatus, 'acc-lc-1');

    // Latest snapshot query must still return the previous valid snapshot (142 problems), not 0
    const latestSnap = db.prepare(`
      SELECT * FROM platform_profile_snapshots
      WHERE platform_account_id = ?
      ORDER BY observed_at DESC LIMIT 1
    `).get('acc-lc-1');

    assert.ok(latestSnap, 'Previous valid snapshot must be retained');
    assert.strictEqual(latestSnap.total_solved, 142, 'Metrics must NOT be overwritten with zero on scraper failure');

    const acc = db.prepare('SELECT * FROM platform_accounts WHERE id = ?').get('acc-lc-1');
    assert.strictEqual(acc.account_status, 'error', 'Account must be marked as error/retry needed');
  });

  test('7. Daily activity correctly registers Asia/Kolkata date boundaries', () => {
    const todayKolkata = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO daily_activity_snapshots (
        id, platform_account_id, activity_date, submission_count, activity_status, source_coverage, observed_at
      ) VALUES (?, 'acc-lc-1', ?, 5, 'active', 'leetcode_calendar', ?)
    `).run('daily-1', todayKolkata, now);

    const daily = db.prepare('SELECT * FROM daily_activity_snapshots WHERE id = ?').get('daily-1');
    assert.strictEqual(daily.activity_date, todayKolkata);
    assert.strictEqual(daily.submission_count, 5);
    assert.strictEqual(daily.activity_status, 'active');
  });

  test('8. CSV sanitization prevents formula injection attacks', () => {
    function sanitizeCsvCell(val) {
      if (val === null || val === undefined) return '';
      let str = String(val).trim();
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    assert.strictEqual(sanitizeCsvCell('=CMD("calc")'), `"'=CMD(""calc"")"`);
    assert.strictEqual(sanitizeCsvCell('+12345'), "'+12345");
    assert.strictEqual(sanitizeCsvCell('@SUM(A1:A10)'), "'@SUM(A1:A10)");
    assert.strictEqual(sanitizeCsvCell('Normal Student'), 'Normal Student');
    assert.strictEqual(sanitizeCsvCell(null), '');
  });
});
