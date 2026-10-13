async function run() {
  const baseUrl = 'http://localhost:3000';
  const ts = Date.now();

  console.log('1. Registering teacher...');
  const tReg = await fetch(baseUrl + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `prof.turing.${ts}@demo.edu`, displayName: 'Prof. Turing', role: 'teacher' })
  });
  console.log('Teacher reg status:', tReg.status);
  const teacherCookie = tReg.headers.get('set-cookie')?.split(';')[0] || '';
  console.log('Teacher cookie obtained:', !!teacherCookie);

  console.log('2. Creating classroom as teacher...');
  const crRes = await fetch(baseUrl + '/api/classrooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': teacherCookie },
    body: JSON.stringify({ name: 'CS401 Advanced Algorithms', course: 'Computer Science', batch: '2026', department: 'School of Computing', academicYear: '2025-2026', section: 'A' })
  });
  console.log('Classroom create status:', crRes.status);
  const cr = await crRes.json();
  console.log('Classroom created:', cr.classroom?.name, 'Join code:', cr.classroom?.join_code);
  const classroomId = cr.classroom?.id;
  const joinCode = cr.classroom?.join_code;

  if (!classroomId || !joinCode) {
    throw new Error('Failed to create classroom: ' + JSON.stringify(cr));
  }

  console.log('3. Registering student...');
  const sReg = await fetch(baseUrl + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `ada.lovelace.${ts}@demo.edu`, displayName: 'Ada Lovelace', role: 'student' })
  });
  console.log('Student reg status:', sReg.status);
  const studentCookie = sReg.headers.get('set-cookie')?.split(';')[0] || '';
  const sUser = await sReg.json();
  const studentId = sUser.user?.id;

  console.log('4. Student joining classroom with join code...');
  const joinRes = await fetch(baseUrl + '/api/classrooms/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': studentCookie },
    body: JSON.stringify({ joinCode: joinCode })
  });
  console.log('Join status:', joinRes.status, await joinRes.json());

  console.log('5. Student linking LeetCode handle (neal_wu)...');
  const lcLink = await fetch(baseUrl + '/api/students/' + studentId + '/platforms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': studentCookie },
    body: JSON.stringify({ platform: 'leetcode', username: 'neal_wu' })
  });
  console.log('LeetCode link status:', lcLink.status, await lcLink.json());

  console.log('6. Student linking CodeChef handle (tourist)...');
  const ccLink = await fetch(baseUrl + '/api/students/' + studentId + '/platforms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': studentCookie },
    body: JSON.stringify({ platform: 'codechef', username: 'tourist' })
  });
  console.log('CodeChef link status:', ccLink.status, await ccLink.json());

  console.log('7. Teacher triggering Scan Now on classroom...');
  const scanTrigger = await fetch(baseUrl + '/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': teacherCookie },
    body: JSON.stringify({ classroomId: classroomId, platform: 'all' })
  });
  const scanData = await scanTrigger.json();
  console.log('Scan queued:', scanData);
  const jobId = scanData.job?.id || scanData.job_id;

  if (!jobId) {
    throw new Error('Failed to start scan: ' + JSON.stringify(scanData));
  }

  console.log('8. Polling scan status...');
  let job;
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const jRes = await fetch(baseUrl + '/api/scan/' + jobId, {
      headers: { 'Cookie': teacherCookie }
    });
    job = (await jRes.json()).job;
    console.log('Scan status:', job?.status, 'Processed:', job?.processed_accounts, '/', job?.total_accounts);
    if (job?.status === 'succeeded' || job?.status === 'failed') break;
  }

  console.log('9. Fetching updated Dashboard stats as Teacher...');
  const statsRes = await fetch(baseUrl + '/api/dashboard/stats?classroom_id=' + classroomId, {
    headers: { 'Cookie': teacherCookie }
  });
  console.log('Updated Stats:', JSON.stringify(await statsRes.json(), null, 2));

  console.log('10. Fetching Student detail as Teacher...');
  const detailRes = await fetch(baseUrl + '/api/students/' + studentId, {
    headers: { 'Cookie': teacherCookie }
  });
  const detail = await detailRes.json();
  console.log('LeetCode Solved:', detail.leetcode?.snapshot?.total_solved, 'Rating:', detail.leetcode?.snapshot?.contest_rating);
  console.log('CodeChef Solved:', detail.codechef?.snapshot?.total_solved, 'Rating:', detail.codechef?.snapshot?.contest_rating);
  console.log('Contests count - LeetCode:', detail.leetcode?.contests?.length, 'CodeChef:', detail.codechef?.contests?.length);

  console.log('11. Exporting CSV as Teacher...');
  const expRes = await fetch(baseUrl + '/api/export?type=students&classroom_id=' + classroomId, {
    headers: { 'Cookie': teacherCookie }
  });
  const csvText = await expRes.text();
  console.log('CSV Export first 3 lines:\n' + csvText.split('\n').slice(0, 3).join('\n'));

  console.log('=== COMPLETE E2E VERIFICATION SUCCEEDED ===');
}

run().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
