'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserProfile, PlatformAccount, PlatformProfileSnapshot, ContestRecord } from '@/lib/types';
import { dataCache } from '@/components/DataCacheContext';
import {
  Code2,
  ExternalLink,
  RefreshCw,
  Trophy,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Link2,
  Clock,
  Award,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface StudentLeetCodeAnalyticsProps {
  user: UserProfile;
}

export function StudentLeetCodeAnalytics({ user }: StudentLeetCodeAnalyticsProps) {
  const cacheKey = `student:leetcode:${user.id}`;
  const [data, setData] = useState<{
    connected: boolean;
    account: PlatformAccount | null;
    snapshot: PlatformProfileSnapshot | null;
    contests: ContestRecord[];
    state: 'connected' | 'not_connected' | 'loading' | 'data_unavailable' | 'no_statistics';
    warning?: string;
  } | null>(() => dataCache.get(cacheKey) || null);

  const [loading, setLoading] = useState(() => !dataCache.get(cacheKey));
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  const fetchAnalytics = async (force = false) => {
    if (!force && cacheKey && dataCache.get(cacheKey)) return;
    if (!cacheKey || !dataCache.get(cacheKey)) setLoading(true);
    setSyncError(null);

    try {
      const res = await fetch('/api/students/me/analytics?platform=leetcode');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (cacheKey) dataCache.set(cacheKey, json);
      } else {
        setData({
          connected: true,
          account: null,
          snapshot: null,
          contests: [],
          state: 'data_unavailable',
        });
      }
    } catch {
      setData({
        connected: true,
        account: null,
        snapshot: null,
        contests: [],
        state: 'data_unavailable',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = dataCache.get(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      fetchAnalytics();
    }
  }, [user.id, cacheKey]);

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);

    try {
      const res = await fetch('/api/students/me/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'leetcode' }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setSyncError(json.error || 'Unable to fetch data from LeetCode. Data temporarily unavailable.');
      } else {
        setSyncSuccess('LeetCode data synced successfully!');
        if (cacheKey) dataCache.invalidate(cacheKey);
        await fetchAnalytics(true);
      }
    } catch {
      setSyncError('Network connection failed while syncing with LeetCode.');
    } finally {
      setSyncing(false);
    }
  };

  // State 3: Loading
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
        <span className="text-sm font-medium">Fetching your verified LeetCode metrics...</span>
      </div>
    );
  }

  // State 2: Not Connected
  if (!data?.connected || !data.account) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">LeetCode Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Personal problem solving performance and contest history.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900">LeetCode Account Not Connected</h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            You haven&apos;t connected your public LeetCode handle yet. Link your username to start tracking your solved problems, acceptance rate, and contest performance.
          </p>
          <div className="mt-6">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
            >
              <span>Connect LeetCode Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { account, snapshot, contests, state } = data;

  // State 4: Data Unavailable
  if (state === 'data_unavailable' && !snapshot) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">LeetCode Analytics</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Connected handle: <span className="font-semibold text-slate-800">@{account.username}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">Unable to Fetch LeetCode Data</h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
            We could not retrieve your statistics from LeetCode. The service may be temporarily unavailable or rate limited.
          </p>
          <div className="mt-5">
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Retrying...' : 'Retry Connection'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 5: No Verified Statistics
  if (state === 'no_statistics' && !snapshot) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">LeetCode Analytics</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Connected handle: <span className="font-semibold text-slate-800">@{account.username}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">No Verified Statistics Yet</h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
            Your LeetCode handle @{account.username} is connected, but no profile snapshot has been synchronized yet. Click below to fetch your current statistics.
          </p>
          <div className="mt-5">
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Fetching...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 1: Connected with Real Verified Data
  const lastUpdated = snapshot?.observed_at || account.last_successful_sync_at;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">LeetCode Analytics</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Connected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time verified metrics for currently logged-in student.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {account.public_profile_url && (
            <a
              href={account.public_profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              <span>@{account.username}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          )}

          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
            title="Refresh verified data from LeetCode"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Sync Banners */}
      {syncSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncSuccess}</span>
        </div>
      )}

      {syncError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{syncError}</span>
        </div>
      )}

      {/* Last Updated Timestamp Notice */}
      {lastUpdated && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Last verified from LeetCode: {new Date(lastUpdated).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (Asia/Kolkata)
            </span>
          </div>
          <span className="text-slate-400">Strictly verified data</span>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Solved */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500 font-medium">Total Problems Solved</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {snapshot?.total_solved != null ? snapshot.total_solved : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Accuracy:</span>
            <span className="font-semibold text-slate-700">
              {snapshot?.acceptance_rate != null ? `${snapshot.acceptance_rate.toFixed(1)}%` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Global Rank */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500 font-medium">Global Ranking</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {snapshot?.global_rank != null ? `#${snapshot.global_rank.toLocaleString()}` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Verified on public profile</div>
        </div>

        {/* Contest Rating */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500 font-medium">Contest Rating</div>
          <div className="text-2xl font-bold text-amber-600 mt-1 font-mono">
            {snapshot?.contest_rating != null ? Math.round(snapshot.contest_rating) : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {snapshot?.contests_attended != null
              ? `${snapshot.contests_attended} Contests Attended`
              : 'Official rating'}
          </div>
        </div>

        {/* Submissions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500 font-medium">Accepted Submissions</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {snapshot?.accepted_submissions != null
              ? snapshot.accepted_submissions.toLocaleString()
              : snapshot?.total_submissions != null
              ? snapshot.total_submissions.toLocaleString()
              : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {snapshot?.total_submissions != null ? `${snapshot.total_submissions} total attempts` : 'Verified submissions'}
          </div>
        </div>
      </div>

      {/* Difficulty Breakdown Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-500" />
          <span>Difficulty Breakdown</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Easy */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Easy</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {snapshot?.easy_solved != null ? snapshot.easy_solved : 'N/A'}
            </div>
            <p className="text-[11px] text-emerald-600/90 mt-0.5">Foundational concepts</p>
          </div>

          {/* Medium */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
            <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Medium</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {snapshot?.medium_solved != null ? snapshot.medium_solved : 'N/A'}
            </div>
            <p className="text-[11px] text-amber-600/90 mt-0.5">Core algorithms & structures</p>
          </div>

          {/* Hard */}
          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/80">
            <div className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Hard</div>
            <div className="text-2xl font-bold text-rose-700 mt-1">
              {snapshot?.hard_solved != null ? snapshot.hard_solved : 'N/A'}
            </div>
            <p className="text-[11px] text-rose-600/90 mt-0.5">Advanced competitive topics</p>
          </div>
        </div>
      </div>

      {/* Verified Contest Participation History */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Verified Contest History</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical contests in which you participated on LeetCode.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {contests.length} {contests.length === 1 ? 'Contest' : 'Contests'}
          </span>
        </div>

        {contests.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-slate-700">No verified contest records found</h3>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Contest participation records will appear here after you attend official LeetCode weekly or biweekly contests.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Contest Name</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Problems Solved</th>
                  <th className="py-2.5 px-3 text-right">Rating After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contests.map((c) => (
                  <tr key={c.id || c.contest_name} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {c.contest_name}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {c.contest_date ? new Date(c.contest_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                      {c.rank != null ? `#${c.rank.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      {c.problems_solved != null ? (
                        <span className="font-semibold text-slate-800">
                          {c.problems_solved} {c.total_problems != null ? `/ ${c.total_problems}` : 'solved'}
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-600">
                      {c.rating_after != null ? Math.round(c.rating_after) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
