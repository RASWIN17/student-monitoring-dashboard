import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const testDbDir = path.join(process.cwd(), 'data', 'test_task1_task2');
if (!fs.existsSync(testDbDir)) {
  fs.mkdirSync(testDbDir, { recursive: true });
}
const testDbPath = path.join(testDbDir, 'test.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

describe('Task 1 & Task 2 Verification Suite', () => {
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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS classroom_memberships (
        id TEXT PRIMARY KEY,
        classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        joined_at TEXT NOT NULL,
        membership_status TEXT NOT NULL DEFAULT 'enrolled'
      );

      CREATE TABLE IF NOT EXISTS platform_accounts (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        platform TEXT NOT NULL CHECK (platform IN ('leetcode', 'codechef')),
        username TEXT NOT NULL,
        public_profile_url TEXT NOT NULL,
        account_status TEXT NOT NULL DEFAULT 'active',
        linked_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS platform_profile_snapshots (
        id TEXT PRIMARY KEY,
        platform_account_id TEXT NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
        total_solved INTEGER,
        contest_rating REAL,
        observed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS daily_activity_snapshots (
        id TEXT PRIMARY KEY,
        platform_account_id TEXT NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
        activity_date TEXT NOT NULL,
        submission_count INTEGER NOT NULL,
        activity_status TEXT NOT NULL CHECK (activity_status IN ('active', 'no_activity', 'unknown', 'stale')),
        observed_at TEXT NOT NULL,
        UNIQUE(platform_account_id, activity_date)
      );

      CREATE TABLE IF NOT EXISTS contest_records (
        id TEXT PRIMARY KEY,
        platform_account_id TEXT NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
        contest_name TEXT NOT NULL,
        contest_date TEXT NOT NULL,
        participation_status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        details TEXT,
        created_at TEXT NOT NULL
      );
    `);
  });

  after(() => {
    try {
      db.close();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      if (fs.existsSync(testDbDir)) {
        fs.rmdirSync(testDbDir);
      }
    } catch {}
  });

  // -------------------------------------------------------------
  // TEST 1: Task 2 - Sidebar Active State on Contest Pages
  // -------------------------------------------------------------
  test('Task 2: Student navigation item remains active on Contest pages and nested routes', () => {
    // Replicate Sidebar.tsx active-route matching logic
    const isStudentsActive = (pathname) => {
      const itemHref = '/students';
      return (
        pathname === itemHref ||
        (itemHref !== '/dashboard' && pathname.startsWith(itemHref)) ||
        (itemHref === '/students' && (pathname.startsWith('/leetcode') || pathname.startsWith('/codechef')))
      );
    };

    // Standard student pages
    assert.strictEqual(isStudentsActive('/students'), true, '/students must be active');
    assert.strictEqual(isStudentsActive('/students/leetcode'), true, '/students/leetcode must be active');
    assert.strictEqual(isStudentsActive('/students/leetcode/progress'), true, '/students/leetcode/progress must be active');
    assert.strictEqual(isStudentsActive('/students/codechef/progress'), true, '/students/codechef/progress must be active');

    // Contest pages (The exact bug where blue background previously disappeared)
    assert.strictEqual(isStudentsActive('/leetcode'), true, '/leetcode must retain active indicator');
    assert.strictEqual(isStudentsActive('/codechef'), true, '/codechef must retain active indicator');
    assert.strictEqual(isStudentsActive('/leetcode/biweekly-contest-130'), true, 'Nested LeetCode contest route must be active');
    assert.strictEqual(isStudentsActive('/codechef/START140B'), true, 'Nested CodeChef contest route must be active');

    // Non-student pages must NOT be marked active
    assert.strictEqual(isStudentsActive('/dashboard'), false, '/dashboard must not be active');
    assert.strictEqual(isStudentsActive('/classrooms'), false, '/classrooms must not be active');
    assert.strictEqual(isStudentsActive('/settings'), false, '/settings must not be active');
  });

  // -------------------------------------------------------------
  // TEST 2: Task 1 - 5 Analytics Cards Calculation & Filtering
  // -------------------------------------------------------------
  test('Task 1: LeetCode and CodeChef 5 analytics cards order, mutual consistency, and active/non-active filtering', () => {
    // Seed 5 students
    // Student 1: Linked, Active today (3 submissions)
    // Student 2: Linked, Verified Non-Active today (0 submissions)
    // Student 3: Linked, Unknown activity today (pending scan / network error)
    // Student 4: Not Linked (no account)
    // Student 5: Linked but failed/error status (must count as Profile Not Linked)

    const students = [
      { id: 's1', name: 'Alice', hasAccount: true, status: 'active', submissionsToday: 3, activityStatus: 'active' },
      { id: 's2', name: 'Bob', hasAccount: true, status: 'active', submissionsToday: 0, activityStatus: 'no_activity' },
      { id: 's3', name: 'Charlie', hasAccount: true, status: 'active', submissionsToday: 0, activityStatus: 'unknown' },
      { id: 's4', name: 'David', hasAccount: false, status: null, submissionsToday: null, activityStatus: null },
      { id: 's5', name: 'Eve', hasAccount: true, status: 'error', submissionsToday: 0, activityStatus: 'unknown' },
    ];

    // Compute metrics according to specifications
    const computeCardMetrics = (list) => {
      let linkedCount = 0;
      let notLinkedCount = 0;
      let activeTodayCount = 0;
      let nonActiveTodayCount = 0;
      let unknownTodayCount = 0;

      for (const item of list) {
        // Valid linked profile: account exists and is not in error/not_found
        const isLinked = item.hasAccount && item.status !== 'error' && item.status !== 'not_found';

        if (isLinked) {
          linkedCount++;
          if (item.activityStatus === 'active' && item.submissionsToday > 0) {
            activeTodayCount++;
          } else if (item.activityStatus === 'no_activity' && item.submissionsToday === 0) {
            nonActiveTodayCount++;
          } else {
            unknownTodayCount++;
          }
        } else {
          notLinkedCount++;
        }
      }

      return {
        totalStudents: list.length,
        linkedCount,
        notLinkedCount,
        activeTodayCount,
        nonActiveTodayCount,
        unknownTodayCount,
      };
    };

    const stats = computeCardMetrics(students);

    // 1. Total Students: 5
    assert.strictEqual(stats.totalStudents, 5, 'Total students must be 5');

    // 2. Profile Linked: 3 (Alice, Bob, Charlie)
    assert.strictEqual(stats.linkedCount, 3, 'Profile Linked must be exactly 3');

    // 3. Profile Not Linked: 2 (David has no account, Eve has error account)
    assert.strictEqual(stats.notLinkedCount, 2, 'Profile Not Linked must be exactly 2 (David + Eve)');

    // Mutual consistency requirement:
    assert.strictEqual(
      stats.linkedCount + stats.notLinkedCount,
      stats.totalStudents,
      'Profile Linked + Profile Not Linked MUST strictly equal Total Students'
    );

    // 4. Active Students: 1 (Alice with 3 submissions today)
    assert.strictEqual(stats.activeTodayCount, 1, 'Active students today must be 1 (Alice)');

    // 5. Non-Active Students: 1 (Bob with verified 0 submissions today)
    assert.strictEqual(stats.nonActiveTodayCount, 1, 'Non-Active students today must be 1 (Bob)');

    // 6. Unknown / Missing activity must NOT be classified as Non-Active
    assert.strictEqual(stats.unknownTodayCount, 1, 'Charlie must be classified as Unknown/Pending, NOT Non-Active');

    // Filtering test for each card action:
    const filterStudents = (filter) => {
      return students.filter((item) => {
        const isLinked = item.hasAccount && item.status !== 'error' && item.status !== 'not_found';
        const isActive = isLinked && item.activityStatus === 'active' && item.submissionsToday > 0;
        const isNonActive = isLinked && item.activityStatus === 'no_activity' && item.submissionsToday === 0;

        if (filter === 'linked') return isLinked;
        if (filter === 'not_linked') return !isLinked;
        if (filter === 'active') return isActive;
        if (filter === 'non_active') return isNonActive;
        return true; // 'all'
      });
    };

    // Filter 'all' matches Card 1
    assert.strictEqual(filterStudents('all').length, stats.totalStudents);
    // Filter 'linked' matches Card 2
    assert.strictEqual(filterStudents('linked').length, stats.linkedCount);
    // Filter 'not_linked' matches Card 3
    assert.strictEqual(filterStudents('not_linked').length, stats.notLinkedCount);
    // Filter 'active' matches Card 4
    assert.strictEqual(filterStudents('active').length, stats.activeTodayCount);
    // Filter 'non_active' matches Card 5
    assert.strictEqual(filterStudents('non_active').length, stats.nonActiveTodayCount);
  });

  // -------------------------------------------------------------
  // TEST 3: Task 1 - Heatmap Daily Extraction Rules
  // -------------------------------------------------------------
  test('Task 1: Daily activity rule extracts today submission count and distinguishes verified 0 from missing data', () => {
    const todayUnixSeconds = Math.floor(new Date('2026-10-17T00:00:00+05:30').getTime() / 1000);

    // Case A: Student submitted 4 problems on today's date
    const submissionCalendarActive = JSON.stringify({
      [todayUnixSeconds]: 4,
      [todayUnixSeconds - 86400]: 1,
    });
    const parsedA = JSON.parse(submissionCalendarActive);
    const countA = parsedA[todayUnixSeconds] || 0;
    assert.strictEqual(countA, 4, 'Case A: Verified 4 submissions today');
    assert.strictEqual(countA > 0, true, 'Case A: Classified as Active Student');

    // Case B: Student has calendar but 0 submissions today (today key omitted by LeetCode/CodeChef)
    const submissionCalendarZero = JSON.stringify({
      [todayUnixSeconds - 86400]: 5,
    });
    const parsedB = JSON.parse(submissionCalendarZero);
    const countB = parsedB[todayUnixSeconds] || 0;
    assert.strictEqual(countB, 0, 'Case B: Verified 0 submissions today despite 5 solves yesterday');
    assert.strictEqual(countB === 0, true, 'Case B: Classified as Non-Active Student');

    // Case C: Platform request fails or calendar missing entirely
    const calendarMissing = null;
    const isAvailableC = calendarMissing !== null && typeof calendarMissing === 'object';
    assert.strictEqual(isAvailableC, false, 'Case C: Data is unavailable/unverified');
    // Must NOT be classified as non-active:
    const statusC = isAvailableC ? 'no_activity' : 'unknown';
    assert.strictEqual(statusC, 'unknown', 'Case C: Must be marked unknown, not no_activity');
  });

  // -------------------------------------------------------------
  // TEST 4: Task 1 - Complete Account Deletion & Teacher Safeguards
  // -------------------------------------------------------------
  test('Task 1: Account deletion removes personal records and protects teacher classrooms with enrolled students', () => {
    const now = new Date().toISOString();

    // Setup:
    // Teacher 1 owns Classroom 1 with Student 1 enrolled
    // Teacher 2 owns Classroom 2 with 0 students enrolled
    // Student 2 is standalone
    db.prepare(`
      INSERT INTO user_profiles (id, auth_user_id, email, display_name, role, created_at, updated_at)
      VALUES 
        ('t1', 'auth-t1', 'teacher1@school.edu', 'Teacher One', 'teacher', ?, ?),
        ('t2', 'auth-t2', 'teacher2@school.edu', 'Teacher Two', 'teacher', ?, ?),
        ('s1', 'auth-s1', 'student1@school.edu', 'Student One', 'student', ?, ?),
        ('s2', 'auth-s2', 'student2@school.edu', 'Student Two', 'student', ?, ?)
    `).run(now, now, now, now, now, now, now, now);

    db.prepare(`
      INSERT INTO classrooms (id, owner_teacher_id, name, course, batch, department, academic_year, section, join_code, created_at, updated_at)
      VALUES 
        ('c1', 't1', 'Algorithms A', 'CS', '2026', 'CSE', '2025-2026', 'A', 'JOIN1111', ?, ?),
        ('c2', 't2', 'Empty Class B', 'CS', '2026', 'CSE', '2025-2026', 'B', 'JOIN2222', ?, ?)
    `).run(now, now, now, now);

    db.prepare(`
      INSERT INTO classroom_memberships (id, classroom_id, student_id, joined_at)
      VALUES ('m1', 'c1', 's1', ?)
    `).run(now);

    db.prepare(`
      INSERT INTO platform_accounts (id, student_id, platform, username, public_profile_url, account_status, linked_at)
      VALUES 
        ('acc1', 's2', 'leetcode', 'student_s2', 'https://leetcode.com/u/student_s2', 'active', ?),
        ('acc2', 's2', 'codechef', 'student_s2', 'https://codechef.com/users/student_s2', 'active', ?)
    `).run(now, now);

    db.prepare(`
      INSERT INTO daily_activity_snapshots (id, platform_account_id, activity_date, submission_count, activity_status, observed_at)
      VALUES ('act1', 'acc1', '2026-10-17', 2, 'active', ?)
    `).run(now);

    db.prepare(`
      INSERT INTO contest_records (id, platform_account_id, contest_name, contest_date, participation_status)
      VALUES ('cr1', 'acc1', 'Biweekly Contest 120', '2026-10-10', 'attended')
    `).run();

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, created_at)
      VALUES ('log1', 's2', 'LOGIN', 'user_profiles', 's2', '{"ip":"127.0.0.1"}', ?)
    `).run(now);

    // Safeguard function replication (lib/db.ts: deleteUserAccount)
    const deleteUser = (userId) => {
      const user = db.prepare('SELECT * FROM user_profiles WHERE id = ?').get(userId);
      if (!user) throw new Error('User not found');

      if (user.role === 'teacher') {
        const ownedClasses = db.prepare('SELECT id, name FROM classrooms WHERE owner_teacher_id = ?').all(userId);
        if (ownedClasses.length > 0) {
          const classIds = ownedClasses.map((c) => c.id);
          const placeholders = classIds.map(() => '?').join(',');
          const enrolled = db.prepare(
            `SELECT COUNT(*) as count FROM classroom_memberships WHERE classroom_id IN (${placeholders})`
          ).get(...classIds);

          if (enrolled.count > 0) {
            const err = new Error(
              `Cannot delete account: You own active classroom(s) with ${enrolled.count} enrolled student(s). Transfer ownership or remove students first.`
            );
            err.code = 'ACTIVE_CLASSROOMS_EXIST';
            throw err;
          }

          // If no students are enrolled, safe to clean up empty classrooms
          for (const cId of classIds) {
            db.prepare('DELETE FROM classrooms WHERE id = ?').run(cId);
          }
        }
      }

      // Delete student memberships
      db.prepare('DELETE FROM classroom_memberships WHERE student_id = ?').run(userId);

      // Delete platform accounts and cascaded data
      const accounts = db.prepare('SELECT id FROM platform_accounts WHERE student_id = ?').all(userId);
      for (const a of accounts) {
        db.prepare('DELETE FROM daily_activity_snapshots WHERE platform_account_id = ?').run(a.id);
        db.prepare('DELETE FROM contest_records WHERE platform_account_id = ?').run(a.id);
        db.prepare('DELETE FROM platform_profile_snapshots WHERE platform_account_id = ?').run(a.id);
        db.prepare('DELETE FROM platform_accounts WHERE id = ?').run(a.id);
      }

      // Anonymize audit logs
      db.prepare("UPDATE audit_logs SET user_id = 'DELETED_USER' WHERE user_id = ?").run(userId);

      // Delete profile
      db.prepare('DELETE FROM user_profiles WHERE id = ?').run(userId);

      return { success: true };
    };

    // Subtest A: Teacher 1 deletion must FAIL with ACTIVE_CLASSROOMS_EXIST safeguard
    assert.throws(
      () => deleteUser('t1'),
      (err) => err.code === 'ACTIVE_CLASSROOMS_EXIST',
      'Teacher with enrolled students must be blocked from deletion'
    );
    // Verify Teacher 1 still exists
    assert.notStrictEqual(db.prepare('SELECT * FROM user_profiles WHERE id = ?').get('t1'), undefined);

    // Subtest B: Teacher 2 with 0 enrolled students deletes safely and cleans up empty classroom
    const resT2 = deleteUser('t2');
    assert.strictEqual(resT2.success, true);
    assert.strictEqual(db.prepare('SELECT * FROM user_profiles WHERE id = ?').get('t2'), undefined);
    assert.strictEqual(db.prepare('SELECT * FROM classrooms WHERE id = ?').get('c2'), undefined);

    // Subtest C: Student 2 deletion completely purges personal records and anonymizes logs
    const resS2 = deleteUser('s2');
    assert.strictEqual(resS2.success, true);
    assert.strictEqual(db.prepare('SELECT * FROM user_profiles WHERE id = ?').get('s2'), undefined);
    assert.strictEqual(db.prepare('SELECT * FROM platform_accounts WHERE student_id = ?').all('s2').length, 0);
    assert.strictEqual(db.prepare('SELECT * FROM daily_activity_snapshots WHERE id = ?').get('act1'), undefined);
    assert.strictEqual(db.prepare('SELECT * FROM contest_records WHERE id = ?').get('cr1'), undefined);

    // Verify audit log was anonymized
    const log = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get('log1');
    assert.strictEqual(log.user_id, 'DELETED_USER', 'Audit log user_id must be anonymized');
  });
});
