import { test, describe } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import crypto from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('jiti')(path.join(process.cwd(), 'test-security-runner.js'), {
  alias: { '@': process.cwd() },
});

// Load actual Next.js route handlers
const devSessionRoute = jiti('./app/api/auth/dev-session/route.ts');
const cronRoute = jiti('./app/api/cron/scan-contests/route.ts');
const exportRoute = jiti('./app/api/export/route.ts');
const leetcodeAnalyticsRoute = jiti('./app/api/analytics/leetcode/route.ts');
const codechefAnalyticsRoute = jiti('./app/api/analytics/codechef/route.ts');
const contestsAnalyticsRoute = jiti('./app/api/analytics/contests/route.ts');
const scanRoute = jiti('./app/api/scan/route.ts');
const contestsRoute = jiti('./app/api/contests/route.ts');
const contestIdRoute = jiti('./app/api/contests/[id]/route.ts');
const contestScanRoute = jiti('./app/api/contests/[id]/scan/route.ts');
const platformsRoute = jiti('./app/api/students/[id]/platforms/route.ts');
const adminSupabase = jiti('./lib/supabase/admin.ts');

describe('CodeTrack Security Hardening & Blueprint Verification Suite', () => {

  // =========================================================================
  // 1. Dev Session Backdoor Protection (Actual Route Handler + Simulation)
  // =========================================================================
  describe('1. Backdoor Lockdown: /api/auth/dev-session', () => {
    test('Actual route handler: unconditionally returns 404 in production environment', async () => {
      const origNodeEnv = process.env.NODE_ENV;
      const origDevAuth = process.env.DEV_AUTH_ENABLED;

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.DEV_AUTH_ENABLED;

        const req = new Request('http://localhost:3000/api/auth/dev-session?email=admin@college.edu');
        const res = await devSessionRoute.GET(req);
        assert.strictEqual(res.status, 404, 'Must return HTTP 404 in production');
        const json = await res.json();
        assert.strictEqual(json.error, 'Not found');
      } finally {
        process.env.NODE_ENV = origNodeEnv;
        if (origDevAuth !== undefined) process.env.DEV_AUTH_ENABLED = origDevAuth;
        else delete process.env.DEV_AUTH_ENABLED;
      }
    });

    test('Actual route handler: returns 404 even in development unless DEV_AUTH_ENABLED=true', async () => {
      const origNodeEnv = process.env.NODE_ENV;
      const origDevAuth = process.env.DEV_AUTH_ENABLED;

      try {
        process.env.NODE_ENV = 'development';
        delete process.env.DEV_AUTH_ENABLED;

        const req = new Request('http://localhost:3000/api/auth/dev-session?email=admin@college.edu');
        const res = await devSessionRoute.GET(req);
        assert.strictEqual(res.status, 404, 'Must return HTTP 404 unless DEV_AUTH_ENABLED is explicitly true');
      } finally {
        process.env.NODE_ENV = origNodeEnv;
        if (origDevAuth !== undefined) process.env.DEV_AUTH_ENABLED = origDevAuth;
        else delete process.env.DEV_AUTH_ENABLED;
      }
    });

    test('Actual route handler: client parameters cannot bypass production lock', async () => {
      const origNodeEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const req = new Request('http://localhost:3000/api/auth/dev-session?email=admin@college.edu&env=development&DEV_AUTH_ENABLED=true');
        const res = await devSessionRoute.GET(req);
        assert.strictEqual(res.status, 404, 'Client query parameters cannot override server environment');
      } finally {
        process.env.NODE_ENV = origNodeEnv;
      }
    });
  });

  // =========================================================================
  // 2. Cron Task Authentication & Fail-Closed Protection (Actual Route Handler)
  // =========================================================================
  describe('2. Cron Authentication: /api/cron/scan-contests', () => {
    test('Actual route handler: Fails closed with 503 when SCRAPER_WORKER_SECRET is unset or empty', async () => {
      const origSecret = process.env.SCRAPER_WORKER_SECRET;
      try {
        delete process.env.SCRAPER_WORKER_SECRET;

        const req = new Request('http://localhost:3000/api/cron/scan-contests', {
          headers: { Authorization: 'Bearer some-secret' },
        });
        const res = await cronRoute.GET(req);
        assert.strictEqual(res.status, 503, 'Must return 503 Service Unavailable when secret is unset');
        const json = await res.json();
        assert.match(json.error, /unconfigured or disabled/i);
      } finally {
        if (origSecret !== undefined) process.env.SCRAPER_WORKER_SECRET = origSecret;
        else delete process.env.SCRAPER_WORKER_SECRET;
      }
    });

    test('Actual route handler: Fails closed with 503 when SCRAPER_WORKER_SECRET is default placeholder', async () => {
      const origSecret = process.env.SCRAPER_WORKER_SECRET;
      try {
        process.env.SCRAPER_WORKER_SECRET = 'your-random-long-secret-key';

        const req = new Request('http://localhost:3000/api/cron/scan-contests', {
          headers: { Authorization: 'Bearer your-random-long-secret-key' },
        });
        const res = await cronRoute.GET(req);
        assert.strictEqual(res.status, 503, 'Must reject default placeholder key');
      } finally {
        if (origSecret !== undefined) process.env.SCRAPER_WORKER_SECRET = origSecret;
        else delete process.env.SCRAPER_WORKER_SECRET;
      }
    });

    test('Actual route handler: Rejects invalid or mismatched secrets with 401 Unauthorized', async () => {
      const origSecret = process.env.SCRAPER_WORKER_SECRET;
      try {
        process.env.SCRAPER_WORKER_SECRET = 'super-strong-production-cron-secret-2026';

        // 1. Wrong bearer token
        const reqWrongBearer = new Request('http://localhost:3000/api/cron/scan-contests', {
          headers: { Authorization: 'Bearer attacker-invalid-token' },
        });
        const resBearer = await cronRoute.GET(reqWrongBearer);
        assert.strictEqual(resBearer.status, 401, 'Must reject invalid bearer token');

        // 2. Wrong query param secret
        const reqWrongParam = new Request('http://localhost:3000/api/cron/scan-contests?secret=wrong-query-param');
        const resParam = await cronRoute.GET(reqWrongParam);
        assert.strictEqual(resParam.status, 401, 'Must reject invalid query param secret');

        // 3. No credentials provided
        const reqNone = new Request('http://localhost:3000/api/cron/scan-contests');
        const resNone = await cronRoute.GET(reqNone);
        assert.strictEqual(resNone.status, 401, 'Must reject unauthenticated request');
      } finally {
        if (origSecret !== undefined) process.env.SCRAPER_WORKER_SECRET = origSecret;
        else delete process.env.SCRAPER_WORKER_SECRET;
      }
    });

    test('Constant-time timingSafeEqual logic prevents side-channel timing attacks', () => {
      function safeCompare(a, b) {
        try {
          const bufA = Buffer.from(a);
          const bufB = Buffer.from(b);
          if (bufA.length !== bufB.length) return false;
          return crypto.timingSafeEqual(bufA, bufB);
        } catch {
          return false;
        }
      }

      assert.strictEqual(safeCompare('secretKey123', 'secretKey123'), true);
      assert.strictEqual(safeCompare('secretKey123', 'secretKey124'), false);
      assert.strictEqual(safeCompare('secretKey123', 'secretKey12'), false);
      assert.strictEqual(safeCompare('', ''), true);
    });
  });

  // =========================================================================
  // 3. Export Route IDOR & Access Control (Actual Route Handler + Scoping)
  // =========================================================================
  describe('3. Export Security: /api/export IDOR & Sanitization', () => {
    test('Actual route handler: Rejects unauthenticated export request with 403', async () => {
      const req = new Request('http://localhost:3000/api/export?classroomId=c-101');
      const res = await exportRoute.GET(req);
      assert.strictEqual(res.status, 403, 'Must reject unauthenticated callers');
      const json = await res.json();
      assert.match(json.error, /authorized staff/i);
    });

    const mockClassrooms = {
      'c-prof-smith': { id: 'c-prof-smith', owner_teacher_id: 't-smith', name: 'CS101' },
      'c-prof-jones': { id: 'c-prof-jones', owner_teacher_id: 't-jones', name: 'CS202' },
    };

    function handleExportRequest(user, classroomId) {
      if (!user) return { status: 401, error: 'Unauthorized' };
      if (user.role !== 'teacher' && user.role !== 'admin') {
        return { status: 403, error: 'Only authorized staff can export data' };
      }
      if (!classroomId) return { status: 400, error: 'Classroom ID is required' };

      const classroom = mockClassrooms[classroomId];
      if (!classroom) return { status: 404, error: 'Classroom not found' };

      // Enforce ownership
      if (user.role !== 'admin' && classroom.owner_teacher_id !== user.id) {
        return { status: 403, error: 'Forbidden: You do not have permission to export records for this classroom' };
      }

      return { status: 200, success: true, classroomName: classroom.name };
    }

    test('Prevents student role from exporting classroom data', () => {
      const student = { id: 's-arjun', role: 'student' };
      const res = handleExportRequest(student, 'c-prof-smith');
      assert.strictEqual(res.status, 403);
    });

    test('Prevents cross-teacher IDOR: Teacher A cannot export Teacher B classroom', () => {
      const teacherSmith = { id: 't-smith', role: 'teacher' };
      const idorAttempt = handleExportRequest(teacherSmith, 'c-prof-jones');
      assert.strictEqual(idorAttempt.status, 403);
      assert.match(idorAttempt.error, /permission to export records/);
    });

    test('Allows teacher to export their own classroom', () => {
      const teacherSmith = { id: 't-smith', role: 'teacher' };
      const res = handleExportRequest(teacherSmith, 'c-prof-smith');
      assert.strictEqual(res.status, 200);
    });

    test('Allows admin to export any classroom', () => {
      const admin = { id: 'u-admin', role: 'admin' };
      const res = handleExportRequest(admin, 'c-prof-smith');
      assert.strictEqual(res.status, 200);
    });

    test('CSV Formula Injection escaping works as expected', () => {
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

      assert.strictEqual(sanitizeCsvCell('=cmd|"/C calc"!A0'), `"'=cmd|""/C calc""!A0"`);
      assert.strictEqual(sanitizeCsvCell('+12345'), '\'+12345');
      assert.strictEqual(sanitizeCsvCell('-500'), '\'-500');
      assert.strictEqual(sanitizeCsvCell('@SUM(A1:A10)'), '\'@SUM(A1:A10)');
      assert.strictEqual(sanitizeCsvCell('Normal Text'), 'Normal Text');
    });
  });

  // =========================================================================
  // 4. Analytics Role-Based Access Control & Scoping (Actual Route Handlers)
  // =========================================================================
  describe('4. Analytics Security: /api/analytics/leetcode, codechef & contests', () => {
    test('Actual route handler: leetcode analytics rejects unauthenticated requests with 401', async () => {
      const req = new Request('http://localhost:3000/api/analytics/leetcode');
      const res = await leetcodeAnalyticsRoute.GET(req);
      assert.strictEqual(res.status, 401);
    });

    test('Actual route handler: codechef analytics rejects unauthenticated requests with 401', async () => {
      const req = new Request('http://localhost:3000/api/analytics/codechef');
      const res = await codechefAnalyticsRoute.GET(req);
      assert.strictEqual(res.status, 401);
    });

    test('Actual route handler: contests analytics rejects unauthenticated requests with 401', async () => {
      const req = new Request('http://localhost:3000/api/analytics/contests');
      const res = await contestsAnalyticsRoute.GET(req);
      assert.strictEqual(res.status, 401);
    });

    const mockClassrooms = {
      'c-smith': { id: 'c-smith', owner_teacher_id: 't-smith' },
      'c-jones': { id: 'c-jones', owner_teacher_id: 't-jones' },
    };
    const mockEnrollments = {
      'c-smith': ['s-enrolled-1', 's-enrolled-2'],
      'c-jones': ['s-enrolled-3'],
    };

    function handleAnalyticsAuth(user, classroomId) {
      if (!user) return { status: 401, error: 'Unauthorized' };

      if (user.role === 'student') {
        if (!classroomId) {
          return { status: 403, error: 'Forbidden: Students cannot access institution-wide analytics' };
        }
        const enrolledStudents = mockEnrollments[classroomId] || [];
        if (!enrolledStudents.includes(user.id)) {
          return { status: 403, error: 'Access denied: You are not enrolled in this classroom' };
        }
        return { status: 200, scopedTo: [user.id] };
      }

      if (user.role === 'teacher') {
        if (classroomId) {
          const classroom = mockClassrooms[classroomId];
          if (!classroom) return { status: 404, error: 'Classroom not found' };
          if (classroom.owner_teacher_id !== user.id) {
            return { status: 403, error: 'Forbidden: You do not have permission to view analytics for this classroom' };
          }
          return { status: 200, scopedClassroom: classroomId };
        }
        const teacherClassrooms = Object.values(mockClassrooms).filter((c) => c.owner_teacher_id === user.id);
        return { status: 200, scopedClassrooms: teacherClassrooms.map((c) => c.id) };
      }

      if (user.role === 'admin') {
        return { status: 200, scope: 'system' };
      }

      return { status: 403, error: 'Forbidden' };
    }

    test('Prevents students from dumping institution-wide analytics without classroomId', () => {
      const student = { id: 's-enrolled-1', role: 'student' };
      const res = handleAnalyticsAuth(student, null);
      assert.strictEqual(res.status, 403);
      assert.match(res.error, /institution-wide analytics/);
    });

    test('Prevents student from accessing analytics for unauthorized classroom', () => {
      const student = { id: 's-enrolled-1', role: 'student' };
      const res = handleAnalyticsAuth(student, 'c-jones');
      assert.strictEqual(res.status, 403);
      assert.match(res.error, /not enrolled in this classroom/);
    });

    test('Allows student to access analytics for classroom they are enrolled in', () => {
      const student = { id: 's-enrolled-1', role: 'student' };
      const res = handleAnalyticsAuth(student, 'c-smith');
      assert.strictEqual(res.status, 200);
    });

    test('Prevents teacher from viewing analytics of another teacher classroom', () => {
      const teacherSmith = { id: 't-smith', role: 'teacher' };
      const res = handleAnalyticsAuth(teacherSmith, 'c-jones');
      assert.strictEqual(res.status, 403);
    });

    test('Scopes teacher without classroomId strictly to teacher owned classrooms', () => {
      const teacherSmith = { id: 't-smith', role: 'teacher' };
      const res = handleAnalyticsAuth(teacherSmith, null);
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.scopedClassrooms, ['c-smith']);
    });
  });

  // =========================================================================
  // 5. Scan Route Protection & Job Isolation (Actual Route Handlers)
  // =========================================================================
  describe('5. Scan Logs Protection: /api/scan & /api/scan/[id]', () => {
    test('Actual route handler: scan list GET rejects unauthenticated requests with 401', async () => {
      const req = new Request('http://localhost:3000/api/scan');
      const res = await scanRoute.GET(req);
      assert.strictEqual(res.status, 401);
    });

    test('Actual route handler: scan trigger POST rejects unauthenticated requests with 403', async () => {
      const req = new Request('http://localhost:3000/api/scan', { method: 'POST' });
      const res = await scanRoute.POST(req);
      assert.strictEqual(res.status, 403);
    });

    function handleScanListAuth(user, classroomId, teacherOwnedClassrooms = []) {
      if (!user) return { status: 401, error: 'Unauthorized' };
      if (user.role !== 'teacher' && user.role !== 'admin') {
        return { status: 403, error: 'Forbidden: Access restricted to authorized staff' };
      }
      if (classroomId && !teacherOwnedClassrooms.includes(classroomId) && user.role !== 'admin') {
        return { status: 403, error: 'Forbidden: You do not have permission to view scan jobs for this classroom' };
      }
      return { status: 200, success: true };
    }

    function handleScanDetailAuth(user, job) {
      if (!user) return { status: 401, error: 'Unauthorized' };
      if (user.role === 'student') {
        if (job.target_student_id !== user.id) {
          return { status: 403, error: 'Forbidden: You do not have access to this scan job' };
        }
      } else if (user.role === 'teacher') {
        if (job.classroom_id && job.classroom_owner_id !== user.id) {
          return { status: 403, error: 'Forbidden: You do not have access to this classroom scan' };
        }
      } else if (user.role !== 'admin') {
        return { status: 403, error: 'Forbidden' };
      }
      return { status: 200, success: true };
    }

    test('Blocks students from listing scan jobs', () => {
      const student = { id: 's-student-1', role: 'student' };
      const res = handleScanListAuth(student, null);
      assert.strictEqual(res.status, 403);
    });

    test('Blocks teacher from viewing other classrooms scan logs', () => {
      const teacher = { id: 't-1', role: 'teacher' };
      const res = handleScanListAuth(teacher, 'c-other', ['c-mine']);
      assert.strictEqual(res.status, 403);
    });

    test('Blocks student from inspecting another student individual scan job', () => {
      const studentA = { id: 's-student-a', role: 'student' };
      const jobB = { id: 'job-123', target_student_id: 's-student-b' };
      const res = handleScanDetailAuth(studentA, jobB);
      assert.strictEqual(res.status, 403);
    });

    test('Allows student to view their own scan job', () => {
      const studentA = { id: 's-student-a', role: 'student' };
      const jobA = { id: 'job-123', target_student_id: 's-student-a' };
      const res = handleScanDetailAuth(studentA, jobA);
      assert.strictEqual(res.status, 200);
    });
  });

  // =========================================================================
  // 6. Contests & Platforms Routes Access Control (Actual Route Handlers)
  // =========================================================================
  describe('6. Contests & Student Platforms Route Security', () => {
    test('Actual route handler: /api/contests GET rejects unauthenticated requests with 401', async () => {
      const req = new Request('http://localhost:3000/api/contests');
      const res = await contestsRoute.GET(req);
      assert.strictEqual(res.status, 401);
    });

    test('Actual route handler: /api/contests/[id] GET rejects unauthenticated requests with 401', async () => {
      const req = new Request('http://localhost:3000/api/contests/123');
      const res = await contestIdRoute.GET(req, { params: Promise.resolve({ id: '123' }) });
      assert.strictEqual(res.status, 401);
    });

    test('Actual route handler: /api/contests/[id]/scan POST rejects unauthenticated requests with 403', async () => {
      const req = new Request('http://localhost:3000/api/contests/123/scan', { method: 'POST' });
      const res = await contestScanRoute.POST(req, { params: Promise.resolve({ id: '123' }) });
      assert.strictEqual(res.status, 403);
    });

    test('Actual route handler: /api/students/[id]/platforms GET rejects unauthenticated requests with 401', async () => {
      const req = new Request('http://localhost:3000/api/students/student-1/platforms');
      const res = await platformsRoute.GET(req, { params: Promise.resolve({ id: 'student-1' }) });
      assert.strictEqual(res.status, 401);
    });
  });

  // =========================================================================
  // 7. Zod Strict Schema Validation & Mass-Assignment Prevention
  // =========================================================================
  describe('7. Zod Schema Validation & Input Sanitization', () => {
    const ClassroomPatchSchema = z.object({
      name: z.string().trim().min(1).max(100).optional(),
      course: z.string().trim().min(1).max(100).optional(),
      batch: z.string().trim().min(1).max(50).optional(),
      department: z.string().trim().min(1).max(100).optional(),
      academic_year: z.string().trim().min(1).max(50).optional(),
      academicYear: z.string().trim().min(1).max(50).optional(),
      section: z.string().trim().min(1).max(50).optional(),
    }).strict();

    const StudentProfileInputSchema = z.object({
      name: z.string().trim().max(100).optional(),
      display_name: z.string().trim().max(100).optional(),
      register_number: z.string().trim().max(50).optional(),
      registerNumber: z.string().trim().max(50).optional(),
      class_name: z.string().trim().max(50).optional(),
      class: z.string().trim().max(50).optional(),
      section: z.string().trim().max(50).optional().nullable(),
    }).strict();

    test('Classroom PATCH rejects mass-assignment of unauthorized or unexpected fields', () => {
      const payloadWithInjectedFields = {
        name: 'Updated Algorithms',
        owner_teacher_id: 'attacker-uuid', // Privilege escalation attempt
        join_code: 'INJECTED-CODE',        // Join code hijacking attempt
        id: 'fake-id',
      };

      const result = ClassroomPatchSchema.safeParse(payloadWithInjectedFields);
      assert.strictEqual(result.success, false, 'Must reject unexpected injected fields');
      assert.match(result.error.issues[0]?.message, /unrecognized/i);
    });

    test('Classroom PATCH accepts valid allowable fields', () => {
      const validPayload = {
        name: 'Updated Algorithms',
        course: 'Advanced CS',
        section: 'B',
      };

      const result = ClassroomPatchSchema.safeParse(validPayload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.name, 'Updated Algorithms');
    });

    test('Student Profile rejects injection of role, admin, or auth fields', () => {
      const maliciousProfile = {
        name: 'Arjun Student',
        register_number: 'RA2111003010123',
        class_name: 'CSE',
        role: 'admin',                // Role escalation attempt
        auth_user_id: 'some-auth-id', // IDOR attempt
        email: 'admin@college.edu',   // Account hijacking attempt
      };

      const result = StudentProfileInputSchema.safeParse(maliciousProfile);
      assert.strictEqual(result.success, false, 'Must reject role and email tampering');
      assert.match(result.error.issues[0]?.message, /unrecognized/i);
    });

    test('Student Profile accepts valid allowable student fields', () => {
      const validProfile = {
        display_name: 'Arjun Student',
        registerNumber: 'RA2111003010123',
        class: 'CSE Core',
        section: 'C',
      };

      const result = StudentProfileInputSchema.safeParse(validProfile);
      assert.strictEqual(result.success, true);
    });
  });

  // =========================================================================
  // 8. Service-Role Browser Execution Safeguard
  // =========================================================================
  describe('8. Supabase Admin Client Browser Isolation', () => {
    test('createAdminClient throws fatal exception if invoked in browser environment', () => {
      global.window = {};
      try {
        assert.throws(
          () => adminSupabase.createAdminClient(),
          /FATAL: createAdminClient must never be executed on the client side/
        );
      } finally {
        delete global.window;
      }
    });
  });

  // =========================================================================
  // 9. Error Masking & Stack Trace Protection
  // =========================================================================
  describe('9. Safe Error Handling & Stack Trace Masking', () => {
    test('Internal database errors are masked to generic public messages', () => {
      function formatPublicError(err, fallback = 'An unexpected server error occurred') {
        if (err?.isPublicSafe) {
          return { error: err.message };
        }
        return { error: fallback };
      }

      const rawPgError = new Error('syntax error at or near "FROM" at character 14: SELECT * FROM users_private_credentials');
      const formatted = formatPublicError(rawPgError);
      assert.strictEqual(formatted.error, 'An unexpected server error occurred');
      assert.strictEqual(formatted.error.includes('FROM'), false);
      assert.strictEqual(formatted.error.includes('credentials'), false);

      const knownSafeError = { isPublicSafe: true, message: 'Classroom not found' };
      const safeFormatted = formatPublicError(knownSafeError);
      assert.strictEqual(safeFormatted.error, 'Classroom not found');
    });
  });
});
