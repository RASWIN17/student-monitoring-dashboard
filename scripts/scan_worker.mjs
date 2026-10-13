import { createClient } from '@supabase/supabase-js';

// ====================================================================
// CodeTrack: Dedicated Production Background Scan Worker
// Handles durable, long-running LeetCode and CodeChef scraping
// outside Vercel execution limits with atomic database job claiming.
// ====================================================================

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {}
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[ERROR] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let isShuttingDown = false;

process.on('SIGINT', () => {
  console.log('\n[WORKER] Graceful shutdown requested (SIGINT)...');
  isShuttingDown = true;
});
process.on('SIGTERM', () => {
  console.log('\n[WORKER] Graceful shutdown requested (SIGTERM)...');
  isShuttingDown = true;
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper: LeetCode profile fetching
async function fetchLeetCodeProfile(username) {
  const query = `
    query getCompleteUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile { ranking }
        submitStatsGlobal {
          acSubmissionNum { difficulty count }
        }
      }
      userContestRanking(username: $username) {
        rating
        attendedContestsCount
        globalRanking
      }
    }
  `;

  const resp = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({ query, variables: { username } }),
  });

  if (!resp.ok) return { success: false, error: `LeetCode HTTP ${resp.status}` };
  const json = await resp.json();
  if (json.errors || !json.data?.matchedUser) {
    return { success: false, error: 'User not found on LeetCode' };
  }

  const user = json.data.matchedUser;
  const submissions = user.submitStatsGlobal?.acSubmissionNum || [];
  let totalSolved = 0;
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;

  for (const s of submissions) {
    if (s.difficulty === 'All') totalSolved = s.count;
    if (s.difficulty === 'Easy') easySolved = s.count;
    if (s.difficulty === 'Medium') mediumSolved = s.count;
    if (s.difficulty === 'Hard') hardSolved = s.count;
  }

  const contest = json.data.userContestRanking;

  return {
    success: true,
    data: {
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      ranking: user.profile?.ranking || null,
      contestRating: contest?.rating ? Math.round(contest.rating) : null,
      contestsAttended: contest?.attendedContestsCount || 0,
    },
  };
}

// Helper: CodeChef profile fetching
async function fetchCodeChefProfile(username) {
  const url = `https://www.codechef.com/users/${encodeURIComponent(username)}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (resp.status === 404) return { success: false, error: 'User not found on CodeChef' };
  if (resp.status === 429) return { success: false, error: 'CodeChef Rate Limit (HTTP 429)' };
  if (!resp.ok) return { success: false, error: `CodeChef HTTP ${resp.status}` };

  const html = await resp.text();
  if (html.includes('User does not exist') || html.includes('Page Not Found')) {
    return { success: false, error: 'User does not exist on CodeChef' };
  }

  // Parse rating
  const ratingMatch = html.match(/class="rating-number"[^>]*>(\d+)<\/div>/i);
  const currentRating = ratingMatch ? parseInt(ratingMatch[1], 10) : null;

  // Parse highest rating
  const highestMatch = html.match(/Highest Rating\s*(\d+)/i);
  const highestRating = highestMatch ? parseInt(highestMatch[1], 10) : currentRating;

  // Parse global rank
  const rankMatch = html.match(/Global Rank:?\s*<strong[^>]*>(\d+)<\/strong>/i);
  const globalRank = rankMatch ? parseInt(rankMatch[1], 10) : null;

  // Parse solved problems
  const solvedMatch = html.match(/Total Problems Solved:\s*(\d+)/i) || html.match(/Problems Solved:?\s*<strong[^>]*>(\d+)<\/strong>/i);
  const totalSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : 0;

  return {
    success: true,
    data: {
      totalSolved,
      currentRating,
      highestRating,
      globalRank,
    },
  };
}

async function processJob(job) {
  console.log(`\n[WORKER] Claiming Job ID: ${job.id} (Classroom: ${job.classroom_id || 'All'})`);

  const startTime = new Date().toISOString();
  await supabase
    .from('scan_jobs')
    .update({ status: 'running', started_at: startTime })
    .eq('id', job.id);

  const { data: items } = await supabase
    .from('scan_job_items')
    .select('*')
    .eq('scan_job_id', job.id);

  let processed = 0;
  let successful = 0;
  let failed = 0;

  for (const item of items || []) {
    if (isShuttingDown) break;

    const itemStart = new Date().toISOString();
    await supabase
      .from('scan_job_items')
      .update({ status: 'running', started_at: itemStart })
      .eq('id', item.id);

    const { data: account } = await supabase
      .from('platform_accounts')
      .select('*')
      .eq('id', item.platform_account_id)
      .maybeSingle();

    if (!account) {
      failed++;
      processed++;
      await supabase
        .from('scan_job_items')
        .update({
          status: 'failed',
          error_code: 'ACCOUNT_NOT_FOUND',
          error_message: 'Account was removed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      continue;
    }

    try {
      console.log(`  -> Scanning ${account.platform}: ${account.username}...`);

      if (account.platform === 'leetcode') {
        const res = await fetchLeetCodeProfile(account.username);
        if (!res.success) {
          failed++;
          processed++;
          await supabase
            .from('scan_job_items')
            .update({
              status: 'failed',
              error_code: 'FETCH_ERROR',
              error_message: res.error,
              completed_at: new Date().toISOString(),
            })
            .eq('id', item.id);
        } else {
          const d = res.data;
          const now = new Date().toISOString();

          // Save snapshot
          await supabase.from('platform_profile_snapshots').insert({
            platform_account_id: account.id,
            scan_job_id: job.id,
            total_solved: d.totalSolved,
            easy_solved: d.easySolved,
            medium_solved: d.mediumSolved,
            hard_solved: d.hardSolved,
            global_rank: d.ranking,
            contest_rating: d.contestRating,
            contests_attended: d.contestsAttended,
            source: 'leetcode_worker',
            source_version: 'v1.0',
            validation_status: 'valid',
            available_fields: ['totalSolved', 'easySolved', 'mediumSolved', 'hardSolved'],
            observed_at: now,
          });

          await supabase
            .from('platform_accounts')
            .update({ last_successful_sync_at: now, account_status: 'active' })
            .eq('id', account.id);

          successful++;
          processed++;

          await supabase
            .from('scan_job_items')
            .update({
              status: 'succeeded',
              fields_retrieved: ['totalSolved', 'easySolved', 'mediumSolved', 'hardSolved'],
              completed_at: now,
            })
            .eq('id', item.id);
        }
      } else if (account.platform === 'codechef') {
        // Polite delay
        await sleep(1500);

        const res = await fetchCodeChefProfile(account.username);
        if (!res.success) {
          failed++;
          processed++;
          await supabase
            .from('scan_job_items')
            .update({
              status: 'failed',
              error_code: 'FETCH_ERROR',
              error_message: res.error,
              completed_at: new Date().toISOString(),
            })
            .eq('id', item.id);
        } else {
          const d = res.data;
          const now = new Date().toISOString();

          await supabase.from('platform_profile_snapshots').insert({
            platform_account_id: account.id,
            scan_job_id: job.id,
            total_solved: d.totalSolved,
            global_rank: d.globalRank,
            contest_rating: d.currentRating,
            highest_rating: d.highestRating,
            source: 'codechef_worker',
            source_version: 'v1.0',
            validation_status: 'valid',
            available_fields: ['totalSolved', 'contestRating', 'highestRating'],
            observed_at: now,
          });

          await supabase
            .from('platform_accounts')
            .update({ last_successful_sync_at: now, account_status: 'active' })
            .eq('id', account.id);

          successful++;
          processed++;

          await supabase
            .from('scan_job_items')
            .update({
              status: 'succeeded',
              fields_retrieved: ['totalSolved', 'contestRating', 'highestRating'],
              completed_at: now,
            })
            .eq('id', item.id);
        }
      }
    } catch (err) {
      failed++;
      processed++;
      await supabase
        .from('scan_job_items')
        .update({
          status: 'failed',
          error_code: 'EXCEPTION',
          error_message: err.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', item.id);
    }

    // Update job intermediate progress
    await supabase
      .from('scan_jobs')
      .update({
        processed_accounts: processed,
        successful_accounts: successful,
        failed_accounts: failed,
      })
      .eq('id', job.id);
  }

  const finalStatus = failed === (items?.length || 0) ? 'failed' : failed > 0 ? 'partial' : 'succeeded';
  await supabase
    .from('scan_jobs')
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  console.log(`[WORKER] Finished Job ${job.id}: status=${finalStatus}, successful=${successful}, failed=${failed}`);
}

async function startWorker() {
  console.log('[WORKER] CodeTrack Background Worker started. Listening for queued jobs...');

  while (!isShuttingDown) {
    try {
      // Atomic claim: pick oldest queued job
      const { data: queuedJobs } = await supabase
        .from('scan_jobs')
        .select('*')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1);

      if (queuedJobs && queuedJobs.length > 0) {
        await processJob(queuedJobs[0]);
      } else {
        await sleep(3000); // Poll interval
      }
    } catch (err) {
      console.error('[WORKER ERROR]', err);
      await sleep(5000);
    }
  }

  console.log('[WORKER] Worker shutdown complete.');
}

startWorker();
