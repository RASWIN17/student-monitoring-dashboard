'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { dataCache } from '@/components/DataCacheContext';
import { ScanModal } from '@/components/ScanModal';
import { LeetCodeIcon, CodeChefIcon } from '@/components/PlatformIcons';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Code2,
  ChefHat,
  Trophy,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Plus,
  HelpCircle,
  Clock,
  Layers,
  GraduationCap,
  Play,
  FileSpreadsheet,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const TeacherActivityChart = dynamic(
  () => import('@/components/TeacherActivityChart').then((m) => m.TeacherActivityChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full flex items-center justify-center text-slate-400 text-xs bg-slate-50/50 rounded-lg">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-500 mr-2" />
        <span>Loading activity trends...</span>
      </div>
    ),
  }
);

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { user, selectedClassroom, classrooms, loading: authLoading } = useAuth();
  const cacheKey = `teacher:dashboard:stats:${selectedClassroom?.id || 'all'}`;
  const [stats, setStats] = useState<any>(() => dataCache.get(cacheKey) || null);
  const [loading, setLoading] = useState(() => !dataCache.get(cacheKey));
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // Security Guard: Prevent students from accessing the teacher dashboard
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'student') {
        router.replace('/classrooms');
      }
    }
  }, [user, authLoading, router]);

  const fetchStats = async (force = false) => {
    if (!user || user.role === 'student') return;
    if (!force && dataCache.get(cacheKey)) return;
    if (!dataCache.get(cacheKey)) setLoading(true);
    try {
      const url = selectedClassroom
        ? `/api/dashboard/stats?classroomId=${selectedClassroom.id}`
        : '/api/dashboard/stats';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        dataCache.set(cacheKey, data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'teacher' || user.role === 'admin')) {
      const cached = dataCache.get(cacheKey);
      if (cached) {
        setStats(cached);
        setLoading(false);
      } else {
        fetchStats();
      }
    }
  }, [user, cacheKey]);

  if (authLoading || (loading && !stats)) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Loading real-time classroom analytics...</span>
      </div>
    );
  }

  if (!user || user.role === 'student') {
    return null;
  }

  // Teacher has no classrooms yet
  if (classrooms.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
        <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">No Classrooms Found</h2>
        <p className="text-xs text-slate-500 mb-6">
          You haven&apos;t created any classrooms yet. Create your first classroom section to generate a join code and begin monitoring your students&apos; verified coding activity.
        </p>
        <Link
          href="/classrooms"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Create Classroom</span>
        </Link>
      </div>
    );
  }

  const kpis = stats?.kpis || {
    totalEnrolled: 0,
    activeToday: 0,
    activeYesterday: 0,
    dataUnavailableCount: 0,
    staleCount: 0,
    unlinkedCount: 0,
    leetcodeTotalSolved: 0,
    codechefTotalSolved: 0,
    totalContestsParticipated: 0,
  };

  const trends = stats?.trends || [];
  const platforms = stats?.platforms || { leetcodeCount: 0, codechefCount: 0 };

  return (
    <div className="space-y-6">
      {/* Top Banner / Classroom Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 break-words">
              {selectedClassroom ? selectedClassroom.name : 'All Classrooms Analytics'}
            </h1>
            {selectedClassroom && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Section {selectedClassroom.section}
              </span>
            )}
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Teacher Portal</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
            <span>Academic Year: {selectedClassroom?.academic_year || 'Current'}</span>
            <span>•</span>
            <span>Batch: {selectedClassroom?.batch || 'All'}</span>
            {selectedClassroom && (
              <>
                <span>•</span>
                <span className="font-mono text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                  Join Code: {selectedClassroom.join_code}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          {selectedClassroom?.last_scan_at ? (
            <div className="text-left sm:text-right text-xs mr-1">
              <div className="text-slate-400">Last scanned</div>
              <div className="font-semibold text-slate-700">
                {new Date(selectedClassroom.last_scan_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic mr-1">No scan performed yet</div>
          )}

          <button
            onClick={() => setIsScanModalOpen(true)}
            className="px-3.5 py-2 min-h-[40px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Scan Now</span>
          </button>

          <Link
            href="/students"
            className="px-3.5 py-2 min-h-[40px] bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <span>View Roster</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Enrolled */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Enrolled Students</span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.totalEnrolled}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {kpis.totalEnrolled === 0 ? 'No students enrolled' : 'Verified database enrollment'}
          </div>
        </div>

        {/* Active Today */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Active Today</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.activeToday}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Verified submissions today (Asia/Kolkata)
          </div>
        </div>

        {/* Active Yesterday */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Active Yesterday</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.activeYesterday}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">
            Verified submissions yesterday
          </div>
        </div>

        {/* Data Unavailable / Error */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-red-700 mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Data Unavailable</span>
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.dataUnavailableCount}</div>
          <div className="text-[11px] text-red-600 font-medium mt-1">
            {kpis.dataUnavailableCount > 0 ? 'Scraper failure / requires retry' : 'No connector errors'}
          </div>
        </div>
      </div>

      {/* Platform Solved & Contest Totals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* LeetCode Total Solved */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 shrink-0">
                <LeetCodeIcon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">LeetCode Solved</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {platforms.leetcodeCount} linked
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.leetcodeTotalSolved}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Unique problems solved across all verified LeetCode profiles.
          </p>
        </div>

        {/* CodeChef Total Solved */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 shrink-0">
                <CodeChefIcon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">CodeChef Solved</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {platforms.codechefCount} linked
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.codechefTotalSolved}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Total verified problems solved on CodeChef (reported separately).
          </p>
        </div>

        {/* Contest Participations */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                <Trophy className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Contest History</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Recorded</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{kpis.totalContestsParticipated}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Total rated contest attendances verified in platform histories.
          </p>
        </div>
      </div>

      {/* Daily Activity Trends Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-2xs min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Daily Student Activity Trend (Last 14 Days)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Active student counts calculated from verified Asia/Kolkata daily submission records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/reports"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </Link>
          </div>
        </div>

        {trends.length === 0 ? (
          <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <div className="text-xs font-semibold text-slate-600">No daily activity records yet</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Click &quot;Scan Now&quot; to fetch and store verified student submission heatmaps.
            </div>
          </div>
        ) : (
          <TeacherActivityChart trends={trends} />
        )}
      </div>

      {/* Classroom Scan Modal */}
      <ScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onScanCompleted={() => {
          fetchStats(true);
        }}
      />
    </div>
  );
}
