'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import {
  Code2,
  ChefHat,
  Trophy,
  CheckCircle2,
  Clock,
  Layers,
  GraduationCap,
  ExternalLink,
  Plus,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  User,
  Settings,
  Link2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function StudentDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshClassrooms } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Classroom join state
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  // Security Guard: Prevent teachers from accessing the student dashboard
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'teacher' || user.role === 'admin') {
        router.push('/teacher/dashboard');
      }
    }
  }, [user, authLoading, router]);

  const fetchStudentData = async () => {
    if (!user || user.role !== 'student') return;
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${user.id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'student') {
      fetchStudentData();
    }
  }, [user]);

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoining(true);
    setJoinError(null);
    setJoinSuccess(null);

    try {
      const res = await fetch('/api/classrooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinCode.trim() }),
      });

      const result = await res.json();
      if (!res.ok) {
        setJoinError(result.error || 'Failed to join classroom');
        setJoining(false);
        return;
      }

      setJoinSuccess(`Successfully joined ${result.classroom.name} (${result.classroom.course})!`);
      setJoinCode('');
      await refreshClassrooms();
      await fetchStudentData();
    } catch {
      setJoinError('Network connection failed while joining classroom');
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || (loading && !data)) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Loading your student dashboard...</span>
      </div>
    );
  }

  if (!user || user.role !== 'student') {
    return null;
  }

  const { student, classrooms, leetcode, codechef } = data || {
    student: user,
    classrooms: [],
    leetcode: null,
    codechef: null,
  };

  const lcSnap = leetcode?.snapshot;
  const ccSnap = codechef?.snapshot;
  const lcAccount = leetcode?.account;
  const ccAccount = codechef?.account;

  // Build combined daily activity trend for student
  const dailyMap: Record<string, number> = {};
  for (const d of leetcode?.dailyActivity || []) {
    dailyMap[d.activity_date] = (dailyMap[d.activity_date] || 0) + (d.submission_count || 0);
  }
  for (const d of codechef?.dailyActivity || []) {
    dailyMap[d.activity_date] = (dailyMap[d.activity_date] || 0) + (d.submission_count || 0);
  }

  const dates = Object.keys(dailyMap).sort().slice(-14);
  const trendData = dates.map((date) => ({
    date,
    submissions: dailyMap[date],
  }));

  // Calculate today's submissions (first entry in daily activity if it matches today)
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySubmissions = dailyMap[todayStr] || 0;

  // Calculate yesterday's submissions
  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayStr = yDate.toISOString().split('T')[0];
  const yesterdaySubmissions = dailyMap[yesterdayStr] || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Student Identity Hero Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
              {student.display_name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{student.display_name}</h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>Student Portal</span>
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">{student.email}</div>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                <span>
                  Enrolled in <strong>{classrooms?.length || 0}</strong>{' '}
                  {classrooms?.length === 1 ? 'classroom' : 'classrooms'}
                </span>
                <span>•</span>
                <span>
                  LeetCode:{' '}
                  {lcAccount ? (
                    <strong className="text-amber-600 font-mono">@{lcAccount.username}</strong>
                  ) : (
                    <span className="text-slate-400 italic">Not connected</span>
                  )}
                </span>
                <span>•</span>
                <span>
                  CodeChef:{' '}
                  {ccAccount ? (
                    <strong className="text-orange-600 font-mono">@{ccAccount.username}</strong>
                  ) : (
                    <span className="text-slate-400 italic">Not connected</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Link
              href="/settings"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Link & Manage Handles</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* LeetCode Solved */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">LeetCode Solved</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Code2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{lcSnap?.total_solved ?? 0}</div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] font-semibold flex-wrap">
            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
              E: {lcSnap?.easy_solved ?? 0}
            </span>
            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
              M: {lcSnap?.medium_solved ?? 0}
            </span>
            <span className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded border border-red-200">
              H: {lcSnap?.hard_solved ?? 0}
            </span>
          </div>
        </div>

        {/* CodeChef Solved & Rating */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-orange-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">CodeChef Solved</span>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <ChefHat className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{ccSnap?.total_solved ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Rating:</span>
            <strong className="text-slate-800">
              {ccSnap?.contest_rating ? Math.round(ccSnap.contest_rating) : 'Unrated'}
            </strong>
            {ccSnap?.raw_data?.stars && (
              <span className="text-amber-500 font-bold ml-1">{ccSnap.raw_data.stars}</span>
            )}
          </div>
        </div>

        {/* Today's Submissions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Activity</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{todaySubmissions}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {todaySubmissions > 0 ? (
              <span className="text-emerald-600 font-semibold">Active today (Asia/Kolkata)</span>
            ) : (
              <span>No submissions recorded today</span>
            )}
          </div>
        </div>

        {/* Contest Participations */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Contests Attended</span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {(leetcode?.contests?.length || 0) + (codechef?.contests?.length || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Peak LC: {lcSnap?.highest_rating ? Math.round(lcSnap.highest_rating) : 'N/A'} • Peak CC:{' '}
            {ccSnap?.highest_rating ? Math.round(ccSnap.highest_rating) : 'N/A'}
          </div>
        </div>
      </div>

      {/* 3. Connected Coding Accounts Banner & Join Classroom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coding Accounts Status Card */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600" />
            <span>Coding Profiles</span>
          </h2>

          {/* LeetCode Account Status */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                LC
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">LeetCode</div>
                {lcAccount ? (
                  <a
                    href={lcAccount.public_profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>@{lcAccount.username}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">Handle not linked</div>
                )}
              </div>
            </div>
            {lcAccount ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Connected
              </span>
            ) : (
              <Link
                href="/settings"
                className="text-[11px] font-semibold px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Connect
              </Link>
            )}
          </div>

          {/* CodeChef Account Status */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                CC
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">CodeChef</div>
                {ccAccount ? (
                  <a
                    href={ccAccount.public_profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>@{ccAccount.username}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">Handle not linked</div>
                )}
              </div>
            </div>
            {ccAccount ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Connected
              </span>
            ) : (
              <Link
                href="/settings"
                className="text-[11px] font-semibold px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Connect
              </Link>
            )}
          </div>

          <div className="pt-2 text-[11px] text-slate-400">
            Automated scraper workers sync your verified solves and contest histories during regular classroom scans.
          </div>
        </div>

        {/* My Enrolled Classrooms + Quick Join Box */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Enrolled Classrooms</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {classrooms?.length || 0} active sections
            </span>
          </div>

          {/* Join with Code Inline Box */}
          <form onSubmit={handleJoinClassroom} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Join a New Classroom with Join Code</span>
            </div>

            {joinError && (
              <div className="p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            {joinSuccess && (
              <div className="p-2 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{joinSuccess}</span>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Join Code (e.g. CT-XXXXXX)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={joining || !joinCode.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-xs"
              >
                {joining ? 'Joining...' : 'Join Classroom'}
              </button>
            </div>
          </form>

          {/* Enrolled Classrooms List */}
          {classrooms?.length === 0 ? (
            <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
              <Layers className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
              <div className="text-xs font-semibold text-slate-600">Not enrolled in any classrooms yet</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Obtain a 6-character classroom join code from your teacher and enter it above.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
              {classrooms.map((c: any) => (
                <div
                  key={c.id}
                  className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {c.course} • Sec {c.section}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">{c.academic_year}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">{c.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Dept: {c.department} • Batch: {c.batch}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Daily Submission Trend Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>My Daily Submission Activity (Last 14 Days)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified daily problem submissions calculated across your connected profiles.
            </p>
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
            Asia/Kolkata
          </div>
        </div>

        {trendData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <div className="text-xs font-semibold text-slate-600">No submission history recorded yet</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Connect your handles and submit solutions on LeetCode/CodeChef to generate your activity chart.
            </div>
          </div>
        ) : (
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="studentSubmissionsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="submissions"
                  name="Submissions"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#studentSubmissionsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
