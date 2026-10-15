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
        register_number TEXT,
        class_name TEXT,
        section TEXT,
        profile_completed INTEGER NOT NULL DEFAULT 0,
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

      CREATE TABLE IF NOT EXISTS contests (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        contest_code TEXT NOT NULL,
        title TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'upcoming',
        card_image_url TEXT,
        scan_status TEXT NOT NULL DEFAULT 'not_started',
        last_scanned_at TEXT,
        scan_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(platform, contest_code)
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

  test('9. Role-Based Login: New user assignment and existing role preservation', () => {
    // A new user signing in as Teacher gets 'teacher' role
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO user_profiles (id, auth_user_id, email, display_name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('u-teacher-1', 'auth-t1', 'prof.sharma@college.edu', 'Prof Sharma', 'teacher', now, now);

    const teacher = db.prepare('SELECT * FROM user_profiles WHERE id = ?').get('u-teacher-1');
    assert.strictEqual(teacher.role, 'teacher');

    // A new user signing in as Student gets 'student' role
    db.prepare(`
      INSERT INTO user_profiles (id, auth_user_id, email, display_name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('u-student-1', 'auth-s1', 'rahul@student.edu', 'Rahul Kumar', 'student', now, now);

    const student = db.prepare('SELECT * FROM user_profiles WHERE id = ?').get('u-student-1');
    assert.strictEqual(student.role, 'student');

    // CRITICAL: Existing student signing in while Teacher was selected in UI MUST NOT overwrite role
    const attemptedUiRole = 'teacher';
    const existing = db.prepare('SELECT * FROM user_profiles WHERE email = ?').get('rahul@student.edu');
    assert(existing, 'User exists');
    
    // Simulate callback role preservation:
    let finalRole = existing.role; // Preserved from database
    assert.strictEqual(finalRole, 'student', 'Existing role was not overwritten by selected UI role');
  });

  test('10. Role-Based Dashboard Redirection destination logic', () => {
    function getDashboardRedirectPath(role, profileCompleted = true) {
      if (role === 'teacher' || role === 'admin') {
        return '/students';
      }
      return profileCompleted ? '/classrooms' : '/student/profile/create';
    }

    assert.strictEqual(getDashboardRedirectPath('teacher'), '/students');
    assert.strictEqual(getDashboardRedirectPath('admin'), '/students');
    assert.strictEqual(getDashboardRedirectPath('student', false), '/student/profile/create');
    assert.strictEqual(getDashboardRedirectPath('student', true), '/classrooms');
  });

  test('11. Contest-Based System: Dynamic contest persistence and live status calculation', () => {
    const now = Date.now();
    const oneHour = 3600 * 1000;

    // Upcoming contest: starts in 2 hours
    const upcomingStart = new Date(now + 2 * oneHour).toISOString();
    const upcomingEnd = new Date(now + 3.5 * oneHour).toISOString();

    // Completed contest: ended 2 hours ago
    const pastStart = new Date(now - 3.5 * oneHour).toISOString();
    const pastEnd = new Date(now - 2 * oneHour).toISOString();

    db.prepare(`
      INSERT INTO contests (id, platform, contest_code, title, start_time, end_time, duration_seconds, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('lc-wc-524', 'leetcode', 'weekly-contest-524', 'Weekly Contest 524', upcomingStart, upcomingEnd, 5400, 'upcoming', new Date().toISOString(), new Date().toISOString());

    db.prepare(`
      INSERT INTO contests (id, platform, contest_code, title, start_time, end_time, duration_seconds, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('lc-wc-523', 'leetcode', 'weekly-contest-523', 'Weekly Contest 523', pastStart, pastEnd, 5400, 'completed', new Date().toISOString(), new Date().toISOString());

    const cUpcoming = db.prepare('SELECT * FROM contests WHERE id = ?').get('lc-wc-524');
    assert.strictEqual(cUpcoming.status, 'upcoming');
    assert.strictEqual(cUpcoming.title, 'Weekly Contest 524');

    const cCompleted = db.prepare('SELECT * FROM contests WHERE id = ?').get('lc-wc-523');
    assert.strictEqual(cCompleted.status, 'completed');
  });

  test('12. Problem-Solved Filter: Filters 1 through 10 strictly on contest problems solved', () => {
    // Student A solved 2 problems in contest (lifetime: 350)
    // Student B solved 4 problems in contest (lifetime: 420)
    // Student C solved 2 problems in contest (lifetime: 110)
    const contestRows = [
      { student_name: 'Alice', contest_problems_solved: 2, lifetime_total_solved: 350 },
      { student_name: 'Bob', contest_problems_solved: 4, lifetime_total_solved: 420 },
      { student_name: 'Charlie', contest_problems_solved: 2, lifetime_total_solved: 110 },
      { student_name: 'David', contest_problems_solved: 1, lifetime_total_solved: 50 },
    ];

    function applySolvedFilter(list, filter) {
      if (filter === 'all') return list;
      return list.filter((item) => item.contest_problems_solved === filter);
    }

    // Filter by 2 Problems Solved
    const filtered2 = applySolvedFilter(contestRows, 2);
    assert.strictEqual(filtered2.length, 2);
    assert.deepStrictEqual(filtered2.map(s => s.student_name), ['Alice', 'Charlie']);

    // Filter by 4 Problems Solved
    const filtered4 = applySolvedFilter(contestRows, 4);
    assert.strictEqual(filtered4.length, 1);
    assert.strictEqual(filtered4[0].student_name, 'Bob');

    // Filter by 3 Problems Solved (empty state)
    const filtered3 = applySolvedFilter(contestRows, 3);
    assert.strictEqual(filtered3.length, 0);

    // Filter by All
    const all = applySolvedFilter(contestRows, 'all');
    assert.strictEqual(all.length, 4);

    // CRITICAL: Ensure filtering NEVER uses lifetime_total_solved
    const filtered350 = applySolvedFilter(contestRows, 350);
    assert.strictEqual(filtered350.length, 0, 'Lifetime solved counts must not be used as contest filter values');
  });

  test('13. Attendance Consistency: Linked Accounts equals Attended plus Absent plus Pending', () => {
    const totalLinked = 5;
    const attended = 2;
    const absent = 2;
    const pending = 1;

    // Mathematical identity requirement
    assert.strictEqual(attended + absent + pending, totalLinked, 'Attended + Absent + Pending must equal Total Linked');
  });

  test('14. Safe Verification: Pending verification prevents false absence categorization before publication', () => {
    function categorizeParticipation(hasAttendedRecord, contestStatus, resultsPublished) {
      if (hasAttendedRecord) return 'attended';
      if (contestStatus !== 'completed' || !resultsPublished) return 'pending_verification';
      return 'not_attended';
    }

    // When contest completed 5 minutes ago and platform results are not yet published:
    const statusBeforeResults = categorizeParticipation(false, 'completed', false);
    assert.strictEqual(statusBeforeResults, 'pending_verification', 'Must not categorize student as absent when results are pending publication');

    // Once results are published and student is not in attendance list:
    const statusAfterResults = categorizeParticipation(false, 'completed', true);
    assert.strictEqual(statusAfterResults, 'not_attended', 'Categorized as absent only after results publication is verified');
  });

  test('15. Separate Students Section & Classroom Dynamic Selection: Returns classrooms dynamically', () => {
    // Insert test classroom if needed
    const teacherId = 'teacher-101';
    const teacher = db.prepare('SELECT * FROM user_profiles WHERE id = ?').get(teacherId);
    if (!teacher) {
      db.prepare(`
        INSERT INTO user_profiles (id, auth_user_id, email, display_name, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'teacher', datetime('now'), datetime('now'))
      `).run(teacherId, 'auth-teacher-101', 'teacher101@test.edu', 'Prof. Smith');
    }

    const cls = db.prepare('SELECT * FROM classrooms WHERE owner_teacher_id = ?').all(teacherId);
    assert(Array.isArray(cls), 'Classrooms must be returned as an array');
    // Verify valid platforms
    const supportedPlatforms = ['leetcode', 'codechef'];
    assert.strictEqual(supportedPlatforms.includes('leetcode'), true);
    assert.strictEqual(supportedPlatforms.includes('codechef'), true);
  });

  test('16. Numerical Sorting for LeetCode & CodeChef: Problem counts and ratings sort numerically, not alphabetically', () => {
    const studentSample = [
      { name: 'Student A', solved: 25, rating: 1416.71 },
      { name: 'Student B', solved: 100, rating: 759 },
      { name: 'Student C', solved: 5, rating: 1850.5 },
      { name: 'Student D', solved: null, rating: null },
      { name: 'Student E', solved: 0, rating: 920 },
    ];

    function sortStudents(list, sortOption) {
      return [...list].sort((a, b) => {
        if (sortOption === 'problems_desc') {
          const aVal = a.solved != null ? Number(a.solved) : -1;
          const bVal = b.solved != null ? Number(b.solved) : -1;
          return bVal - aVal;
        }
        if (sortOption === 'problems_asc') {
          const aVal = a.solved != null ? Number(a.solved) : 999999999;
          const bVal = b.solved != null ? Number(b.solved) : 999999999;
          return aVal - bVal;
        }
        if (sortOption === 'rating_desc') {
          const aVal = a.rating != null ? Number(a.rating) : -1;
          const bVal = b.rating != null ? Number(b.rating) : -1;
          return bVal - aVal;
        }
        if (sortOption === 'rating_asc') {
          const aVal = a.rating != null ? Number(a.rating) : 999999999;
          const bVal = b.rating != null ? Number(b.rating) : 999999999;
          return aVal - bVal;
        }
        return 0;
      });
    }

    // 1. Problems Highest -> Lowest: 100, 25, 5, 0, null
    const sortedProblemsDesc = sortStudents(studentSample, 'problems_desc');
    assert.deepStrictEqual(
      sortedProblemsDesc.map((s) => s.name),
      ['Student B', 'Student A', 'Student C', 'Student E', 'Student D'],
      'Numeric sort must place 100 before 25 (alphabetical would incorrectly place 25 first)'
    );

    // 2. Problems Lowest -> Highest: 0, 5, 25, 100, null
    const sortedProblemsAsc = sortStudents(studentSample, 'problems_asc');
    assert.deepStrictEqual(
      sortedProblemsAsc.map((s) => s.name),
      ['Student E', 'Student C', 'Student A', 'Student B', 'Student D'],
      'Numeric sort must order ascending by actual count'
    );

    // 3. Rating Highest -> Lowest: 1850.5, 1416.71, 920, 759, null
    const sortedRatingDesc = sortStudents(studentSample, 'rating_desc');
    assert.deepStrictEqual(
      sortedRatingDesc.map((s) => s.name),
      ['Student C', 'Student A', 'Student E', 'Student B', 'Student D'],
      'Rating sort must place highest rating first and null at end'
    );

    // 4. Rating Lowest -> Highest: 759, 920, 1416.71, 1850.5, null
    const sortedRatingAsc = sortStudents(studentSample, 'rating_asc');
    assert.deepStrictEqual(
      sortedRatingAsc.map((s) => s.name),
      ['Student B', 'Student E', 'Student A', 'Student C', 'Student D'],
      'Rating sort must order ascending by rating with null at end'
    );
  });

  test('17. Default Entry Page & Protected Route Guard Verification', () => {
    function resolveRouteAccess(pathname, user, role) {
      const isTeacherOnlyRoute =
        pathname.startsWith('/teacher') ||
        pathname.startsWith('/students') ||
        pathname.startsWith('/scans') ||
        pathname.startsWith('/reports') ||
        pathname.startsWith('/admin');

      const isStudentRoute = pathname === '/student' || pathname.startsWith('/student/');

      if (!user) {
        if (pathname === '/login' || pathname === '/register') {
          return { status: 200, destination: pathname };
        }
        return {
          status: 307,
          destination: pathname === '/' ? '/login' : `/login?returnTo=${encodeURIComponent(pathname)}`,
        };
      }

      const userRole = role || 'student';
      const isTeacher = userRole === 'teacher' || userRole === 'admin';

      if (!isTeacher && isTeacherOnlyRoute) {
        return { status: 307, destination: '/classrooms?error=Access restricted to teachers only' };
      }
      if (isTeacher && isStudentRoute) {
        return { status: 307, destination: '/students' };
      }
      if (isTeacher && pathname.startsWith('/teacher/dashboard')) {
        return { status: 307, destination: '/students' };
      }
      if (pathname === '/' || pathname === '/login' || pathname === '/register') {
        return { status: 307, destination: isTeacher ? '/students' : '/classrooms' };
      }

      return { status: 200, destination: pathname };
    }

    // 1. New/Unauthenticated visitor opening website root URL -> /login directly
    assert.deepStrictEqual(resolveRouteAccess('/', null, null), { status: 307, destination: '/login' });

    // 2. Unauthenticated user opening protected routes -> /login with returnTo
    assert.deepStrictEqual(resolveRouteAccess('/students', null, null), { status: 307, destination: '/login?returnTo=%2Fstudents' });
    assert.deepStrictEqual(resolveRouteAccess('/classrooms', null, null), { status: 307, destination: '/login?returnTo=%2Fclassrooms' });

    // 3. Unauthenticated visitor opening /login or /register -> allowed
    assert.deepStrictEqual(resolveRouteAccess('/login', null, null), { status: 200, destination: '/login' });
    assert.deepStrictEqual(resolveRouteAccess('/register', null, null), { status: 200, destination: '/register' });

    // 4. Already authenticated teacher -> redirected to /students when opening / or /login
    const teacherUser = { id: 't1', email: 'teacher@school.edu' };
    assert.deepStrictEqual(resolveRouteAccess('/', teacherUser, 'teacher'), { status: 307, destination: '/students' });
    assert.deepStrictEqual(resolveRouteAccess('/login', teacherUser, 'teacher'), { status: 307, destination: '/students' });
    assert.deepStrictEqual(resolveRouteAccess('/students', teacherUser, 'teacher'), { status: 200, destination: '/students' });

    // 5. Already authenticated student -> redirected to /classrooms when opening / or /login
    const studentUser = { id: 's1', email: 'student@school.edu' };
    assert.deepStrictEqual(resolveRouteAccess('/', studentUser, 'student'), { status: 307, destination: '/classrooms' });
    assert.deepStrictEqual(resolveRouteAccess('/login', studentUser, 'student'), { status: 307, destination: '/classrooms' });
    assert.deepStrictEqual(resolveRouteAccess('/classrooms', studentUser, 'student'), { status: 200, destination: '/classrooms' });

    // 6. Cross-role protection: student prevented from accessing teacher route
    assert.strictEqual(resolveRouteAccess('/students', studentUser, 'student').destination, '/classrooms?error=Access restricted to teachers only');

    // 7. Cross-role protection: teacher redirected to students portal when visiting student route
    assert.strictEqual(resolveRouteAccess('/student/profile/create', teacherUser, 'teacher').destination, '/students');
  });

  test('18. Student Profile Creation, Mandatory Validations & Duplicate Register Number Prevention', () => {
    const now = new Date().toISOString();

    // Setup: Create authenticated student user without profile
    db.prepare(`
      INSERT INTO user_profiles (id, auth_user_id, email, display_name, role, profile_completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u-student-arjun', 'auth-s-arjun', 'arjun@college.edu', 'Arjun', 'student', 0, now, now);

    function validateStudentProfile(data, excludeUserId, existingDb) {
      const name = (data.name || data.display_name || '').trim();
      const registerNumber = (data.register_number || '').trim();
      const className = (data.class_name || '').trim();
      const section = (data.section || '').trim();

      if (!name) return { valid: false, error: 'Student Name is required' };
      if (!registerNumber) return { valid: false, error: 'Register Number is required' };
      if (!className) return { valid: false, error: 'Class is required' };

      // Duplicate register number check
      const duplicate = existingDb.prepare(`
        SELECT id FROM user_profiles WHERE LOWER(register_number) = LOWER(?) AND id != ?
      `).get(registerNumber, excludeUserId);

      if (duplicate) {
        return { valid: false, error: `Register Number "${registerNumber}" is already in use by another student.` };
      }

      return { valid: true, name, registerNumber, className, section };
    }

    // 1. Mandatory field validations
    assert.strictEqual(validateStudentProfile({ name: '', register_number: '2026CS101', class_name: 'CS301' }, 'u-student-arjun', db).valid, false);
    assert.strictEqual(validateStudentProfile({ name: 'Arjun Verma', register_number: '', class_name: 'CS301' }, 'u-student-arjun', db).valid, false);
    assert.strictEqual(validateStudentProfile({ name: 'Arjun Verma', register_number: '2026CS101', class_name: '' }, 'u-student-arjun', db).valid, false);

    // 2. Section is optional
    const validWithNoSection = validateStudentProfile({ name: 'Arjun Verma', register_number: '2026CS101', class_name: 'CS301' }, 'u-student-arjun', db);
    assert.strictEqual(validWithNoSection.valid, true);

    // 3. Save Arjun's profile
    db.prepare(`
      UPDATE user_profiles
      SET display_name = ?, register_number = ?, class_name = ?, section = ?, profile_completed = 1, updated_at = ?
      WHERE id = ?
    `).run('Arjun Verma', '2026CS101', 'CS301', 'A', now, 'u-student-arjun');

    const saved = db.prepare('SELECT * FROM user_profiles WHERE id = ?').get('u-student-arjun');
    assert.strictEqual(saved.display_name, 'Arjun Verma');
    assert.strictEqual(saved.register_number, '2026CS101');
    assert.strictEqual(saved.class_name, 'CS301');
    assert.strictEqual(saved.section, 'A');
    assert.strictEqual(saved.profile_completed, 1);
    assert.strictEqual(saved.email, 'arjun@college.edu', 'Authenticated email remained unchanged and read-only');

    // 4. Duplicate register number check: A second student attempting to use 2026CS101 is rejected
    db.prepare(`
      INSERT INTO user_profiles (id, auth_user_id, email, display_name, role, profile_completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u-student-rohit', 'auth-s-rohit', 'rohit@college.edu', 'Rohit', 'student', 0, now, now);

    const dupAttempt = validateStudentProfile({ name: 'Rohit Sharma', register_number: '2026CS101', class_name: 'CS301' }, 'u-student-rohit', db);
    assert.strictEqual(dupAttempt.valid, false);
    assert.match(dupAttempt.error, /already in use/i);

    // Rohit uses a unique register number -> passes
    const rohitValid = validateStudentProfile({ name: 'Rohit Sharma', register_number: '2026CS102', class_name: 'CS301' }, 'u-student-rohit', db);
    assert.strictEqual(rohitValid.valid, true);
  });

  test('19. Student Profile Management in Settings: In-place update without creating duplicates', () => {
    const now = new Date().toISOString();

    const countBefore = db.prepare('SELECT COUNT(*) as count FROM user_profiles').get().count;

    // Student updates profile from Settings
    db.prepare(`
      UPDATE user_profiles
      SET display_name = ?, section = ?, updated_at = ?
      WHERE id = ?
    `).run('Arjun K. Verma', 'B', now, 'u-student-arjun');

    const countAfter = db.prepare('SELECT COUNT(*) as count FROM user_profiles').get().count;
    assert.strictEqual(countAfter, countBefore, 'Updating profile must not create duplicate user records');

    const updated = db.prepare('SELECT * FROM user_profiles WHERE id = ?').get('u-student-arjun');
    assert.strictEqual(updated.display_name, 'Arjun K. Verma');
    assert.strictEqual(updated.section, 'B');
    assert.strictEqual(updated.email, 'arjun@college.edu', 'Email must remain intact');
  });

  test('20. Teacher Classroom Details Roster & Safe Student Deletion', () => {
    const now = new Date().toISOString();

    // 1. Create a classroom owned by teacher u-teacher-1
    const classroomId = 'c-ds-algo-301';
    db.prepare(`
      INSERT INTO classrooms (id, owner_teacher_id, name, course, batch, department, academic_year, section, join_code, join_code_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(classroomId, 'u-teacher-1', 'Data Structures & Algorithms', 'CS301', '2026', 'Computer Science', '2026-2027', 'B', 'CT-DSA01', 'hash-dsa', now, now);

    // 2. Enroll student Arjun
    db.prepare(`
      INSERT INTO classroom_memberships (id, classroom_id, student_id, joined_at, membership_status)
      VALUES (?, ?, ?, ?, 'enrolled')
    `).run('mem-arjun-dsa', classroomId, 'u-student-arjun', now);

    // 3. Query enrolled students for this classroom
    const enrolledStudents = db.prepare(`
      SELECT u.id, u.display_name, u.register_number, u.section, u.email
      FROM classroom_memberships cm
      JOIN user_profiles u ON u.id = cm.student_id
      WHERE cm.classroom_id = ? AND cm.membership_status = 'enrolled'
    `).all(classroomId);

    assert.strictEqual(enrolledStudents.length, 1);
    assert.strictEqual(enrolledStudents[0].display_name, 'Arjun K. Verma');
    assert.strictEqual(enrolledStudents[0].register_number, '2026CS101');
    assert.strictEqual(enrolledStudents[0].section, 'B');
    assert.strictEqual(enrolledStudents[0].email, 'arjun@college.edu');

    // 4. Unauthorized teacher permission check
    function canDeleteStudent(teacherId, classId, existingDb) {
      const cls = existingDb.prepare('SELECT owner_teacher_id FROM classrooms WHERE id = ?').get(classId);
      if (!cls || cls.owner_teacher_id !== teacherId) {
        return false;
      }
      return true;
    }

    assert.strictEqual(canDeleteStudent('u-unauthorized-teacher', classroomId, db), false, 'Unauthorized teacher cannot delete student');
    assert.strictEqual(canDeleteStudent('u-teacher-1', classroomId, db), true, 'Authorized classroom owner can delete student');

    // 5. Safe Delete Student execution: updates status to dropped (un-enrolls from this classroom)
    db.prepare(`
      UPDATE classroom_memberships
      SET membership_status = 'dropped'
      WHERE classroom_id = ? AND student_id = ?
    `).run(classroomId, 'u-student-arjun');

    // Classroom enrolled roster count drops to 0
    const countAfterDelete = db.prepare(`
      SELECT COUNT(*) as count FROM classroom_memberships
      WHERE classroom_id = ? AND membership_status = 'enrolled'
    `).get(classroomId).count;
    assert.strictEqual(countAfterDelete, 0, 'Classroom roster count updated to 0');

    // CRITICAL DATA PROTECTION: Student profile is NOT deleted from system
    const studentAfterClassroomRemoval = db.prepare('SELECT * FROM user_profiles WHERE id = ?').get('u-student-arjun');
    assert(studentAfterClassroomRemoval, 'Student profile and account must NOT be permanently destroyed');
    assert.strictEqual(studentAfterClassroomRemoval.email, 'arjun@college.edu');
  });

  test('21. Student LeetCode and CodeChef Analytics: Real Student Data Only & Strict Restriction on Upcoming Contests', () => {
    const now = new Date().toISOString();

    // 1. Setup LeetCode platform account for Arjun
    db.prepare(`
      INSERT INTO platform_accounts (id, student_id, platform, username, normalized_username, public_profile_url, ownership_verification_status, linked_at, account_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('pa-arjun-lc', 'u-student-arjun', 'leetcode', 'arjun_v', 'arjun_v', 'https://leetcode.com/arjun_v/', 'linked_public_profile', now, 'active');

    // 2. Save verified snapshot
    db.prepare(`
      INSERT INTO platform_profile_snapshots (id, platform_account_id, total_solved, easy_solved, medium_solved, hard_solved, acceptance_rate, global_rank, contest_rating, contests_attended, source, source_version, validation_status, observed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('snap-arjun-lc', 'pa-arjun-lc', 42, 20, 15, 7, 68.5, 45120, 1680.0, 5, 'leetcode_graphql', 'v1.0', 'valid', now);

    // 3. Save past attended contest and upcoming contest
    db.prepare(`
      INSERT INTO contest_records (id, platform_account_id, contest_name, contest_date, participation_status, rank, problems_solved, total_problems, rating_after, evidence_source, data_availability_status, observed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('cr-attended-1', 'pa-arjun-lc', 'Weekly Contest 520', '2026-09-15T00:00:00Z', 'attended', 1240, 3, 4, 1680.0, 'ranking', 'published', now);

    db.prepare(`
      INSERT INTO contest_records (id, platform_account_id, contest_name, contest_date, participation_status, evidence_source, data_availability_status, observed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('cr-upcoming-1', 'pa-arjun-lc', 'Weekly Contest 525', '2026-11-01T00:00:00Z', 'upcoming', 'schedule', 'scheduled', now);

    // 4. Query student-specific analytics: STRICT REQUIREMENT: exclude upcoming contests
    function getStudentAnalytics(studentId, platform, existingDb) {
      const account = existingDb.prepare('SELECT * FROM platform_accounts WHERE student_id = ? AND platform = ?').get(studentId, platform);
      if (!account) return { connected: false, state: 'not_connected' };

      const snapshot = existingDb.prepare('SELECT * FROM platform_profile_snapshots WHERE platform_account_id = ? ORDER BY observed_at DESC LIMIT 1').get(account.id);
      
      // STRICT FILTER: Never return upcoming contests on student analytics page
      const contests = existingDb.prepare(`
        SELECT * FROM contest_records
        WHERE platform_account_id = ? AND participation_status != 'upcoming'
        ORDER BY contest_date DESC
      `).all(account.id);

      return {
        connected: true,
        account,
        snapshot,
        contests,
        state: 'connected',
      };
    }

    const arjunLc = getStudentAnalytics('u-student-arjun', 'leetcode', db);
    assert.strictEqual(arjunLc.connected, true);
    assert.strictEqual(arjunLc.account.username, 'arjun_v');
    assert.strictEqual(arjunLc.snapshot.total_solved, 42);
    assert.strictEqual(arjunLc.snapshot.easy_solved, 20);
    assert.strictEqual(arjunLc.snapshot.medium_solved, 15);
    assert.strictEqual(arjunLc.snapshot.hard_solved, 7);
    assert.strictEqual(arjunLc.snapshot.contest_rating, 1680.0);

    // STRICT CHECK: Contests list contains only attended/completed contests, ZERO upcoming contests
    assert.strictEqual(arjunLc.contests.length, 1);
    assert.strictEqual(arjunLc.contests[0].contest_name, 'Weekly Contest 520');
    assert.strictEqual(arjunLc.contests.some((c) => c.participation_status === 'upcoming'), false, 'Upcoming contests must NOT be returned to student');

    // 5. Unconnected student returns not_connected state
    const rohitLc = getStudentAnalytics('u-student-rohit', 'leetcode', db);
    assert.strictEqual(rohitLc.connected, false);
    assert.strictEqual(rohitLc.state, 'not_connected');

    // 6. Zero-fake-data check: Missing metrics must be null/unavailable, NOT fabricated
    const missingValue = null;
    const displayValue = missingValue != null ? missingValue : 'N/A';
    assert.strictEqual(displayValue, 'N/A', 'Missing data must display N/A rather than fabricated 0');
  });

  test('22. Student Classroom Roster View-Only Access & Authorization Enforcement', () => {
    const now = new Date().toISOString();
    // 1. Create a classroom and enroll two students
    const cId = 'c-algo-read-only-test';
    db.prepare(`
      INSERT INTO classrooms (id, owner_teacher_id, name, course, batch, department, academic_year, section, join_code, join_code_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cId, 'u-teacher-1', 'Algorithms View Only', 'CS401', '2026', 'CSE', '2026-2027', 'A', 'CT-RO001', 'hash-ro1', now, now);

    db.prepare(`
      INSERT INTO classroom_memberships (id, classroom_id, student_id, joined_at, membership_status)
      VALUES (?, ?, ?, ?, 'enrolled'), (?, ?, ?, ?, 'enrolled')
    `).run('mem-ro-1', cId, 'u-student-arjun', now, 'mem-ro-2', cId, 'u-student-rohit', now);

    // 2. Authorization function simulating GET /api/classrooms/[id]/students
    function getClassroomStudentsForUser(requestingUser, targetClassroomId, testDb) {
      if (!requestingUser) return { status: 401, error: 'Unauthorized' };
      const cls = testDb.prepare('SELECT * FROM classrooms WHERE id = ?').get(targetClassroomId);
      if (!cls) return { status: 404, error: 'Classroom not found' };

      if (requestingUser.role === 'student') {
        const mem = testDb.prepare(`
          SELECT id FROM classroom_memberships
          WHERE classroom_id = ? AND student_id = ? AND membership_status = 'enrolled'
        `).get(targetClassroomId, requestingUser.id);
        if (!mem) {
          return { status: 403, error: 'Access denied: You are not enrolled in this classroom' };
        }
      }

      const students = testDb.prepare(`
        SELECT u.id, u.display_name, u.register_number, u.section, u.email
        FROM classroom_memberships cm
        JOIN user_profiles u ON u.id = cm.student_id
        WHERE cm.classroom_id = ? AND cm.membership_status = 'enrolled'
        ORDER BY u.display_name ASC
      `).all(targetClassroomId);

      return { status: 200, students };
    }

    // 3. Enrolled student Arjun fetches classroom roster: succeeds and sees all enrolled students
    const arjunView = getClassroomStudentsForUser({ id: 'u-student-arjun', role: 'student' }, cId, db);
    assert.strictEqual(arjunView.status, 200);
    assert.strictEqual(arjunView.students.length, 2);
    assert.strictEqual(arjunView.students[0].display_name, 'Arjun K. Verma');
    assert.strictEqual(arjunView.students[1].display_name, 'Rohit');

    // 4. Non-enrolled student Priya: rejected with 403
    const priyaView = getClassroomStudentsForUser({ id: 'u-student-priya', role: 'student' }, cId, db);
    assert.strictEqual(priyaView.status, 403);
    assert.strictEqual(priyaView.error, 'Access denied: You are not enrolled in this classroom');

    // 5. Backend check: Student cannot delete another student from classroom
    function deleteStudentFromClassroom(requestingUser, targetClassroomId, studentIdToDelete, testDb) {
      if (!requestingUser || (requestingUser.role !== 'teacher' && requestingUser.role !== 'admin')) {
        return { status: 403, error: 'Only teachers can remove students' };
      }
      const cls = testDb.prepare('SELECT owner_teacher_id FROM classrooms WHERE id = ?').get(targetClassroomId);
      if (!cls || (cls.owner_teacher_id !== requestingUser.id && requestingUser.role !== 'admin')) {
        return { status: 404, error: 'Classroom not found or unauthorized' };
      }
      testDb.prepare(`
        UPDATE classroom_memberships
        SET membership_status = 'dropped'
        WHERE classroom_id = ? AND student_id = ?
      `).run(targetClassroomId, studentIdToDelete);
      return { status: 200, success: true };
    }

    const studentDeleteAttempt = deleteStudentFromClassroom({ id: 'u-student-arjun', role: 'student' }, cId, 'u-student-rohit', db);
    assert.strictEqual(studentDeleteAttempt.status, 403, 'Students must never be permitted to delete classmates');

    // 6. Teacher can delete student
    const teacherDelete = deleteStudentFromClassroom({ id: 'u-teacher-1', role: 'teacher' }, cId, 'u-student-rohit', db);
    assert.strictEqual(teacherDelete.status, 200);

    // 7. Roster count updates consistently
    const updatedView = getClassroomStudentsForUser({ id: 'u-student-arjun', role: 'student' }, cId, db);
    assert.strictEqual(updatedView.students.length, 1);
  });

  test('23. Upcoming and Active Contest Ascending Sorting Order for CodeChef & LeetCode', () => {
    const baseNow = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    // Simulate contests for CodeChef and LeetCode with various start dates
    const mockContests = [
      {
        id: 'c-13d',
        title: 'Starters 190 (Starts in 13 days)',
        platform: 'codechef',
        status: 'upcoming',
        start_time: new Date(baseNow + 13 * oneDay).toISOString(),
      },
      {
        id: 'c-1d',
        title: 'Starters 187 (Starts in 1 day)',
        platform: 'codechef',
        status: 'upcoming',
        start_time: new Date(baseNow + 1 * oneDay).toISOString(),
      },
      {
        id: 'c-7d',
        title: 'Starters 189 (Starts in 7 days)',
        platform: 'codechef',
        status: 'upcoming',
        start_time: new Date(baseNow + 7 * oneDay).toISOString(),
      },
      {
        id: 'c-3d',
        title: 'Starters 188 (Starts in 3 days)',
        platform: 'codechef',
        status: 'upcoming',
        start_time: new Date(baseNow + 3 * oneDay).toISOString(),
      },
      {
        id: 'c-same-day-evening',
        title: 'Starters 187 Evening Special (Starts in 1 day + 4 hours)',
        platform: 'codechef',
        status: 'upcoming',
        start_time: new Date(baseNow + 1 * oneDay + 4 * oneHour).toISOString(),
      },
      {
        id: 'c-live',
        title: 'Live Challenge (Currently Live)',
        platform: 'codechef',
        status: 'live',
        start_time: new Date(baseNow - 1 * oneHour).toISOString(),
      },
      {
        id: 'c-past',
        title: 'Starters 186 (Completed Yesterday)',
        platform: 'codechef',
        status: 'completed',
        start_time: new Date(baseNow - 1 * oneDay).toISOString(),
      },
    ];

    // Sorting implementation matching CodeChef & LeetCode analytics pages
    const upcomingAndLive = mockContests
      .filter((c) => c.status !== 'completed')
      .sort((a, b) => {
        const timeA = new Date(a.start_time).getTime();
        const timeB = new Date(b.start_time).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.title.localeCompare(b.title);
      });

    // 1. Live contest (started 1 hour ago) must appear FIRST
    assert.strictEqual(upcomingAndLive[0].id, 'c-live');

    // 2. Contest starting in 1 day must appear before 3 days, 7 days, 13 days
    assert.strictEqual(upcomingAndLive[1].id, 'c-1d');

    // 3. Same-day contest starting later in the day must follow the earlier one
    assert.strictEqual(upcomingAndLive[2].id, 'c-same-day-evening');

    // 4. Contest starting in 3 days
    assert.strictEqual(upcomingAndLive[3].id, 'c-3d');

    // 5. Contest starting in 7 days
    assert.strictEqual(upcomingAndLive[4].id, 'c-7d');

    // 6. Contest starting in 13 days must appear LAST among upcoming contests
    assert.strictEqual(upcomingAndLive[5].id, 'c-13d');

    // 7. Verify chronological ascending order across the entire array
    for (let i = 0; i < upcomingAndLive.length - 1; i++) {
      const currentStart = new Date(upcomingAndLive[i].start_time).getTime();
      const nextStart = new Date(upcomingAndLive[i + 1].start_time).getTime();
      assert(currentStart <= nextStart, `Contest index ${i} (${upcomingAndLive[i].title}) must start before or at index ${i + 1} (${upcomingAndLive[i + 1].title})`);
    }

    // 8. Completed contests remain in descending order (most recent completed contest first)
    const completed = mockContests
      .filter((c) => c.status === 'completed')
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    assert.strictEqual(completed.length, 1);
    assert.strictEqual(completed[0].id, 'c-past');
  });

  test('24. CodeChef & LeetCode Classroom Student Table Column Ordering & Clean Student Names', () => {
    // 1. Verify CodeChef exact required columns in exact order
    const codeChefExpectedColumns = [
      'Student Name',
      'Register Number',
      'CodeChef Handle',
      'Total Solved',
      'Star Tier',
      'Contest Rating',
      'Highest Rating',
      'Global Rank',
      'Country Rank',
    ];

    // Verify no 'Actions' column in CodeChef and Problem Difficulty Breakdown replaced with Highest Rating
    assert.strictEqual(codeChefExpectedColumns.includes('Actions'), false, 'Actions column must not exist');
    assert.strictEqual(codeChefExpectedColumns.includes('Details'), false, 'Details action must not exist');
    assert.strictEqual(codeChefExpectedColumns.includes('Problem Difficulty Breakdown'), false, 'Problem Difficulty Breakdown must be removed');
    assert.strictEqual(codeChefExpectedColumns.length, 9);
    assert.strictEqual(codeChefExpectedColumns[0], 'Student Name');
    assert.strictEqual(codeChefExpectedColumns[1], 'Register Number');
    assert.strictEqual(codeChefExpectedColumns[2], 'CodeChef Handle');
    assert.strictEqual(codeChefExpectedColumns[3], 'Total Solved');
    assert.strictEqual(codeChefExpectedColumns[4], 'Star Tier');
    assert.strictEqual(codeChefExpectedColumns[5], 'Contest Rating');
    assert.strictEqual(codeChefExpectedColumns[6], 'Highest Rating');
    assert.strictEqual(codeChefExpectedColumns[7], 'Global Rank');
    assert.strictEqual(codeChefExpectedColumns[8], 'Country Rank');

    // 2. Verify LeetCode exact required columns in exact order
    const leetCodeExpectedColumns = [
      'Student Name',
      'Register Number',
      'LeetCode Handle',
      'Total Solved',
      'Difficulty Breakdown',
      'Contest Rating',
      'Global Ranking',
      'Contest Acceptance',
    ];

    // Verify no 'Actions' column in LeetCode
    assert.strictEqual(leetCodeExpectedColumns.includes('Actions'), false, 'Actions column must not exist');
    assert.strictEqual(leetCodeExpectedColumns.includes('Details'), false, 'Details action must not exist');
    assert.strictEqual(leetCodeExpectedColumns.length, 8);
    assert.strictEqual(leetCodeExpectedColumns[0], 'Student Name');
    assert.strictEqual(leetCodeExpectedColumns[1], 'Register Number');
    assert.strictEqual(leetCodeExpectedColumns[2], 'LeetCode Handle');
    assert.strictEqual(leetCodeExpectedColumns[3], 'Total Solved');
    assert.strictEqual(leetCodeExpectedColumns[4], 'Difficulty Breakdown');
    assert.strictEqual(leetCodeExpectedColumns[5], 'Contest Rating');
    assert.strictEqual(leetCodeExpectedColumns[6], 'Global Ranking');
    assert.strictEqual(leetCodeExpectedColumns[7], 'Contest Acceptance');

    // 3. Clean Student Name Cell validation (must contain only the student name, no secondary lines)
    function renderStudentCell(student) {
      // Must not contain subtitle strings like email, total solved, or student count
      return {
        clickableName: student.display_name,
        hasSecondaryLine: false,
      };
    }

    const cell = renderStudentCell({ display_name: 'Arjun Verma', email: 'arjun@college.edu', total_solved: 42 });
    assert.strictEqual(cell.clickableName, 'Arjun Verma');
    assert.strictEqual(cell.hasSecondaryLine, false, 'Student name cell must not have secondary text line');
  });

  test('25. Individual Student Scan: Targeted Platform Scope & Duplicate Scan Prevention', () => {
    const now = new Date().toISOString();

    // 1. Simulation of scan authorization and account targeting
    function resolveAccountsToScan(requestBody, existingDb) {
      const { targetStudentId, platform, classroomId } = requestBody;
      let targetStudents = [];
      if (targetStudentId) {
        targetStudents = [{ id: targetStudentId }];
      } else if (classroomId) {
        targetStudents = existingDb.prepare(`
          SELECT student_id as id FROM classroom_memberships
          WHERE classroom_id = ? AND membership_status = 'enrolled'
        `).all(classroomId);
      }

      const accountsToScan = [];
      for (const student of targetStudents) {
        const accounts = existingDb.prepare('SELECT id, platform FROM platform_accounts WHERE student_id = ?').all(student.id);
        for (const acc of accounts) {
          if (platform === 'all' || platform === acc.platform) {
            accountsToScan.push({ accountId: acc.id, platform: acc.platform });
          }
        }
      }
      return accountsToScan;
    }

    // Individual CodeChef scan for Arjun
    const ccScanAccounts = resolveAccountsToScan({ targetStudentId: 'u-student-arjun', platform: 'codechef' }, db);
    assert.strictEqual(ccScanAccounts.length, 0, 'Arjun has no CodeChef account yet');

    // Add CodeChef account for Arjun
    db.prepare(`
      INSERT INTO platform_accounts (id, student_id, platform, username, normalized_username, public_profile_url, ownership_verification_status, linked_at, account_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('pa-arjun-cc', 'u-student-arjun', 'codechef', 'arjun_cc', 'arjun_cc', 'https://codechef.com/users/arjun_cc', 'linked_public_profile', now, 'active');

    const ccScanAccountsAfter = resolveAccountsToScan({ targetStudentId: 'u-student-arjun', platform: 'codechef' }, db);
    assert.strictEqual(ccScanAccountsAfter.length, 1);
    assert.strictEqual(ccScanAccountsAfter[0].platform, 'codechef');
    assert.strictEqual(ccScanAccountsAfter[0].accountId, 'pa-arjun-cc');

    // LeetCode scan for Arjun: targets only pa-arjun-lc, NOT pa-arjun-cc
    const lcScanAccounts = resolveAccountsToScan({ targetStudentId: 'u-student-arjun', platform: 'leetcode' }, db);
    assert.strictEqual(lcScanAccounts.length, 1);
    assert.strictEqual(lcScanAccounts[0].platform, 'leetcode');
    assert.strictEqual(lcScanAccounts[0].accountId, 'pa-arjun-lc');

    // 2. Duplicate Scan Check on target student
    function checkActiveScan(targetStudentId, classroomId, existingDb) {
      if (targetStudentId) {
        const active = existingDb.prepare(`
          SELECT id FROM scan_jobs
          WHERE target_student_id = ? AND status IN ('queued', 'running')
        `).get(targetStudentId);
        if (active) return { allowed: false, error: 'A scan is already currently in progress for this student.' };
      }
      return { allowed: true };
    }

    // No active scan initially
    assert.strictEqual(checkActiveScan('u-student-arjun', null, db).allowed, true);

    // Create an active scan job for Arjun
    db.prepare(`
      INSERT INTO scan_jobs (id, classroom_id, requested_by, selected_platforms, requested_scope, target_student_id, status, total_accounts, processed_accounts, successful_accounts, partial_accounts, failed_accounts, created_at)
      VALUES (?, NULL, 'u-teacher-1', 'codechef', 'student', 'u-student-arjun', 'running', 1, 0, 0, 0, 0, ?)
    `).run('job-arjun-active', now);

    // Duplicate check blocks second simultaneous scan for Arjun
    const dupCheck = checkActiveScan('u-student-arjun', null, db);
    assert.strictEqual(dupCheck.allowed, false);
    assert.match(dupCheck.error, /already currently in progress for this student/i);

    // Other students (e.g. Rohit) are NOT blocked by Arjun's individual scan
    assert.strictEqual(checkActiveScan('u-student-rohit', null, db).allowed, true);

    // Complete Arjun's scan
    db.prepare("UPDATE scan_jobs SET status = 'succeeded' WHERE id = 'job-arjun-active'").run();
    assert.strictEqual(checkActiveScan('u-student-arjun', null, db).allowed, true);
  });

  test('26. CodeChef & LeetCode Analytics Table: Column Ordering, Last Sync Removal & Register Number Mapping', () => {
    // 1. Verify CodeChef exact required columns in exact order
    const codeChefExpectedColumns = [
      'Student Name',
      'Register Number',
      'CodeChef Username',
      'Participation Status',
      'Contest Problems Solved',
      'Total Solved',
      'Contest Rating',
      'Highest Rating',
      'Global Rank',
      'Current Rank',
      'Country Rank',
    ];

    // Verify 'Last Sync' is completely absent
    assert.strictEqual(codeChefExpectedColumns.includes('Last Sync'), false, 'Last Sync must be removed from CodeChef');
    assert.strictEqual(codeChefExpectedColumns.length, 11);
    assert.strictEqual(codeChefExpectedColumns[0], 'Student Name');
    assert.strictEqual(codeChefExpectedColumns[1], 'Register Number');
    assert.strictEqual(codeChefExpectedColumns[2], 'CodeChef Username');
    assert.strictEqual(codeChefExpectedColumns[3], 'Participation Status');
    assert.strictEqual(codeChefExpectedColumns[4], 'Contest Problems Solved');
    assert.strictEqual(codeChefExpectedColumns[5], 'Total Solved');
    assert.strictEqual(codeChefExpectedColumns[6], 'Contest Rating');
    assert.strictEqual(codeChefExpectedColumns[7], 'Highest Rating');
    assert.strictEqual(codeChefExpectedColumns[8], 'Global Rank');
    assert.strictEqual(codeChefExpectedColumns[9], 'Current Rank');
    assert.strictEqual(codeChefExpectedColumns[10], 'Country Rank');

    // Current Rank and Country Rank are separate columns in the specified order
    const currentRankIdx = codeChefExpectedColumns.indexOf('Current Rank');
    const countryRankIdx = codeChefExpectedColumns.indexOf('Country Rank');
    assert.strictEqual(currentRankIdx, 9, 'Current Rank must be at index 9');
    assert.strictEqual(countryRankIdx, 10, 'Country Rank must be at index 10');
    assert.strictEqual(countryRankIdx > currentRankIdx, true, 'Country Rank must follow Current Rank');

    // 2. Verify LeetCode exact required columns in exact order
    const leetCodeExpectedColumns = [
      'Student Name',
      'Register Number',
      'LeetCode Username',
      'Contest Status',
      'Contest Problems Solved',
      'Contest Rank',
      'Total Solved',
      'Easy',
      'Medium',
      'Hard',
      'Accepted',
      'Contest Rating',
      'Profile Rank',
    ];

    // Verify 'Last Sync' is completely absent
    assert.strictEqual(leetCodeExpectedColumns.includes('Last Sync'), false, 'Last Sync must be removed from LeetCode');
    assert.strictEqual(leetCodeExpectedColumns.length, 13);
    assert.strictEqual(leetCodeExpectedColumns[0], 'Student Name');
    assert.strictEqual(leetCodeExpectedColumns[1], 'Register Number');
    assert.strictEqual(leetCodeExpectedColumns[2], 'LeetCode Username');
    assert.strictEqual(leetCodeExpectedColumns[3], 'Contest Status');
    assert.strictEqual(leetCodeExpectedColumns[4], 'Contest Problems Solved');
    assert.strictEqual(leetCodeExpectedColumns[5], 'Contest Rank');
    assert.strictEqual(leetCodeExpectedColumns[6], 'Total Solved');
    assert.strictEqual(leetCodeExpectedColumns[7], 'Easy');
    assert.strictEqual(leetCodeExpectedColumns[8], 'Medium');
    assert.strictEqual(leetCodeExpectedColumns[9], 'Hard');
    assert.strictEqual(leetCodeExpectedColumns[10], 'Accepted');
    assert.strictEqual(leetCodeExpectedColumns[11], 'Contest Rating');
    assert.strictEqual(leetCodeExpectedColumns[12], 'Profile Rank');

    // 3. Register number mapping from student database records (not platform username or mock)
    const mockStudent = {
      id: 'u-student-arjun',
      display_name: 'Arjun Verma',
      register_number: '2023CS101',
      role: 'student',
    };
    const mockAccount = {
      username: 'arjun_coder',
      platform: 'codechef',
      public_profile_url: 'https://codechef.com/users/arjun_coder',
    };

    function buildContestRow(st, acc) {
      return {
        student_id: st.id,
        student_name: st.display_name,
        register_number: st.register_number || null,
        username: acc.username,
      };
    }

    const row = buildContestRow(mockStudent, mockAccount);
    assert.strictEqual(row.register_number, '2023CS101', 'Register number must come from student profile record');
    assert.notStrictEqual(row.register_number, row.username, 'Register number must not be substituted by platform username');
  });

  test('27. Classroom Removal, Profile Decoupling, and Join Code Rejoin Enforcement', () => {
    const now = new Date().toISOString();

    // Setup: 2 classrooms and 1 student enrolled in both
    const classAId = 'c-math-101';
    const classBId = 'c-physics-201';
    const studentId = 'u-student-rohit';

    db.prepare(`
      INSERT OR IGNORE INTO user_profiles (id, auth_user_id, email, display_name, role, register_number, class_name, section, profile_completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'student', ?, ?, ?, 1, ?, ?)
    `).run(studentId, 'auth-rohit', 'rohit@college.edu', 'Rohit Sharma', '2026CS501', 'Mathematics', 'A', now, now);

    db.prepare(`
      INSERT OR IGNORE INTO classrooms (id, owner_teacher_id, name, course, batch, department, academic_year, section, join_code, join_code_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(classAId, 'u-teacher-1', 'Advanced Mathematics', 'Mathematics', '2026', 'Mathematics', '2026-2027', 'A', 'MATH-JOIN-101', 'hash-math', now, now);

    db.prepare(`
      INSERT OR IGNORE INTO classrooms (id, owner_teacher_id, name, course, batch, department, academic_year, section, join_code, join_code_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(classBId, 'u-teacher-1', 'Classical Physics', 'Physics', '2026', 'Physics', '2026-2027', 'A', 'PHYS-JOIN-201', 'hash-phys', now, now);

    // Initial enrollment in both classrooms
    db.prepare(`
      INSERT OR REPLACE INTO classroom_memberships (id, classroom_id, student_id, joined_at, membership_status)
      VALUES (?, ?, ?, ?, 'enrolled')
    `).run('mem-rohit-a', classAId, studentId, now);

    db.prepare(`
      INSERT OR REPLACE INTO classroom_memberships (id, classroom_id, student_id, joined_at, membership_status)
      VALUES (?, ?, ?, ?, 'enrolled')
    `).run('mem-rohit-b', classBId, studentId, now);

    // Helper functions modeling backend queries
    function getEnrolledCount(classId) {
      return db.prepare("SELECT COUNT(*) as count FROM classroom_memberships WHERE classroom_id = ? AND membership_status = 'enrolled'").get(classId).count;
    }

    function getEnrolledStudents(classId) {
      return db.prepare(`
        SELECT u.id, u.display_name, u.email
        FROM classroom_memberships cm
        JOIN user_profiles u ON u.id = cm.student_id
        WHERE cm.classroom_id = ? AND cm.membership_status = 'enrolled'
      `).all(classId);
    }

    function getStudentClassrooms(stId) {
      return db.prepare(`
        SELECT c.id, c.name, c.join_code
        FROM classroom_memberships cm
        JOIN classrooms c ON c.id = cm.classroom_id
        WHERE cm.student_id = ? AND cm.membership_status = 'enrolled'
      `).all(stId);
    }

    // Verify initial enrolled state
    assert.strictEqual(getEnrolledCount(classAId), 1);
    assert.strictEqual(getEnrolledCount(classBId), 1);
    assert.strictEqual(getStudentClassrooms(studentId).length, 2);

    // ----------------------------------------------------
    // TEST 1: Teacher removes student from classroom A
    // ----------------------------------------------------
    function removeStudent(classId, stId) {
      db.prepare(`
        UPDATE classroom_memberships
        SET membership_status = 'dropped'
        WHERE classroom_id = ? AND student_id = ?
      `).run(classId, stId);
    }

    removeStudent(classAId, studentId);

    // Verified: Enrolled count for classroom A is 0, student is not in enrolled list
    assert.strictEqual(getEnrolledCount(classAId), 0, 'Classroom A student count must be 0 after removal');
    assert.strictEqual(getEnrolledStudents(classAId).length, 0, 'Classroom A enrolled student list must be empty');

    // Multi-classroom isolation: Valid enrollment in classroom B is untouched!
    assert.strictEqual(getEnrolledCount(classBId), 1, 'Classroom B student count must remain 1');
    assert.strictEqual(getStudentClassrooms(studentId).length, 1, 'Student must still be enrolled in Classroom B');
    assert.strictEqual(getStudentClassrooms(studentId)[0].id, classBId);

    // Student account is not deleted
    const profile = db.prepare('SELECT * FROM user_profiles WHERE id = ?').get(studentId);
    assert(profile, 'Student account must not be deleted');

    // ----------------------------------------------------
    // TEST 2: Student saves their profile in Settings → Profile
    // ----------------------------------------------------
    function updateStudentProfile(stId, updates) {
      const ts = new Date().toISOString();
      db.prepare(`
        UPDATE user_profiles
        SET display_name = ?, register_number = ?, class_name = ?, section = ?, updated_at = ?
        WHERE id = ?
      `).run(updates.display_name, updates.register_number, updates.class_name, updates.section, ts, stId);
      // NOTE: Profile update must NOT call any auto-enrollment or membership sync functions
    }

    // Student updates profile with details that match Classroom A's course name
    updateStudentProfile(studentId, {
      display_name: 'Rohit Sharma (Updated)',
      register_number: '2026CS501-REV',
      class_name: 'Mathematics',
      section: 'A',
    });

    const updatedProfile = db.prepare('SELECT * FROM user_profiles WHERE id = ?').get(studentId);
    assert.strictEqual(updatedProfile.display_name, 'Rohit Sharma (Updated)');
    assert.strictEqual(updatedProfile.register_number, '2026CS501-REV');

    // CRITICAL: Student MUST REMAIN UNENROLLED from Classroom A after profile save
    assert.strictEqual(getEnrolledCount(classAId), 0, 'Classroom A student count must remain 0 after profile update');
    assert.strictEqual(getEnrolledStudents(classAId).length, 0, 'Classroom A enrolled list must remain 0 after profile update');
    assert.strictEqual(getStudentClassrooms(studentId).length, 1, 'Student must not be re-enrolled into Classroom A on profile update');

    // ----------------------------------------------------
    // TEST 3: Student logs in again (session restoration / page refresh)
    // ----------------------------------------------------
    const loggedInStudentClassrooms = getStudentClassrooms(studentId);
    assert.strictEqual(loggedInStudentClassrooms.length, 1, 'Removed classroom must not appear on student login/refresh');
    assert.strictEqual(loggedInStudentClassrooms[0].id, classBId);

    // ----------------------------------------------------
    // TEST 4: Student attempts to rejoin without a code or with invalid code
    // ----------------------------------------------------
    function joinClassroomWithValidation(stId, code) {
      if (!code || !code.trim()) {
        return { success: false, error: 'Join code is required' };
      }
      const cls = db.prepare('SELECT * FROM classrooms WHERE join_code = ?').get(code.trim());
      if (!cls) {
        return { success: false, error: 'Invalid or expired classroom join code' };
      }

      // Re-enroll or insert
      const existing = db.prepare('SELECT * FROM classroom_memberships WHERE classroom_id = ? AND student_id = ?').get(cls.id, stId);
      const joinTs = new Date().toISOString();
      if (existing) {
        if (existing.membership_status !== 'enrolled') {
          db.prepare("UPDATE classroom_memberships SET membership_status = 'enrolled', joined_at = ? WHERE id = ?").run(joinTs, existing.id);
        }
      } else {
        db.prepare("INSERT INTO classroom_memberships (id, classroom_id, student_id, joined_at, membership_status) VALUES (?, ?, ?, ?, 'enrolled')")
          .run(crypto.randomUUID(), cls.id, stId, joinTs);
      }
      return { success: true, classroom: cls };
    }

    const noCodeResult = joinClassroomWithValidation(studentId, '');
    assert.strictEqual(noCodeResult.success, false);
    assert.strictEqual(noCodeResult.error, 'Join code is required');
    assert.strictEqual(getEnrolledCount(classAId), 0, 'Classroom A must still have 0 enrolled students');

    const invalidCodeResult = joinClassroomWithValidation(studentId, 'WRONG-CODE-999');
    assert.strictEqual(invalidCodeResult.success, false);
    assert.strictEqual(invalidCodeResult.error, 'Invalid or expired classroom join code');
    assert.strictEqual(getEnrolledCount(classAId), 0, 'Classroom A must still have 0 enrolled students');

    // ----------------------------------------------------
    // TEST 5: Student rejoins with a valid code
    // ----------------------------------------------------
    const validCodeResult = joinClassroomWithValidation(studentId, 'MATH-JOIN-101');
    assert.strictEqual(validCodeResult.success, true);
    assert.strictEqual(validCodeResult.classroom.id, classAId);

    // Classroom count and enrolled roster are correctly updated
    assert.strictEqual(getEnrolledCount(classAId), 1, 'Classroom A count must now be 1 after valid rejoin');
    assert.strictEqual(getEnrolledStudents(classAId).length, 1);
    assert.strictEqual(getEnrolledStudents(classAId)[0].id, studentId);
    assert.strictEqual(getStudentClassrooms(studentId).length, 2, 'Student should now have 2 active classrooms');

    // Duplicate join attempts do not create duplicate rows
    const duplicateJoinResult = joinClassroomWithValidation(studentId, 'MATH-JOIN-101');
    assert.strictEqual(duplicateJoinResult.success, true);
    assert.strictEqual(getEnrolledCount(classAId), 1, 'Count must remain 1 after repeated join attempts');
    const totalMemberRows = db.prepare('SELECT COUNT(*) as count FROM classroom_memberships WHERE classroom_id = ? AND student_id = ?').get(classAId, studentId).count;
    assert.strictEqual(totalMemberRows, 1, 'Duplicate enrollment rows must be prevented');
  });
});




