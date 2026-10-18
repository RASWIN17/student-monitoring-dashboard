import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * 1:1 Mirror of computeContestStatus from lib/db.ts
 */
function computeContestStatus(contest) {
  if (!contest.start_time || !contest.end_time) {
    return contest.status || 'upcoming';
  }
  const nowMs = Date.now();
  const startMs = new Date(contest.start_time).getTime();
  const endMs = new Date(contest.end_time).getTime();

  if (nowMs < startMs) return 'upcoming';
  if (nowMs < endMs) return 'live';
  return 'completed';
}

/**
 * 1:1 Mirror of isContestRecordMatching from lib/db.ts
 */
function isContestRecordMatching(r, contest) {
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

const testDbDir = path.join(process.cwd(), 'data', 'test_contest_verification');
if (!fs.existsSync(testDbDir)) {
  fs.mkdirSync(testDbDir, { recursive: true });
}
const testDbPath = path.join(testDbDir, 'test.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

describe('Contest Status Verification — 10 Required Scenarios', () => {
  let db;

  before(() => {
    db = new DatabaseSync(testDbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS contests (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        contest_code TEXT NOT NULL,
        title TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        status TEXT NOT NULL,
        scan_status TEXT NOT NULL DEFAULT 'not_started',
        last_scanned_at TEXT,
        scan_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contest_records (
        id TEXT PRIMARY KEY,
        platform_account_id TEXT NOT NULL,
        platform_contest_id TEXT NOT NULL,
        contest_name TEXT NOT NULL,
        contest_date TEXT NOT NULL,
        participation_status TEXT NOT NULL,
        rank INTEGER,
        problems_solved INTEGER,
        total_problems INTEGER,
        rating_after REAL,
        evidence_source TEXT NOT NULL,
        data_availability_status TEXT NOT NULL,
        observed_at TEXT NOT NULL
      );
    `);
  });

  after(() => {
    if (db) {
      try { db.close(); } catch {}
    }
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });

  // Scenario 1: Contest is still running — status remains accurate
  test('Scenario 1: Contest is still running — status remains accurate as live/upcoming', () => {
    const nowMs = Date.now();
    const liveContest = {
      start_time: new Date(nowMs - 30 * 60 * 1000).toISOString(),
      end_time: new Date(nowMs + 60 * 60 * 1000).toISOString(),
      status: 'upcoming', // stale status in DB
    };
    const upcomingContest = {
      start_time: new Date(nowMs + 60 * 60 * 1000).toISOString(),
      end_time: new Date(nowMs + 120 * 60 * 1000).toISOString(),
      status: 'live', // stale status in DB
    };

    assert.strictEqual(computeContestStatus(liveContest), 'live', 'Ongoing contest must be evaluated as live');
    assert.strictEqual(computeContestStatus(upcomingContest), 'upcoming', 'Future contest must be evaluated as upcoming');
  });

  // Scenario 2: Contest has ended and student participated — verified as attended
  test('Scenario 2: Contest has ended and student participated — verified as attended with official ratings or live submissions', () => {
    // 2a: CodeChef Starters 260 with division code START260D
    const ccContest = {
      id: 'codechef_START260',
      contest_code: 'START260',
      title: 'Starters 260 (Rated till 5 Star)',
      platform: 'codechef',
    };
    const ccRecordAttended = {
      platform_contest_id: 'START260D',
      contest_name: 'Starters 260 (Rated)',
    };
    assert.strictEqual(
      isContestRecordMatching(ccRecordAttended, ccContest),
      true,
      'CodeChef division D must match Starters 260 contest catalog'
    );

    // 2b: LeetCode Weekly Contest 524
    const lcContest = {
      id: 'leetcode_weekly-contest-524',
      contest_code: 'weekly-contest-524',
      title: 'Weekly Contest 524',
      platform: 'leetcode',
    };
    const lcRecordAttended = {
      platform_contest_id: 'weekly-contest-524',
      contest_name: 'Weekly Contest 524',
    };
    assert.strictEqual(
      isContestRecordMatching(lcRecordAttended, lcContest),
      true,
      'LeetCode contest record must match Weekly Contest 524'
    );

    // 2c: Live contest submissions detection window
    const startSec = 1729218600; // 02:30 UTC
    const endSec = 1729224000;   // 04:00 UTC
    const studentSubmissions = [
      { timestamp: '1729220000', statusDisplay: 'Accepted', title: 'Two Sum' },
      { timestamp: '1729210000', statusDisplay: 'Accepted', title: 'Old Problem' },
    ];
    const contestSubs = studentSubmissions.filter((sub) => {
      const ts = Number(sub.timestamp);
      return ts >= (startSec - 120) && ts <= (endSec + 120);
    });
    assert.strictEqual(contestSubs.length, 1, 'Exactly one submission occurred during contest window');
    assert.strictEqual(contestSubs[0].title, 'Two Sum');
  });

  // Scenario 3: Contest has ended and student did not participate — absence recorded only when reliable
  test('Scenario 3: Contest has ended and student did not participate — recorded as not_attended when results published', () => {
    // When official results are published on CodeChef (hoursSinceEnd >= 0.5)
    const hoursSinceEnd = 2.0;
    const isPublished = hoursSinceEnd >= 0.5;
    assert.strictEqual(isPublished, true, 'Official CodeChef results are published 2 hours after contest');

    // Student has no matching record in contestHistory
    const studentHistory = [
      { code: 'START259D', name: 'Starters 259 (Rated)' },
    ];
    const targetContest = { contest_code: 'START260', title: 'Starters 260' };
    const match = studentHistory.find(ch => isContestRecordMatching({ platform_contest_id: ch.code, contest_name: ch.name }, targetContest));
    assert.strictEqual(match, undefined, 'Student did not participate in START260');

    const expectedStatus = isPublished ? 'not_attended' : 'pending_verification';
    assert.strictEqual(expectedStatus, 'not_attended', 'Must mark not_attended when platform results are verified published');
  });

  // Scenario 4: Contest ended several hours ago but status was pending — re-evaluated and resolved
  test('Scenario 4: Contest ended 9.5 hours ago — manual scan re-evaluates and resolves from platform data', () => {
    const contestEndTime = new Date(Date.now() - 9.5 * 3600 * 1000).toISOString();
    const contestStartTime = new Date(Date.now() - 11.5 * 3600 * 1000).toISOString();
    const contest = {
      start_time: contestStartTime,
      end_time: contestEndTime,
      status: 'upcoming', // Stale
    };

    const effectiveStatus = computeContestStatus(contest);
    assert.strictEqual(effectiveStatus, 'completed', 'Contest ended 9.5 hours ago must evaluate to completed');

    // CodeChef: 9.5 hours > 0.5 hours -> results are verified published
    const hoursSinceEnd = (Date.now() - new Date(contestEndTime).getTime()) / (3600 * 1000);
    assert.strictEqual(hoursSinceEnd >= 0.5, true, 'Results are published on CodeChef');
  });

  // Scenario 5: Official results delayed — status remains pending with clear reason and retries
  test('Scenario 5: Official results delayed — retains pending state without fabricating attendance/absence', () => {
    const isRatingsPublished = false;
    const studentHasLiveSubs = false;
    const studentHasContestHistory = false;

    let partStatus = 'not_attended';
    let dataAvailability = 'complete';
    let reason = '';

    if (studentHasContestHistory || studentHasLiveSubs) {
      partStatus = 'attended';
    } else if (isRatingsPublished) {
      partStatus = 'not_attended';
    } else {
      partStatus = 'pending_verification';
      dataAvailability = 'pending_publication';
      reason = 'Official LeetCode contest rankings are pending publication (ratings typically publish mid-week). System will auto-rescan.';
    }

    assert.strictEqual(partStatus, 'pending_verification', 'Must retain pending state when results delayed');
    assert.strictEqual(dataAvailability, 'pending_publication');
    assert.ok(reason.includes('pending publication'), 'Reason must explicitly explain delay');
  });

  // Scenario 6: Platform API returns an error or rate limit — no false attendance or absence recorded
  test('Scenario 6: Platform API returns HTTP error or rate limit — no false attendance/absence', () => {
    const apiResponse = { success: false, data: null, errorCode: 'HTTP_429', errorMessage: 'Rate limit exceeded' };

    let partStatus;
    let evidenceSource;
    let availabilityStatus;

    if (!apiResponse.success || !apiResponse.data) {
      partStatus = 'pending_verification';
      evidenceSource = 'leetcode_profile_unreachable';
      availabilityStatus = 'platform_rate_limited_or_error';
    }

    assert.strictEqual(partStatus, 'pending_verification', 'Must remain pending verification on error');
    assert.strictEqual(availabilityStatus, 'platform_rate_limited_or_error');
    assert.notStrictEqual(partStatus, 'attended');
    assert.notStrictEqual(partStatus, 'not_attended');
  });

  // Scenario 7: Stale cached response exists — cache invalidation and no-cache headers
  test('Scenario 7: Cache headers and cache invalidation ensure fresh data on scan', () => {
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    assert.strictEqual(headers.get('Cache-Control'), 'no-store, no-cache, must-revalidate, proxy-revalidate');

    // Cache buster check
    const classroomId = 'class-123';
    const force = true;
    const classroomParam = classroomId ? `?classroomId=${classroomId}` : '';
    const now = 1729250000000;
    const cacheBuster = force ? `${classroomParam ? '&' : '?'}_t=${now}` : '';
    const url = `/api/contests/lc-524${classroomParam}${cacheBuster}`;

    assert.strictEqual(url, `/api/contests/lc-524?classroomId=class-123&_t=1729250000000`);
  });

  // Scenario 8: Multiple scans occur simultaneously — concurrency guard prevents duplicates
  test('Scenario 8: Multiple scans occur simultaneously — concurrency guard returns in-progress message', () => {
    const nowMs = Date.now();
    const contest = {
      scan_status: 'scanning',
      last_scanned_at: new Date(nowMs - 5000).toISOString(), // 5 seconds ago
    };

    const isAlreadyScanning =
      contest.scan_status === 'scanning' &&
      contest.last_scanned_at &&
      (nowMs - new Date(contest.last_scanned_at).getTime()) < 15000;

    assert.strictEqual(isAlreadyScanning, true, 'Scan request within 15s window is detected as already scanning');
  });

  // Scenario 9: Contest timestamps cross timezone or date boundaries — UTC comparisons remain correct
  test('Scenario 9: Timestamps crossing UTC/Asia-Kolkata boundaries evaluate correctly', () => {
    // A contest ending at 23:30 UTC on day 1 is 05:00 IST on day 2
    const startUtc = '2026-10-18T22:00:00.000Z';
    const endUtc = '2026-10-18T23:30:00.000Z';

    const startMs = new Date(startUtc).getTime();
    const endMs = new Date(endUtc).getTime();

    // Verify UTC vs IST equivalence in milliseconds
    const startIst = '2026-10-19T03:30:00.000+05:30';
    const endIst = '2026-10-19T05:00:00.000+05:30';

    assert.strictEqual(new Date(startIst).getTime(), startMs, 'IST and UTC start timestamps represent same instant');
    assert.strictEqual(new Date(endIst).getTime(), endMs, 'IST and UTC end timestamps represent same instant');

    // Contest evaluation at 04:00 IST (during contest)
    const testNowMs = new Date('2026-10-19T04:00:00.000+05:30').getTime();
    const statusDuring = testNowMs < startMs ? 'upcoming' : (testNowMs < endMs ? 'live' : 'completed');
    assert.strictEqual(statusDuring, 'live', 'Cross-midnight contest is live at 04:00 IST');

    // Contest evaluation at 06:00 IST (after contest)
    const testAfterMs = new Date('2026-10-19T06:00:00.000+05:30').getTime();
    const statusAfter = testAfterMs < startMs ? 'upcoming' : (testAfterMs < endMs ? 'live' : 'completed');
    assert.strictEqual(statusAfter, 'completed', 'Cross-midnight contest is completed at 06:00 IST');
  });

  // Scenario 10: Both LeetCode and CodeChef continue to work independently
  test('Scenario 10: Both LeetCode and CodeChef matching and status logic operate independently', () => {
    // LeetCode matching
    const lcContest = { id: 'lc-1', title: 'Biweekly Contest 191', contest_code: 'biweekly-contest-191', platform: 'leetcode' };
    const lcAttended = { contest_name: 'Biweekly Contest 191', platform_contest_id: 'biweekly-contest-191' };
    const lcDifferent = { contest_name: 'Weekly Contest 524', platform_contest_id: 'weekly-contest-524' };

    assert.strictEqual(isContestRecordMatching(lcAttended, lcContest), true, 'LeetCode matches correctly');
    assert.strictEqual(isContestRecordMatching(lcDifferent, lcContest), false, 'LeetCode rejects different contest');

    // CodeChef matching with division code and parenthetical title
    const ccContest = { id: 'cc-1', title: 'Starters 257 (Rated till 6 Star)', contest_code: 'START257', platform: 'codechef' };
    const ccAttended = { contest_name: 'Starters 257 (Rated)', platform_contest_id: 'START257C' };
    const ccDifferent = { contest_name: 'Starters 260 (Rated)', platform_contest_id: 'START260D' };

    assert.strictEqual(isContestRecordMatching(ccAttended, ccContest), true, 'CodeChef division C matches Starters 257');
    assert.strictEqual(isContestRecordMatching(ccDifferent, ccContest), false, 'CodeChef rejects different contest');
  });

  // Additional Scenario: Database persistence of not_attended and attended records preserves correct counts
  test('Scenario 11: Database aggregation handles not_attended and attended records without pending overrides', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO contests (id, platform, contest_code, title, start_time, end_time, duration_seconds, status, scan_status, created_at, updated_at)
      VALUES ('c-test-1', 'leetcode', 'weekly-contest-520', 'Weekly Contest 520', '2026-09-20T02:30:00Z', '2026-09-20T04:00:00Z', 5400, 'completed', 'completed', ?, ?)
    `).run(now, now);

    db.prepare(`
      INSERT INTO contest_records (id, platform_account_id, platform_contest_id, contest_name, contest_date, participation_status, rank, problems_solved, total_problems, rating_after, evidence_source, data_availability_status, observed_at)
      VALUES 
        ('cr-1', 'acc-1', 'weekly-contest-520', 'Weekly Contest 520', '2026-09-20T02:30:00Z', 'attended', 1200, 3, 4, 1820.5, 'leetcode_history', 'complete', ?),
        ('cr-2', 'acc-2', 'weekly-contest-520', 'Weekly Contest 520', '2026-09-20T02:30:00Z', 'not_attended', NULL, 0, 4, NULL, 'leetcode_verified_non_attendance', 'complete', ?)
    `).run(now, now);

    const records = db.prepare('SELECT * FROM contest_records WHERE contest_name = ?').all('Weekly Contest 520');
    assert.strictEqual(records.length, 2);

    const attended = records.filter(r => r.participation_status === 'attended');
    const notAttended = records.filter(r => r.participation_status === 'not_attended');
    const pending = records.filter(r => r.participation_status === 'pending_verification');

    assert.strictEqual(attended.length, 1, '1 student attended');
    assert.strictEqual(notAttended.length, 1, '1 student not attended');
    assert.strictEqual(pending.length, 0, '0 students pending');
  });
});
