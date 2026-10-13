'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { StudentPerformanceOverview } from '@/lib/types';
import { ScanModal } from '@/components/ScanModal';
import {
  Code2,
  Users,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  Eye,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowLeft,
  GraduationCap,
  Trophy,
  ChefHat,
  Percent,
} from 'lucide-react';

export default function LeetCodeStudentsPage() {
  const { selectedClassroom, user } = useAuth();
  const [students, setStudents] = useState<StudentPerformanceOverview[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('solved_desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  // Single student scan modal
  const [scanStudent, setScanStudent] = useState<{ id: string; name: string } | null>(null);
  const [isClassroomScanOpen, setIsClassroomScanOpen] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const fetchStudents = async () => {
    if (!selectedClassroom) {
      setStudents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${selectedClassroom.id}/students`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error('Failed to load students for LeetCode:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClassroom]);

  // Derived filtered & sorted list
  const filteredAndSortedStudents = useMemo(() => {
    // 1. Filter
    const filtered = students.filter((item) => {
      const s = item.student;
      const lc = item.leetcodeAccount;
      const snap = item.leetcodeSnapshot;
      const today = item.leetcodeTodayActivity;

      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchName = s.display_name?.toLowerCase().includes(term);
        const matchEmail = s.email?.toLowerCase().includes(term);
        const matchUsername = lc?.username?.toLowerCase().includes(term);
        if (!matchName && !matchEmail && !matchUsername) return false;
      }

      // Status Filter
      if (statusFilter === 'linked' && !lc) return false;
      if (statusFilter === 'unlinked' && lc) return false;
      if (statusFilter === 'error' && lc?.account_status !== 'error' && lc?.account_status !== 'not_found') return false;

      // Activity Filter
      if (activityFilter === 'active_today' && today?.activity_status !== 'active') return false;
      if (activityFilter === 'no_activity_today' && today?.activity_status !== 'no_activity') return false;

      return true;
    });

    // 2. Sort
    return filtered.sort((a, b) => {
      const aSnap = a.leetcodeSnapshot;
      const bSnap = b.leetcodeSnapshot;

      switch (sortBy) {
        case 'solved_desc': {
          // Highest Problems Solved to Lowest
          const aVal = aSnap?.total_solved ?? -1;
          const bVal = bSnap?.total_solved ?? -1;
          if (aVal !== bVal) return bVal - aVal;
          return a.student.display_name.localeCompare(b.student.display_name);
        }
        case 'solved_asc': {
          // Lowest Problems Solved to Highest (unlinked at end)
          const aVal = aSnap?.total_solved ?? 9999999;
          const bVal = bSnap?.total_solved ?? 9999999;
          if (aVal !== bVal) return aVal - bVal;
          return a.student.display_name.localeCompare(b.student.display_name);
        }
        case 'rank_asc': {
          // Highest Rank to Lowest Rank (Rank 1 is best, followed by 2, 3...)
          // If student has no rank or unlinked, place at the bottom
          const aRank = aSnap?.global_rank && aSnap.global_rank > 0 ? aSnap.global_rank : 999999999;
          const bRank = bSnap?.global_rank && bSnap.global_rank > 0 ? bSnap.global_rank : 999999999;
          if (aRank !== bRank) return aRank - bRank;
          return a.student.display_name.localeCompare(b.student.display_name);
        }
        case 'rank_desc': {
          // Lowest Rank to Highest Rank
          const aRank = aSnap?.global_rank && aSnap.global_rank > 0 ? aSnap.global_rank : -1;
          const bRank = bSnap?.global_rank && bSnap.global_rank > 0 ? bSnap.global_rank : -1;
          if (aRank !== bRank) return bRank - aRank;
          return a.student.display_name.localeCompare(b.student.display_name);
        }
        case 'rating_desc': {
          // Highest Contest Rating to Lowest
          const aRating = aSnap?.contest_rating ?? -1;
          const bRating = bSnap?.contest_rating ?? -1;
          if (aRating !== bRating) return bRating - aRating;
          return a.student.display_name.localeCompare(b.student.display_name);
        }
        case 'rating_asc': {
          // Lowest Contest Rating to Highest
          const aRating = aSnap?.contest_rating ?? 999999;
          const bRating = bSnap?.contest_rating ?? 999999;
          if (aRating !== bRating) return aRating - bRating;
          return a.student.display_name.localeCompare(b.student.display_name);
        }
        case 'name_asc': {
          return a.student.display_name.localeCompare(b.student.display_name);
        }
        case 'name_desc': {
          return b.student.display_name.localeCompare(a.student.display_name);
        }
        default:
          return 0;
      }
    });
  }, [students, searchTerm, sortBy, statusFilter, activityFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setSortBy('solved_desc');
    setStatusFilter('all');
    setActivityFilter('all');
  };

  if (user && !isTeacher) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-xl border border-red-200 p-8 text-center shadow-xs">
        <div className="h-12 w-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-500 mb-6">
          The LeetCode student performance page is only accessible to verified teachers and instructors.
        </p>
        <Link
          href="/student/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
        >
          Go to Student Dashboard
        </Link>
      </div>
    );
  }

  // Summary Metrics
  const totalStudentsCount = students.length;
  const linkedCount = students.filter((s) => !!s.leetcodeAccount).length;
  const totalSolvedCount = students.reduce(
    (acc, s) => acc + (s.leetcodeSnapshot?.total_solved || 0),
    0
  );
  const activeTodayCount = students.filter(
    (s) => s.leetcodeTodayActivity?.activity_status === 'active'
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/students"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Students Hub</span>
          </Link>

          {/* Quick Platform Switcher */}
          <div className="inline-flex items-center rounded-lg bg-slate-100 p-1 text-xs">
            <Link
              href="/students/codechef"
              className="px-3 py-1 rounded-md text-slate-600 hover:text-slate-900 font-medium transition flex items-center gap-1.5"
            >
              <ChefHat className="w-3.5 h-3.5 text-orange-600" />
              <span>Switch to CodeChef</span>
            </Link>
            <span className="px-3 py-1 rounded-md bg-white text-amber-600 font-bold shadow-2xs flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              <span>LeetCode</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStudents}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition disabled:opacity-50"
            title="Refresh LeetCode Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsClassroomScanOpen(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Scan LeetCode Profiles</span>
          </button>
        </div>
      </div>

      {/* Main Page Title Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-bold shrink-0">
              <Code2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  LeetCode Students Roster
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Official LeetCode Data
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {selectedClassroom
                  ? `Complete student performance roster for ${selectedClassroom.name} (${selectedClassroom.course} - Section ${selectedClassroom.section})`
                  : 'Select a classroom to view enrolled students'}
              </p>
            </div>
          </div>
        </div>

        {/* Total Number of Students & Summary Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          {/* Total Students Counter */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Total Students</span>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {totalStudentsCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Enrolled in classroom</div>
          </div>

          {/* Linked Profiles Counter */}
          <div className="bg-amber-50/50 rounded-xl p-3.5 border border-amber-200/60">
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Linked Handles</span>
            </div>
            <div className="text-2xl font-black text-amber-950 mt-1">
              {linkedCount}
            </div>
            <div className="text-[11px] text-amber-700/80 mt-0.5">
              {totalStudentsCount > 0
                ? `${Math.round((linkedCount / totalStudentsCount) * 100)}% coverage`
                : '0% coverage'}
            </div>
          </div>

          {/* Problems Solved */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Problems Solved</span>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {totalSolvedCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Total solved on LeetCode</div>
          </div>

          {/* Active Today */}
          <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200/60">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Active Today</span>
            </div>
            <div className="text-2xl font-black text-emerald-950 mt-1">
              {activeTodayCount}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">Asia/Kolkata timezone</div>
          </div>
        </div>
      </div>

      {/* Filter and Sorting Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, email, or LeetCode username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* SORTING FILTERS: Problems Solved & Rank */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
              <span>Sort:</span>
            </div>
            <select
              aria-label="Sort Students"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="solved_desc">Problems Solved: Highest to Lowest</option>
              <option value="solved_asc">Problems Solved: Lowest to Highest</option>
              <option value="rank_asc">Rank: Highest Rank to Lowest Rank</option>
              <option value="rank_desc">Rank: Lowest Rank to Highest Rank</option>
              <option value="rating_desc">Contest Rating: Highest to Lowest</option>
              <option value="rating_asc">Contest Rating: Lowest to Highest</option>
              <option value="name_asc">Student Name: A to Z</option>
              <option value="name_desc">Student Name: Z to A</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            aria-label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="all">All Handles</option>
            <option value="linked">LeetCode Linked Only</option>
            <option value="unlinked">Not Linked</option>
            <option value="error">Error / Unreachable</option>
          </select>

          {/* Activity Filter */}
          <select
            aria-label="Filter by Activity"
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="all">All Activity</option>
            <option value="active_today">Active Today</option>
            <option value="no_activity_today">No Activity Today</option>
          </select>

          {/* Reset Filters */}
          <button
            onClick={resetFilters}
            className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            title="Reset Filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Active Sort & Filter Indicator */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <div>
            Showing <span className="font-semibold text-slate-800">{filteredAndSortedStudents.length}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalStudentsCount}</span> students
          </div>
          <div className="text-amber-700 font-medium">
            Active sort:{' '}
            <span className="font-bold">
              {sortBy === 'solved_desc' && 'Problems Solved (Highest to Lowest)'}
              {sortBy === 'solved_asc' && 'Problems Solved (Lowest to Highest)'}
              {sortBy === 'rank_asc' && 'Rank (Highest Rank to Lowest Rank)'}
              {sortBy === 'rank_desc' && 'Rank (Lowest Rank to Highest Rank)'}
              {sortBy === 'rating_desc' && 'Contest Rating (Highest to Lowest)'}
              {sortBy === 'rating_asc' && 'Contest Rating (Lowest to Highest)'}
              {sortBy === 'name_asc' && 'Name (A to Z)'}
              {sortBy === 'name_desc' && 'Name (Z to A)'}
            </span>
          </div>
        </div>
      </div>

      {/* LeetCode Student Details Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-amber-600" />
            <span className="text-xs font-semibold">Loading student LeetCode records...</span>
          </div>
        ) : filteredAndSortedStudents.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <HelpCircle className="w-9 h-9 mx-auto mb-2 text-slate-300" />
            <div className="text-sm font-semibold text-slate-700">No students match current filters</div>
            <p className="text-xs text-slate-400 mt-1">
              {students.length === 0
                ? 'No students enrolled in this classroom yet. Share your join code.'
                : 'Try adjusting your search criteria or resetting filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">LeetCode Handle</th>
                  <th className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center gap-1 text-amber-700 font-bold">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Problems Solved</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center">Difficulty Breakdown</th>
                  <th className="py-3.5 px-4 text-center">Global Rank</th>
                  <th className="py-3.5 px-4 text-center">Contest Rating</th>
                  <th className="py-3.5 px-4 text-center">Acceptance Rate</th>
                  <th className="py-3.5 px-4 text-center">Contests Attended</th>
                  <th className="py-3.5 px-4 text-center">Today Status</th>
                  <th className="py-3.5 px-4 text-center">Last Synced</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAndSortedStudents.map((item, idx) => {
                  const s = item.student;
                  const lc = item.leetcodeAccount;
                  const snap = item.leetcodeSnapshot;
                  const today = item.leetcodeTodayActivity;
                  const isActiveToday = (today?.submission_count || 0) > 0 || today?.activity_status === 'active';

                  return (
                    <tr key={s.id} className="hover:bg-amber-50/20 transition">
                      {/* Index / Number */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Student info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{s.display_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.email}</div>
                      </td>

                      {/* LeetCode Handle */}
                      <td className="py-3.5 px-4">
                        {lc ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                              {lc.username}
                            </span>
                            <a
                              href={lc.public_profile_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-amber-600 transition"
                              title="Open LeetCode Public Profile"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not linked</span>
                        )}
                      </td>

                      {/* Problems Solved */}
                      <td className="py-3.5 px-4 text-center">
                        {snap?.total_solved !== null && snap?.total_solved !== undefined ? (
                          <span className="inline-block px-2.5 py-1 bg-amber-100 text-amber-950 font-bold rounded-lg text-xs font-mono">
                            {snap.total_solved}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Difficulty Breakdown (Easy / Medium / Hard) */}
                      <td className="py-3.5 px-4 text-center">
                        {snap?.total_solved !== null && snap?.total_solved !== undefined ? (
                          <div className="inline-flex items-center gap-1 font-mono text-[10px]">
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded" title="Easy Solved">
                              E: {snap.easy_solved ?? 0}
                            </span>
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded" title="Medium Solved">
                              M: {snap.medium_solved ?? 0}
                            </span>
                            <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200/60 rounded" title="Hard Solved">
                              H: {snap.hard_solved ?? 0}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Global Rank */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {snap?.global_rank ? (
                          <span className="font-semibold text-slate-800">
                            #{snap.global_rank.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Contest Rating */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {snap?.contest_rating ? (
                          <div>
                            <span className="font-bold text-slate-900">
                              {Math.round(snap.contest_rating)}
                            </span>
                            {snap.highest_rating && (
                              <div className="text-[10px] text-slate-400">
                                Max: {Math.round(snap.highest_rating)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Acceptance Rate */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {snap?.acceptance_rate !== null && snap?.acceptance_rate !== undefined ? (
                          <span className="text-slate-700">
                            {snap.acceptance_rate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Contests Attended */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {snap?.contests_attended !== null && snap?.contests_attended !== undefined ? (
                          <span>{snap.contests_attended}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Today Status (Asia/Kolkata) */}
                      <td className="py-3.5 px-4 text-center">
                        {isActiveToday ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Active ({today?.submission_count || 1})
                          </span>
                        ) : snap ? (
                          <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            No activity
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Pending scan</span>
                        )}
                      </td>

                      {/* Last Synced */}
                      <td className="py-3.5 px-4 text-center text-[11px] text-slate-400">
                        {snap?.observed_at ? (
                          <span>
                            {new Date(snap.observed_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isTeacher && (
                            <button
                              onClick={() => setScanStudent({ id: s.id, name: s.display_name })}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                              title="Scan Student LeetCode Account"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
                          <Link
                            href={`/students/${s.id}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                            title="View Full Profile Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single student scan modal */}
      {scanStudent && (
        <ScanModal
          isOpen={true}
          onClose={() => setScanStudent(null)}
          onScanCompleted={() => {
            fetchStudents();
            setScanStudent(null);
          }}
          targetStudentId={scanStudent.id}
          targetStudentName={scanStudent.name}
          initialPlatform="leetcode"
        />
      )}

      {/* Classroom scan modal */}
      {isClassroomScanOpen && (
        <ScanModal
          isOpen={true}
          onClose={() => setIsClassroomScanOpen(false)}
          onScanCompleted={() => {
            fetchStudents();
            setIsClassroomScanOpen(false);
          }}
          initialPlatform="leetcode"
        />
      )}
    </div>
  );
}
