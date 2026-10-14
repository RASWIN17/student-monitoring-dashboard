'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { Classroom, StudentPerformanceOverview } from '@/lib/types';
import { ScanModal } from '@/components/ScanModal';
import { LeetCodeIcon, CodeChefIcon } from '@/components/PlatformIcons';
import {
  Users,
  Search,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Play,
  ArrowUpDown,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Hash,
  Award,
  ChevronRight,
  TrendingUp,
  Sparkles,
  BarChart2,
  GraduationCap,
} from 'lucide-react';

interface Props {
  platform: 'leetcode' | 'codechef';
  classroomId: string;
}

export type SortOption =
  | 'problems_desc'
  | 'problems_asc'
  | 'rating_desc'
  | 'rating_asc'
  | 'name_asc';

function getCodeChefStars(rating: number | null): string {
  if (rating === null || rating === undefined || rating <= 0) return 'Unrated';
  if (rating < 1400) return '1★';
  if (rating < 1600) return '2★';
  if (rating < 1800) return '3★';
  if (rating < 2000) return '4★';
  if (rating < 2200) return '5★';
  if (rating < 2500) return '6★';
  return '7★';
}

export function ClassroomStudentDetailsView({ platform, classroomId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<StudentPerformanceOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('problems_desc');

  // Scan modal state
  const [isScanClassroomOpen, setIsScanClassroomOpen] = useState(false);
  const [scanStudent, setScanStudent] = useState<{ id: string; name: string } | null>(null);

  const platformDisplayName = platform === 'leetcode' ? 'LeetCode' : 'CodeChef';
  const platformSelectionUrl = `/students/${platform}`;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch classroom details
      const cRes = await fetch(`/api/classrooms/${classroomId}`);
      if (!cRes.ok) {
        if (cRes.status === 404) throw new Error('Classroom not found.');
        throw new Error('Failed to load classroom details.');
      }
      const cData = await cRes.json();
      setClassroom(cData.classroom);

      // 2. Fetch classroom students overview
      const sRes = await fetch(`/api/classrooms/${classroomId}/students`);
      if (!sRes.ok) {
        throw new Error('Failed to load student records.');
      }
      const sData = await sRes.json();
      setStudents(sData.students || []);
    } catch (err: any) {
      setError(err?.message || 'Error loading classroom details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classroomId) {
      fetchData();
    }
  }, [classroomId]);

  // Derived filtered & sorted list
  const processedStudents = useMemo(() => {
    // 1. Filter
    const filtered = students.filter((item) => {
      const s = item.student;
      const account = platform === 'leetcode' ? item.leetcodeAccount : item.codechefAccount;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();

      const matchName = s.display_name?.toLowerCase().includes(term);
      const matchEmail = s.email?.toLowerCase().includes(term);
      const matchUsername = account?.username?.toLowerCase().includes(term);

      return matchName || matchEmail || matchUsername;
    });

    // 2. Sort numerically
    return filtered.sort((a, b) => {
      const aSnap = platform === 'leetcode' ? a.leetcodeSnapshot : a.codechefSnapshot;
      const bSnap = platform === 'leetcode' ? b.leetcodeSnapshot : b.codechefSnapshot;

      if (sortOption === 'problems_desc') {
        const aVal = aSnap?.total_solved != null ? Number(aSnap.total_solved) : -1;
        const bVal = bSnap?.total_solved != null ? Number(bSnap.total_solved) : -1;
        return bVal - aVal;
      }
      if (sortOption === 'problems_asc') {
        const aVal = aSnap?.total_solved != null ? Number(aSnap.total_solved) : 999999999;
        const bVal = bSnap?.total_solved != null ? Number(bSnap.total_solved) : 999999999;
        return aVal - bVal;
      }
      if (sortOption === 'rating_desc') {
        const aRating =
          platform === 'leetcode'
            ? aSnap?.contest_rating
            : aSnap?.contest_rating ?? aSnap?.highest_rating;
        const bRating =
          platform === 'leetcode'
            ? bSnap?.contest_rating
            : bSnap?.contest_rating ?? bSnap?.highest_rating;

        const aVal = aRating != null ? Number(aRating) : -1;
        const bVal = bRating != null ? Number(bRating) : -1;
        return bVal - aVal;
      }
      if (sortOption === 'rating_asc') {
        const aRating =
          platform === 'leetcode'
            ? aSnap?.contest_rating
            : aSnap?.contest_rating ?? aSnap?.highest_rating;
        const bRating =
          platform === 'leetcode'
            ? bSnap?.contest_rating
            : bSnap?.contest_rating ?? bSnap?.highest_rating;

        const aVal = aRating != null ? Number(aRating) : 999999999;
        const bVal = bRating != null ? Number(bRating) : 999999999;
        return aVal - bVal;
      }
      if (sortOption === 'name_asc') {
        return (a.student.display_name || '').localeCompare(b.student.display_name || '');
      }
      return 0;
    });
  }, [students, searchTerm, sortOption, platform]);

  // Aggregate statistics for summary row
  const stats = useMemo(() => {
    let totalProblemsSolved = 0;
    let linkedAccountsCount = 0;
    let ratedStudentsCount = 0;
    let sumRating = 0;
    let highestRating = 0;

    for (const item of students) {
      const account = platform === 'leetcode' ? item.leetcodeAccount : item.codechefAccount;
      const snap = platform === 'leetcode' ? item.leetcodeSnapshot : item.codechefSnapshot;

      if (account) linkedAccountsCount++;

      if (snap?.total_solved != null) {
        totalProblemsSolved += Number(snap.total_solved);
      }

      const rating =
        platform === 'leetcode'
          ? snap?.contest_rating
          : snap?.contest_rating ?? snap?.highest_rating;

      if (rating != null && Number(rating) > 0) {
        ratedStudentsCount++;
        const numRating = Number(rating);
        sumRating += numRating;
        if (numRating > highestRating) highestRating = numRating;
      }
    }

    const avgRating = ratedStudentsCount > 0 ? (sumRating / ratedStudentsCount).toFixed(1) : '—';

    return {
      totalStudents: students.length,
      linkedAccountsCount,
      totalProblemsSolved,
      avgRating,
      highestRating: highestRating > 0 ? highestRating.toFixed(1) : '—',
    };
  }, [students, platform]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <p className="text-sm font-semibold text-slate-700">
          Loading {platformDisplayName} analytics for classroom...
        </p>
        <p className="text-xs text-slate-400">Verifying student records and profile snapshots</p>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-xl border border-red-200 p-8 text-center shadow-xs">
        <div className="h-12 w-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Classroom Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">{error || 'Could not locate the requested classroom.'}</p>
        <Link
          href={platformSelectionUrl}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
        >
          Back to Classroom Selection
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/students" className="hover:text-blue-600 transition">
          Students
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link href={platformSelectionUrl} className="hover:text-blue-600 transition">
          {platformDisplayName}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-800">{classroom.name}</span>
      </nav>

      {/* Classroom & Platform Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                platform === 'leetcode'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                  : 'bg-orange-500/10 border-orange-500/20 text-orange-600'
              }`}
            >
              {platform === 'leetcode' ? (
                <LeetCodeIcon className="w-8 h-8" />
              ) : (
                <CodeChefIcon className="w-8 h-8" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                    platform === 'leetcode'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-orange-100 text-orange-800 border border-orange-300'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{platformDisplayName} Analytics</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  Join Code: <strong className="text-slate-800 tracking-wider">{classroom.join_code}</strong>
                </span>
              </div>

              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {classroom.name}{' '}
                <span className="text-slate-500 font-normal text-lg">
                  ({classroom.course} — Section {classroom.section})
                </span>
              </h1>

              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span><strong>Department:</strong> {classroom.department}</span>
                <span>•</span>
                <span><strong>Batch:</strong> {classroom.batch}</span>
                <span>•</span>
                <span><strong>Year:</strong> {classroom.academic_year}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            <Link
              href={platformSelectionUrl}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Classroom</span>
            </Link>

            {isTeacher && (
              <button
                onClick={() => setIsScanClassroomOpen(true)}
                className={`px-4 py-2 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition ${
                  platform === 'leetcode'
                    ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                    : 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scan Classroom</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Students</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalStudents}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Enrolled in classroom</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Profiles Linked</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.linkedAccountsCount}
            <span className="text-xs font-normal text-slate-400 ml-1">/ {stats.totalStudents}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {stats.totalStudents > 0
              ? `${Math.round((stats.linkedAccountsCount / stats.totalStudents) * 100)}% linked`
              : '0% linked'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Problems Solved</span>
            <Hash className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.totalProblemsSolved.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Combined lifetime solves</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Average Rating</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.avgRating}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across rated students</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Highest Rating</span>
            <Trophy className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.highestRating}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Classroom peak rating</div>
        </div>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Search by student name, email, or ${platformDisplayName} handle...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Sorting Dropdown Control */}
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="student-sort-select" className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Sort By:</span>
            </label>
            <select
              id="student-sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <optgroup label="Problem-Solving Filters">
                <option value="problems_desc">Highest Problems Solved → Lowest Problems Solved</option>
                <option value="problems_asc">Lowest Problems Solved → Highest Problems Solved</option>
              </optgroup>
              <optgroup label="Rating Filters">
                <option value="rating_desc">Highest Rating → Lowest Rating</option>
                <option value="rating_asc">Lowest Rating → Highest Rating</option>
              </optgroup>
              <optgroup label="Alphabetical">
                <option value="name_asc">Student Name (A → Z)</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Quick Filter Pill Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium mr-1 text-[11px]">Quick sort:</span>
          <button
            onClick={() => setSortOption('problems_desc')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              sortOption === 'problems_desc'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🔥 Most Solved
          </button>
          <button
            onClick={() => setSortOption('problems_asc')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              sortOption === 'problems_asc'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Least Solved
          </button>
          <button
            onClick={() => setSortOption('rating_desc')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              sortOption === 'rating_desc'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⭐ Highest Rating
          </button>
          <button
            onClick={() => setSortOption('rating_asc')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              sortOption === 'rating_asc'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Lowest Rating
          </button>

          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="ml-auto text-blue-600 hover:underline text-xs font-medium"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Student Details Responsive Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {processedStudents.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            {students.length === 0 ? (
              <>
                <h3 className="text-sm font-bold text-slate-800">No Students Enrolled</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  There are currently no students enrolled in {classroom.name}. Give students the join code{' '}
                  <strong className="text-slate-900 font-mono">{classroom.join_code}</strong> to join this classroom.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold text-slate-800">No Matching Students Found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  No students in this classroom match your search query &ldquo;{searchTerm}&rdquo;.
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition"
                >
                  Clear search query
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">{platformDisplayName} Handle</th>
                  <th className="py-3 px-4">Total Solved</th>
                  {platform === 'leetcode' ? (
                    <>
                      <th className="py-3 px-4">Difficulty Breakdown</th>
                      <th className="py-3 px-4">Contest Rating</th>
                      <th className="py-3 px-4">Global Rank</th>
                      <th className="py-3 px-4">Contests / Acceptance</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4">Star Tier</th>
                      <th className="py-3 px-4">Contest Rating</th>
                      <th className="py-3 px-4">Peak Rating</th>
                      <th className="py-3 px-4">Global / Country Rank</th>
                    </>
                  )}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {processedStudents.map((item) => {
                  const s = item.student;
                  const account = platform === 'leetcode' ? item.leetcodeAccount : item.codechefAccount;
                  const snap = platform === 'leetcode' ? item.leetcodeSnapshot : item.codechefSnapshot;

                  const isLinked = !!account;
                  const totalSolved = snap?.total_solved != null ? snap.total_solved : null;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Student Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {s.display_name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <div className="overflow-hidden">
                            <Link
                              href={`/students/${s.id}`}
                              className="font-semibold text-slate-900 hover:text-blue-600 transition block truncate"
                            >
                              {s.display_name}
                            </Link>
                            <span className="text-[11px] text-slate-400 block truncate">{s.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Platform Handle */}
                      <td className="py-3.5 px-4">
                        {isLinked ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={account.public_profile_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <span>{account.username}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                            {account.account_status === 'error' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700">Error</span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            Not Linked
                          </span>
                        )}
                      </td>

                      {/* Total Solved */}
                      <td className="py-3.5 px-4">
                        {totalSolved != null ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            {totalSolved.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* LeetCode Specific Columns */}
                      {platform === 'leetcode' && (
                        <>
                          {/* Difficulty Breakdown */}
                          <td className="py-3.5 px-4">
                            {snap ? (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span
                                  className="px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  title="Easy problems solved"
                                >
                                  E: {snap.easy_solved ?? 0}
                                </span>
                                <span
                                  className="px-2 py-0.5 rounded font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                                  title="Medium problems solved"
                                >
                                  M: {snap.medium_solved ?? 0}
                                </span>
                                <span
                                  className="px-2 py-0.5 rounded font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                                  title="Hard problems solved"
                                >
                                  H: {snap.hard_solved ?? 0}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Contest Rating */}
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {snap?.contest_rating != null ? (
                              <span className="text-amber-700 font-mono font-bold">
                                {Number(snap.contest_rating).toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Unrated</span>
                            )}
                          </td>

                          {/* Global Rank */}
                          <td className="py-3.5 px-4 text-slate-700">
                            {snap?.global_rank != null ? (
                              <span className="font-mono text-[11px]">#{snap.global_rank.toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Contests / Acceptance Rate */}
                          <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                            {snap ? (
                              <div>
                                <span className="font-medium text-slate-800">
                                  {snap.contests_attended ?? 0} contests
                                </span>
                                {snap.acceptance_rate != null && (
                                  <span className="text-slate-400 block text-[10px]">
                                    {snap.acceptance_rate}% acc
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* CodeChef Specific Columns */}
                      {platform === 'codechef' && (
                        <>
                          {/* Star Tier */}
                          <td className="py-3.5 px-4">
                            {snap ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                {getCodeChefStars(snap.contest_rating ?? snap.highest_rating)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Contest Rating */}
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {snap?.contest_rating != null ? (
                              <span className="text-orange-700 font-mono font-bold">
                                {snap.contest_rating}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Unrated</span>
                            )}
                          </td>

                          {/* Peak Rating */}
                          <td className="py-3.5 px-4 text-slate-700">
                            {snap?.highest_rating != null ? (
                              <span className="font-mono font-semibold text-[11px] text-slate-800">
                                {snap.highest_rating}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Global / Country Rank */}
                          <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                            {snap ? (
                              <div>
                                <span className="font-mono block">
                                  Global: {snap.global_rank != null ? `#${snap.global_rank.toLocaleString()}` : '—'}
                                </span>
                                <span className="font-mono block text-slate-400 text-[10px]">
                                  Country: {snap.country_rank != null ? `#${snap.country_rank.toLocaleString()}` : '—'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/students/${s.id}`}
                            className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                          >
                            Details
                          </Link>
                          {isTeacher && isLinked && (
                            <button
                              onClick={() => setScanStudent({ id: s.id, name: s.display_name })}
                              title={`Scan ${s.display_name}`}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
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

      {/* Classroom Scan Modal */}
      <ScanModal
        isOpen={isScanClassroomOpen}
        onClose={() => setIsScanClassroomOpen(false)}
        classroomId={classroom.id}
        initialPlatform={platform}
        onScanCompleted={fetchData}
      />

      {/* Individual Student Scan Modal */}
      {scanStudent && (
        <ScanModal
          isOpen={true}
          onClose={() => setScanStudent(null)}
          classroomId={classroom.id}
          targetStudentId={scanStudent.id}
          targetStudentName={scanStudent.name}
          initialPlatform={platform}
          onScanCompleted={fetchData}
        />
      )}
    </div>
  );
}
