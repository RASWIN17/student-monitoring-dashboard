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
  ArrowUpDown,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Hash,
  ChevronRight,
  TrendingUp,
  Star,
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

export function getCodeChefStars(rating: number | null): string {
  if (rating === null || rating === undefined || rating <= 0) return 'Unrated';
  if (rating < 1400) return '1★';
  if (rating < 1600) return '2★';
  if (rating < 1800) return '3★';
  if (rating < 2000) return '4★';
  if (rating < 2200) return '5★';
  if (rating < 2500) return '6★';
  return '7★';
}

import { dataCache } from '@/components/DataCacheContext';

interface ClassroomDataCache {
  classroom: Classroom | null;
  students: StudentPerformanceOverview[];
}

export function ClassroomStudentDetailsView({ platform, classroomId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const cacheKey = `classroom:students:${classroomId}:${platform}:v2`;
  const uiKey = `ui:classroom:students:${classroomId}:${platform}:v2`;

  const cachedData = dataCache.get<ClassroomDataCache>(cacheKey);
  const [classroom, setClassroom] = useState<Classroom | null>(() => cachedData?.classroom || null);
  const [students, setStudents] = useState<StudentPerformanceOverview[]>(() => cachedData?.students || []);
  const [loading, setLoading] = useState(() => !cachedData);
  const [error, setError] = useState<string | null>(null);

  const savedUI = dataCache.getUI<{ searchTerm: string; sortOption: SortOption }>(uiKey);
  // Search & Sorting state
  const [searchTerm, setSearchTerm] = useState(savedUI?.searchTerm || '');
  const [sortOption, setSortOption] = useState<SortOption>(savedUI?.sortOption || 'problems_desc');

  useEffect(() => {
    dataCache.setUI(uiKey, { searchTerm, sortOption });
  }, [uiKey, searchTerm, sortOption]);

  // Scan modal state
  const [isScanClassroomOpen, setIsScanClassroomOpen] = useState(false);

  const platformDisplayName = platform === 'leetcode' ? 'LeetCode' : 'CodeChef';
  const platformSelectionUrl = `/students/${platform}`;

  const fetchData = async (force = false) => {
    if (!force && dataCache.get(cacheKey)) return;
    if (!dataCache.get(cacheKey)) setLoading(true);
    setError(null);
    try {
      // 1. Fetch classroom details
      const cRes = await fetch(`/api/classrooms/${classroomId}`);
      if (!cRes.ok) {
        if (cRes.status === 404) throw new Error('Classroom not found.');
        throw new Error('Failed to load classroom details.');
      }
      const cData = await cRes.json();
      const loadedClassroom = cData.classroom;
      setClassroom(loadedClassroom);

      // 2. Fetch classroom students overview
      const sRes = await fetch(`/api/classrooms/${classroomId}/students`);
      if (!sRes.ok) {
        throw new Error('Failed to load student records.');
      }
      const sData = await sRes.json();
      const loadedStudents = sData.students || [];
      setStudents(loadedStudents);
      dataCache.set(cacheKey, { classroom: loadedClassroom, students: loadedStudents });
    } catch (err: any) {
      setError(err?.message || 'Error loading classroom details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classroomId) {
      const cached = dataCache.get<ClassroomDataCache>(cacheKey);
      if (cached) {
        setClassroom(cached.classroom);
        setStudents(cached.students);
        setLoading(false);
      } else {
        fetchData();
      }
    }
  }, [cacheKey, classroomId]);

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
      const matchReg = s.register_number?.toLowerCase().includes(term);

      return matchName || matchEmail || matchUsername || matchReg;
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
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#1769ff]" />
        <p className="text-sm font-bold text-[#0f1b35]">
          Loading {platformDisplayName} analytics for classroom...
        </p>
        <p className="text-xs text-[#64748b]">Verifying student records and profile snapshots</p>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-red-200 p-8 text-center shadow-xs">
        <div className="h-12 w-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Classroom Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">{error || 'Could not locate the requested classroom.'}</p>
        <Link
          href={platformSelectionUrl}
          className="px-4 py-2 bg-[#1769ff] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition"
        >
          Back to Classroom Selection
        </Link>
      </div>
    );
  }

  const percentLinked =
    stats.totalStudents > 0
      ? `${Math.round((stats.linkedAccountsCount / stats.totalStudents) * 100)}% linked`
      : '0% linked';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-[#64748b]">
        <Link href="/students" className="hover:text-[#1769ff] transition">
          Students
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link href={platformSelectionUrl} className="hover:text-[#1769ff] transition">
          {platformDisplayName}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-bold text-[#0f1b35]">{classroom.name}</span>
      </nav>

      {/* 2. Classroom Header Card */}
      <div className="bg-white rounded-2xl border border-[#e1eaf5] p-6 sm:p-7 shadow-[0_2px_12px_rgba(30,64,175,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Logo Box */}
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100/90 shadow-[0_4px_16px_rgba(30,64,175,0.06)] flex items-center justify-center p-3 shrink-0">
              {platform === 'leetcode' ? (
                <LeetCodeIcon className="w-10 h-10" />
              ) : (
                <CodeChefIcon className="w-10 h-10" />
              )}
            </div>

            <div>
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[#eef4ff] text-[#1769ff]">
                  {platform === 'leetcode' ? (
                    <Hash className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                  <span>{platform === 'leetcode' ? 'LEETCODE ANALYTICS' : 'CODECHEF ANALYTICS'}</span>
                </span>
                <span className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#f1f5f9] text-[#475569]">
                  Join Code: <strong className="text-slate-800 tracking-wider font-bold">{classroom.join_code}</strong>
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-black text-[#0f1b35] tracking-tight mt-1 mb-1">
                {classroom.name}{' '}
                <span className="text-[#64748b] font-medium text-lg">
                  (Section {classroom.section})
                </span>
              </h1>

              {/* Department, Batch, Year line */}
              <p className="text-xs text-[#64748b] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                <span><strong>Department:</strong> <span className="text-[#334155]">{classroom.department}</span></span>
                <span>•</span>
                <span><strong>Batch:</strong> <span className="text-[#334155]">{classroom.batch}</span></span>
                <span>•</span>
                <span><strong>Year:</strong> <span className="text-[#334155]">{classroom.academic_year}</span></span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 self-start md:self-center shrink-0">
            <Link
              href={platformSelectionUrl}
              className="px-4 py-2.5 bg-white border border-[#e1eaf5] hover:bg-slate-50 text-[#0f1b35] text-xs font-bold rounded-xl shadow-2xs flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Change Classroom</span>
            </Link>

            {isTeacher && (
              <button
                onClick={() => setIsScanClassroomOpen(true)}
                className="px-5 py-2.5 bg-[#1769ff] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl shadow-[0_4px_14px_rgba(23,105,255,0.25)] flex items-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Scan Classroom</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. KPI Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Students */}
        <div className="bg-white rounded-2xl border border-[#e1eaf5] p-5 shadow-[0_2px_10px_rgba(30,64,175,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Total Students</span>
            <Users className="w-4 h-4 text-[#1769ff]" />
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-[#0f1b35] mt-2 mb-0.5 tracking-tight">
            {stats.totalStudents}
          </div>
          <div className="text-xs text-[#64748b] font-medium">Enrolled in classroom</div>
        </div>

        {/* Profiles Linked */}
        <div className="bg-white rounded-2xl border border-[#e1eaf5] p-5 shadow-[0_2px_10px_rgba(30,64,175,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Profiles Linked</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-[#0f1b35] mt-2 mb-0.5 tracking-tight flex items-baseline">
            <span>{stats.linkedAccountsCount}</span>
            <span className="text-sm font-normal text-slate-400 ml-1.5">/ {stats.totalStudents}</span>
          </div>
          <div className="text-xs text-[#64748b] font-medium">{percentLinked}</div>
        </div>

        {/* Total Problems Solved */}
        <div className="bg-white rounded-2xl border border-[#e1eaf5] p-5 shadow-[0_2px_10px_rgba(30,64,175,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Total Problems Solved</span>
            <Hash className="w-4 h-4 text-[#1769ff]" />
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-[#0f1b35] mt-2 mb-0.5 tracking-tight">
            {stats.totalProblemsSolved.toLocaleString()}
          </div>
          <div className="text-xs text-[#64748b] font-medium">Combined lifetime solves</div>
        </div>

        {/* Average Rating */}
        <div className="bg-white rounded-2xl border border-[#e1eaf5] p-5 shadow-[0_2px_10px_rgba(30,64,175,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Average Rating</span>
            <TrendingUp className="w-4 h-4 text-[#1769ff]" />
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-[#0f1b35] mt-2 mb-0.5 tracking-tight">
            {stats.avgRating}
          </div>
          <div className="text-xs text-[#64748b] font-medium">Across rated students</div>
        </div>

        {/* Highest Rating */}
        <div className="bg-white rounded-2xl border border-[#e1eaf5] p-5 shadow-[0_2px_10px_rgba(30,64,175,0.03)] flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Highest Rating</span>
            <Trophy className="w-4 h-4 text-[#1769ff]" />
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-[#0f1b35] mt-2 mb-0.5 tracking-tight">
            {stats.highestRating}
          </div>
          <div className="text-xs text-[#64748b] font-medium">Classroom peak rating</div>
        </div>
      </div>

      {/* 4. Search, Filter & Sort Controls */}
      <div className="bg-white rounded-2xl border border-[#e1eaf5] p-4 shadow-[0_2px_10px_rgba(30,64,175,0.03)] space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={`Search by student name, email, or ${platformDisplayName} handle...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#e1eaf5] rounded-xl text-xs sm:text-sm text-slate-800 placeholder-[#94a3b8] focus:outline-none focus:border-[#1769ff] focus:ring-1 focus:ring-[#1769ff] transition-all"
            />
          </div>

          {/* Sort By Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-[#64748b] mr-1 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Sort By:</span>
            </span>
            <button
              onClick={() => setSortOption('problems_desc')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                sortOption === 'problems_desc'
                  ? 'bg-[#1769ff] text-white shadow-xs'
                  : 'bg-white border border-[#e1eaf5] text-[#475569] hover:bg-slate-50'
              }`}
            >
              🔥 Most Solved
            </button>
            <button
              onClick={() => setSortOption('problems_asc')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                sortOption === 'problems_asc'
                  ? 'bg-[#1769ff] text-white shadow-xs'
                  : 'bg-white border border-[#e1eaf5] text-[#475569] hover:bg-slate-50'
              }`}
            >
              Least Solved
            </button>
            <button
              onClick={() => setSortOption('rating_desc')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                sortOption === 'rating_desc'
                  ? 'bg-[#1769ff] text-white shadow-xs'
                  : 'bg-white border border-[#e1eaf5] text-[#475569] hover:bg-slate-50'
              }`}
            >
              ⭐ Highest Rating
            </button>
            <button
              onClick={() => setSortOption('rating_asc')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                sortOption === 'rating_asc'
                  ? 'bg-[#1769ff] text-white shadow-xs'
                  : 'bg-white border border-[#e1eaf5] text-[#475569] hover:bg-slate-50'
              }`}
            >
              Lowest Rating
            </button>
          </div>
        </div>

        {/* Clear Search (if typed) */}
        {searchTerm && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => setSearchTerm('')}
              className="text-[#1769ff] hover:underline text-xs font-bold"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* 5. Student Details Table */}
      <div className="bg-white rounded-2xl border border-[#e1eaf5] shadow-[0_4px_20px_rgba(30,64,175,0.03)] overflow-hidden">
        {processedStudents.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
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
                  className="mt-3 px-3.5 py-1.5 text-xs font-bold bg-[#eef4ff] text-[#1769ff] hover:bg-blue-100 rounded-xl transition"
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
                <tr className="bg-white border-b border-[#edf2f9] text-[11px] font-extrabold text-[#64748b] uppercase tracking-wider">
                  <th className="py-4 px-5 whitespace-nowrap">STUDENT NAME</th>
                  <th className="py-4 px-5 whitespace-nowrap">REGISTRATION NUMBER</th>
                  <th className="py-4 px-5 whitespace-nowrap">{platform === 'leetcode' ? 'LEETCODE HANDLE' : 'CODECHEF HANDLE'}</th>
                  <th className="py-4 px-5 whitespace-nowrap">TOTAL SOLVED</th>
                  {platform === 'leetcode' ? (
                    <>
                      <th className="py-4 px-5 whitespace-nowrap">DIFFICULTY BREAKDOWN</th>
                      <th className="py-4 px-5 whitespace-nowrap">CONTEST RATING</th>
                      <th className="py-4 px-5 whitespace-nowrap">HIGHEST RATING</th>
                      <th className="py-4 px-5 whitespace-nowrap">GLOBAL RANKING</th>
                    </>
                  ) : (
                    <>
                      <th className="py-4 px-5 whitespace-nowrap">STAR TIER</th>
                      <th className="py-4 px-5 whitespace-nowrap">CONTEST RATING</th>
                      <th className="py-4 px-5 whitespace-nowrap">HIGHEST RATING</th>
                      <th className="py-4 px-5 whitespace-nowrap">GLOBAL RANK</th>
                      <th className="py-4 px-5 whitespace-nowrap">COUNTRY RANK</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f9] text-xs">
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
                      {/* 1. Student Name */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <Link
                          href={`/students/${s.id}?platform=${platform}&classroomId=${classroomId}`}
                          className="font-bold text-sm text-[#0f1b35] hover:text-[#1769ff] transition truncate hover:underline"
                        >
                          {s.display_name}
                        </Link>
                      </td>

                      {/* 2. Registration Number */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {s.register_number ? (
                          <span className="font-mono text-xs font-medium text-[#475569]">{s.register_number}</span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* 3. Platform Handle */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {isLinked ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={account.public_profile_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs font-bold text-[#1769ff] hover:underline flex items-center gap-1"
                            >
                              <span>{account.username}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-[#1769ff]" />
                            </a>
                            {account.account_status === 'error' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-semibold">Error</span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            Not Linked
                          </span>
                        )}
                      </td>

                      {/* 4. Total Solved */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {totalSolved != null ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-black bg-[#eef4ff] text-[#1769ff]">
                            {totalSolved.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* LeetCode Specific Columns (5 to 8) */}
                      {platform === 'leetcode' && (
                        <>
                          {/* 5. Difficulty Breakdown */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {snap ? (
                              <div className="flex items-center gap-2 text-[11px]">
                                <span
                                  className="px-2.5 py-0.5 rounded-md font-bold bg-[#ecfdf5] text-[#059669]"
                                  title="Easy problems solved"
                                >
                                  E: {snap.easy_solved ?? 0}
                                </span>
                                <span
                                  className="px-2.5 py-0.5 rounded-md font-bold bg-[#fffbeb] text-[#d97706]"
                                  title="Medium problems solved"
                                >
                                  M: {snap.medium_solved ?? 0}
                                </span>
                                <span
                                  className="px-2.5 py-0.5 rounded-md font-bold bg-[#fff1f2] text-[#e11d48]"
                                  title="Hard problems solved"
                                >
                                  H: {snap.hard_solved ?? 0}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* 6. Contest Rating */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {snap?.contest_rating != null && Number(snap.contest_rating) > 0 ? (
                              <span className="text-[#ea580c] font-mono font-bold text-xs">
                                {Number(snap.contest_rating).toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">N/A</span>
                            )}
                          </td>

                          {/* 7. Highest Rating */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {snap?.highest_rating != null && Number(snap.highest_rating) > 0 ? (
                              <span className="font-mono font-bold text-xs text-[#0f1b35]">
                                {Number(snap.highest_rating).toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">N/A</span>
                            )}
                          </td>

                          {/* 8. Global Ranking */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {snap?.global_rank != null && Number(snap.global_rank) > 0 && Number(snap.global_rank) < 5000000 ? (
                              <span className="font-mono text-xs font-bold text-[#0f1b35]">
                                #{Number(snap.global_rank).toLocaleString('en-US')}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">N/A</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* CodeChef Specific Columns (5 to 9) */}
                      {platform === 'codechef' && (
                        <>
                          {/* 5. Star Tier */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {snap ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#fef3c7] text-[#b45309]">
                                <span>{getCodeChefStars(snap.contest_rating ?? snap.highest_rating).replace('★', '')}</span>
                                <Star className="w-3 h-3 fill-[#b45309] text-[#b45309]" />
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* 6. Contest Rating */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {snap?.contest_rating != null ? (
                              <span className="text-[#ea580c] font-mono font-bold text-xs">
                                {snap.contest_rating}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Unrated</span>
                            )}
                          </td>

                          {/* 7. Highest Rating */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {snap?.highest_rating != null ? (
                              <span className="font-mono font-bold text-xs text-[#0f1b35]">
                                {Math.round(snap.highest_rating)}
                              </span>
                            ) : snap?.highest_score != null ? (
                              <span className="font-mono font-bold text-xs text-[#0f1b35]">
                                {Math.round(snap.highest_score)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>

                          {/* 8. Global Rank */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {snap?.global_rank != null ? (
                              <span className="font-mono text-xs font-medium text-[#475569]">
                                #{snap.global_rank.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* 9. Country Rank */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {snap?.country_rank != null ? (
                              <span className="font-mono text-xs font-medium text-[#475569]">
                                #{snap.country_rank.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </>
                      )}
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
        onScanCompleted={() => fetchData(true)}
      />
    </div>
  );
}
