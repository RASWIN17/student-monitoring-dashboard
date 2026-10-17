'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { Classroom, StudentPerformanceOverview } from '@/lib/types';
import { ScanModal } from '@/components/ScanModal';
import { LeetCodeIcon, CodeChefIcon } from '@/components/PlatformIcons';
import { BackButton } from '@/components/BackButton';
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
  ChevronDown,
  TrendingUp,
  Star,
  UserX,
  Zap,
} from 'lucide-react';

interface Props {
  platform: 'leetcode' | 'codechef';
  classroomId?: string;
}

export type ActiveCardFilter = 'all' | 'linked' | 'not_linked' | 'active' | 'non_active';

export type SortOption =
  | 'problems_desc'
  | 'problems_asc'
  | 'rating_desc'
  | 'rating_asc'
  | 'roll_number_asc'
  | 'name_asc';

export function extractRollNumberSortValue(rollNumber: string | null | undefined): number | null {
  if (!rollNumber) return null;
  const str = String(rollNumber).trim();
  if (!str) return null;

  // Extract all digit characters from the roll number
  const digits = str.replace(/\D/g, '');
  if (!digits) return null;

  // Extract only the last three digits for numeric comparison
  const lastThree = digits.slice(-3);
  const parsed = parseInt(lastThree, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

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

export function ClassroomStudentDetailsView({ platform, classroomId: propClassroomId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, selectedClassroom, classrooms, setSelectedClassroom, loading: authLoading } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const effectiveClassroomId = propClassroomId || selectedClassroom?.id || (classrooms.length > 0 ? classrooms[0].id : '');

  const cacheKey = `classroom:students:${effectiveClassroomId}:${platform}:v2`;
  const uiKey = `ui:classroom:students:${effectiveClassroomId}:${platform}:v2`;

  const cachedData = effectiveClassroomId ? dataCache.get<ClassroomDataCache>(cacheKey) : null;
  const [classroom, setClassroom] = useState<Classroom | null>(() => cachedData?.classroom || null);
  const [students, setStudents] = useState<StudentPerformanceOverview[]>(() => cachedData?.students || []);
  const [loading, setLoading] = useState(() => !cachedData);
  const [error, setError] = useState<string | null>(null);

  const filterParam = (searchParams?.get('filter') as ActiveCardFilter) || 'all';
  const [activeFilter, setActiveFilter] = useState<ActiveCardFilter>(() =>
    ['all', 'linked', 'not_linked', 'active', 'non_active'].includes(filterParam)
      ? filterParam
      : 'all'
  );

  useEffect(() => {
    const param = searchParams?.get('filter') as ActiveCardFilter;
    if (param && ['all', 'linked', 'not_linked', 'active', 'non_active'].includes(param)) {
      setActiveFilter(param);
    }
  }, [searchParams]);

  const handleCardClick = (target: ActiveCardFilter) => {
    const nextFilter = activeFilter === target && target !== 'all' ? 'all' : target;
    setActiveFilter(nextFilter);
    const currentParams = new URLSearchParams(window.location.search);
    if (nextFilter === 'all') {
      currentParams.delete('filter');
    } else {
      currentParams.set('filter', nextFilter);
    }
    const queryStr = currentParams.toString();
    const nextUrl = `${window.location.pathname}${queryStr ? `?${queryStr}` : ''}`;
    window.history.replaceState(null, '', nextUrl);
  };

  const savedUI = effectiveClassroomId ? dataCache.getUI<{ searchTerm: string; sortOption: SortOption }>(uiKey) : null;
  // Search & Sorting state
  const [searchTerm, setSearchTerm] = useState(savedUI?.searchTerm || '');
  const [sortOption, setSortOption] = useState<SortOption>(savedUI?.sortOption || 'problems_desc');

  useEffect(() => {
    if (effectiveClassroomId) {
      dataCache.setUI(uiKey, { searchTerm, sortOption });
    }
  }, [uiKey, searchTerm, sortOption, effectiveClassroomId]);

  // Scan modal state
  const [isScanClassroomOpen, setIsScanClassroomOpen] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const platformDisplayName = platform === 'leetcode' ? 'LeetCode' : 'CodeChef';
  const platformSelectionUrl = `/students/${platform}`;

  const fetchData = async (force = false) => {
    if (!effectiveClassroomId) return;
    if (!force && dataCache.get(cacheKey)) return;
    if (!dataCache.get(cacheKey)) setLoading(true);
    setError(null);
    try {
      // Parallel fetch: classroom details and student records
      const [cRes, sRes] = await Promise.all([
        fetch(`/api/classrooms/${effectiveClassroomId}`),
        fetch(`/api/classrooms/${effectiveClassroomId}/students`),
      ]);

      if (!cRes.ok) {
        if (cRes.status === 404) throw new Error('Classroom not found.');
        throw new Error('Failed to load classroom details.');
      }
      if (!sRes.ok) {
        throw new Error('Failed to load student records.');
      }

      const [cData, sData] = await Promise.all([cRes.json(), sRes.json()]);
      const loadedClassroom = cData.classroom;
      const loadedStudents = sData.students || [];

      setClassroom(loadedClassroom);
      if (loadedClassroom && selectedClassroom?.id !== loadedClassroom.id) {
        setSelectedClassroom(loadedClassroom);
      }
      setStudents(loadedStudents);
      dataCache.set(cacheKey, { classroom: loadedClassroom, students: loadedStudents });
    } catch (err: any) {
      setError(err?.message || 'Error loading classroom details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveClassroomId) {
      const cached = dataCache.get<ClassroomDataCache>(cacheKey);
      if (cached) {
        setClassroom(cached.classroom);
        setStudents(cached.students);
        setLoading(false);
      } else {
        fetchData();
      }
    } else if (!authLoading && classrooms.length === 0) {
      setLoading(false);
    }
  }, [cacheKey, effectiveClassroomId, authLoading, classrooms.length]);

  // Derived filtered & sorted list
  const processedStudents = useMemo(() => {
    // 1. Filter by Active Card Metric
    const cardFiltered = students.filter((item) => {
      const account = platform === 'leetcode' ? item.leetcodeAccount : item.codechefAccount;
      const todayAct = platform === 'leetcode' ? item.leetcodeTodayActivity : item.codechefTodayActivity;
      const isLinked = !!account && account.account_status !== 'error' && account.account_status !== 'not_found';
      const isActive = isLinked && todayAct?.activity_status === 'active' && (todayAct?.submission_count ?? 0) > 0;
      const isNonActive = isLinked && todayAct?.activity_status === 'no_activity' && (todayAct?.submission_count ?? 0) === 0;

      if (activeFilter === 'linked') return isLinked;
      if (activeFilter === 'not_linked') return !isLinked;
      if (activeFilter === 'active') return isActive;
      if (activeFilter === 'non_active') return isNonActive;
      return true; // 'all'
    });

    // 2. Search filter
    const searchFiltered = cardFiltered.filter((item) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const s = item.student;
      const account = platform === 'leetcode' ? item.leetcodeAccount : item.codechefAccount;

      const matchName = s.display_name?.toLowerCase().includes(term);
      const matchEmail = s.email?.toLowerCase().includes(term);
      const matchUsername = account?.username?.toLowerCase().includes(term);
      const matchReg = s.register_number?.toLowerCase().includes(term);

      return matchName || matchEmail || matchUsername || matchReg;
    });

    // 3. Sort numerically
    return [...searchFiltered].sort((a, b) => {
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
      if (sortOption === 'roll_number_asc' || (sortOption as string) === 'roll_number') {
        const aRoll = a.student.register_number || (a.student as any).roll_number;
        const bRoll = b.student.register_number || (b.student as any).roll_number;

        const aNum = extractRollNumberSortValue(aRoll);
        const bNum = extractRollNumberSortValue(bRoll);

        if (aNum === null && bNum === null) {
          return (a.student.display_name || '').localeCompare(b.student.display_name || '');
        }
        if (aNum === null) return 1;
        if (bNum === null) return -1;

        if (aNum !== bNum) {
          return aNum - bNum;
        }

        const rollCompare = String(aRoll || '').localeCompare(String(bRoll || ''));
        if (rollCompare !== 0) return rollCompare;
        return (a.student.display_name || '').localeCompare(b.student.display_name || '');
      }
      if (sortOption === 'name_asc') {
        return (a.student.display_name || '').localeCompare(b.student.display_name || '');
      }
      return 0;
    });
  }, [students, activeFilter, searchTerm, sortOption, platform]);

  // Aggregate statistics for summary row (Exact 5 cards)
  const stats = useMemo(() => {
    let linkedCount = 0;
    let notLinkedCount = 0;
    let activeTodayCount = 0;
    let nonActiveTodayCount = 0;
    let unknownTodayCount = 0;

    for (const item of students) {
      const account = platform === 'leetcode' ? item.leetcodeAccount : item.codechefAccount;
      const todayAct = platform === 'leetcode' ? item.leetcodeTodayActivity : item.codechefTodayActivity;

      // Valid linked profile: account exists and is not in error/not_found
      const isLinked = !!account && account.account_status !== 'error' && account.account_status !== 'not_found';

      if (isLinked) {
        linkedCount++;
        if (todayAct?.activity_status === 'active' && (todayAct?.submission_count ?? 0) > 0) {
          activeTodayCount++;
        } else if (todayAct?.activity_status === 'no_activity' && (todayAct?.submission_count ?? 0) === 0) {
          nonActiveTodayCount++;
        } else {
          unknownTodayCount++;
        }
      } else {
        notLinkedCount++;
      }
    }

    return {
      totalStudents: students.length,
      linkedCount,
      notLinkedCount,
      activeTodayCount,
      nonActiveTodayCount,
      unknownTodayCount,
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
          Back to {platformDisplayName}
        </Link>
      </div>
    );
  }

  const percentLinked =
    stats.totalStudents > 0
      ? `${Math.round((stats.linkedCount / stats.totalStudents) * 100)}% linked`
      : '0% linked';

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Back Button */}
      <div>
        <BackButton fallbackHref={platformSelectionUrl} />
      </div>

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
              <span>Back to {platformDisplayName}</span>
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

      {/* 3. KPI Summary Cards Row (Exactly 5 cards in required order, fully clickable) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Total Students */}
        <button
          type="button"
          onClick={() => handleCardClick('all')}
          aria-pressed={activeFilter === 'all'}
          aria-label={`Total Students: ${stats.totalStudents}. Click to show all students.`}
          className={`text-left rounded-2xl border p-5 transition-all flex flex-col justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769ff] ${
            activeFilter === 'all'
              ? 'bg-[#f4f8ff] border-[#1769ff] ring-2 ring-[#1769ff]/40 shadow-[0_4px_16px_rgba(23,105,255,0.12)]'
              : 'bg-white border-[#e1eaf5] hover:border-[#cbd5e1] hover:shadow-[0_4px_14px_rgba(30,64,175,0.06)]'
          }`}
        >
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Total Students</span>
            <Users className="w-4 h-4 text-[#1769ff]" />
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-[#0f1b35] mt-2 mb-0.5 tracking-tight">
            {stats.totalStudents}
          </div>
          <div className="text-xs text-[#64748b] font-medium flex items-center justify-between">
            <span>Enrolled in classroom</span>
            {activeFilter === 'all' && (
              <span className="text-[10px] font-bold text-[#1769ff] bg-blue-100/70 px-1.5 py-0.5 rounded">All</span>
            )}
          </div>
        </button>

        {/* Card 2: Profile Linked */}
        <button
          type="button"
          onClick={() => handleCardClick('linked')}
          aria-pressed={activeFilter === 'linked'}
          aria-label={`Profile Linked: ${stats.linkedCount}. Click to show students with a linked profile.`}
          className={`text-left rounded-2xl border p-5 transition-all flex flex-col justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769ff] ${
            activeFilter === 'linked'
              ? 'bg-[#ecfdf5] border-emerald-500 ring-2 ring-emerald-500/40 shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
              : 'bg-white border-[#e1eaf5] hover:border-[#cbd5e1] hover:shadow-[0_4px_14px_rgba(30,64,175,0.06)]'
          }`}
        >
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Profile Linked</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-[#0f1b35] mt-2 mb-0.5 tracking-tight flex items-baseline">
            <span>{stats.linkedCount}</span>
            <span className="text-sm font-normal text-slate-400 ml-1.5">/ {stats.totalStudents}</span>
          </div>
          <div className="text-xs text-[#64748b] font-medium flex items-center justify-between">
            <span>{percentLinked}</span>
            {activeFilter === 'linked' && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Filtered</span>
            )}
          </div>
        </button>

        {/* Card 3: Profile Not Linked */}
        <button
          type="button"
          onClick={() => handleCardClick('not_linked')}
          aria-pressed={activeFilter === 'not_linked'}
          aria-label={`Profile Not Linked: ${stats.notLinkedCount}. Click to show students without a linked profile.`}
          className={`text-left rounded-2xl border p-5 transition-all flex flex-col justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769ff] ${
            activeFilter === 'not_linked'
              ? 'bg-[#fffbeb] border-amber-500 ring-2 ring-amber-500/40 shadow-[0_4px_16px_rgba(245,158,11,0.12)]'
              : 'bg-white border-[#e1eaf5] hover:border-[#cbd5e1] hover:shadow-[0_4px_14px_rgba(30,64,175,0.06)]'
          }`}
        >
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Profile Not Linked</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-[#0f1b35] mt-2 mb-0.5 tracking-tight">
            {stats.notLinkedCount}
          </div>
          <div className="text-xs text-[#64748b] font-medium flex items-center justify-between">
            <span>Unlinked or failed</span>
            {activeFilter === 'not_linked' && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Filtered</span>
            )}
          </div>
        </button>

        {/* Card 4: Active Students */}
        <button
          type="button"
          onClick={() => handleCardClick('active')}
          aria-pressed={activeFilter === 'active'}
          aria-label={`Active Students: ${stats.activeTodayCount}. Click to show students active today.`}
          className={`text-left rounded-2xl border p-5 transition-all flex flex-col justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769ff] ${
            activeFilter === 'active'
              ? 'bg-[#ecfdf5] border-emerald-500 ring-2 ring-emerald-500/40 shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
              : 'bg-white border-[#e1eaf5] hover:border-[#cbd5e1] hover:shadow-[0_4px_14px_rgba(30,64,175,0.06)]'
          }`}
        >
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Active Students</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-[#0f1b35] mt-2 mb-0.5 tracking-tight">
            {stats.activeTodayCount}
          </div>
          <div className="text-xs text-[#64748b] font-medium flex items-center justify-between">
            <span>&gt; 0 submissions today</span>
            {activeFilter === 'active' && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Filtered</span>
            )}
          </div>
        </button>

        {/* Card 5: Non-Active Students */}
        <button
          type="button"
          onClick={() => handleCardClick('non_active')}
          aria-pressed={activeFilter === 'non_active'}
          aria-label={`Non-Active Students: ${stats.nonActiveTodayCount}. Click to show verified non-active students today.`}
          className={`text-left rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between col-span-2 sm:col-span-1 lg:col-span-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1769ff] ${
            activeFilter === 'non_active'
              ? 'bg-[#f8fafc] border-slate-500 ring-2 ring-slate-400/40 shadow-[0_4px_16px_rgba(100,116,139,0.12)]'
              : 'bg-white border-[#e1eaf5] hover:border-[#cbd5e1] hover:shadow-[0_4px_14px_rgba(30,64,175,0.06)]'
          }`}
        >
          <div className="flex items-center justify-between text-[#64748b] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Non-Active Students</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl lg:text-[28px] font-black text-[#0f1b35] mt-2 mb-0.5 tracking-tight">
            {stats.nonActiveTodayCount}
          </div>
          <div className="text-xs text-[#64748b] font-medium flex items-center justify-between">
            <span>0 submissions today</span>
            {activeFilter === 'non_active' && (
              <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">Filtered</span>
            )}
          </div>
        </button>
      </div>

      {/* 4. Search, Filter & Sort Controls */}
      <div className="bg-white rounded-2xl border border-[#e1eaf5] p-4 shadow-[0_2px_10px_rgba(30,64,175,0.03)] space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 md:max-w-xs lg:max-w-sm">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                sortOption === 'problems_desc'
                  ? 'bg-[#1769ff] text-white shadow-xs'
                  : 'bg-white border border-[#e1eaf5] text-[#475569] hover:bg-slate-50'
              }`}
            >
              🔥 Most Solved
            </button>
            <button
              onClick={() => setSortOption('problems_asc')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                sortOption === 'problems_asc'
                  ? 'bg-[#1769ff] text-white shadow-xs'
                  : 'bg-white border border-[#e1eaf5] text-[#475569] hover:bg-slate-50'
              }`}
            >
              Least Solved
            </button>
            <button
              onClick={() => setSortOption('rating_desc')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                sortOption === 'rating_desc'
                  ? 'bg-[#1769ff] text-white shadow-xs'
                  : 'bg-white border border-[#e1eaf5] text-[#475569] hover:bg-slate-50'
              }`}
            >
              ⭐ Highest Rating
            </button>
            <button
              onClick={() => setSortOption('rating_asc')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                sortOption === 'rating_asc'
                  ? 'bg-[#1769ff] text-white shadow-xs'
                  : 'bg-white border border-[#e1eaf5] text-[#475569] hover:bg-slate-50'
              }`}
            >
              Lowest Rating
            </button>
            <button
              onClick={() => setSortOption('roll_number_asc')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                sortOption === 'roll_number_asc'
                  ? 'bg-[#1769ff] text-white shadow-xs'
                  : 'bg-white border border-[#e1eaf5] text-[#475569] hover:bg-slate-50'
              }`}
            >
              Roll Number
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
            ) : searchTerm ? (
              <>
                <h3 className="text-sm font-bold text-slate-800">No Matching Students Found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  No students in this classroom match your search query &ldquo;{searchTerm}&rdquo;
                  {activeFilter !== 'all' ? ` under the current filter` : ''}.
                </p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-3.5 py-1.5 text-xs font-bold bg-[#eef4ff] text-[#1769ff] hover:bg-blue-100 rounded-xl transition"
                  >
                    Clear search query
                  </button>
                  {activeFilter !== 'all' && (
                    <button
                      onClick={() => handleCardClick('all')}
                      className="px-3.5 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition"
                    >
                      Show all students
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold text-slate-800">
                  {activeFilter === 'linked' && 'No Students with Linked Profiles'}
                  {activeFilter === 'not_linked' && 'All Students Have Linked Profiles'}
                  {activeFilter === 'active' && 'No Active Students Today'}
                  {activeFilter === 'non_active' && 'No Verified Inactive Students Today'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  {activeFilter === 'active' &&
                    'No students have logged verified submissions today yet. Run a classroom scan to refresh the latest heatmap.'}
                  {activeFilter === 'non_active' &&
                    'No students have a verified count of 0 submissions today.'}
                  {activeFilter === 'linked' &&
                    'No students have successfully linked their account for this platform yet.'}
                  {activeFilter === 'not_linked' &&
                    'All enrolled students have a valid linked profile.'}
                </p>
                <button
                  onClick={() => handleCardClick('all')}
                  className="mt-3 px-3.5 py-1.5 text-xs font-bold bg-[#eef4ff] text-[#1769ff] hover:bg-blue-100 rounded-xl transition"
                >
                  Show All Students
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / Large Screen Table (Hidden on small mobile screens) */}
            <div className="hidden md:block overflow-x-auto responsive-table-wrapper">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-[#edf2f9] text-[11px] font-extrabold text-black uppercase tracking-wider">
                    <th className="py-4 px-5 whitespace-nowrap">STUDENT NAME</th>
                    <th className="py-4 px-5 whitespace-nowrap">REGISTRATION NUMBER</th>
                    <th className="py-4 px-5 whitespace-nowrap">{platform === 'leetcode' ? 'LEETCODE HANDLE' : 'CODECHEF HANDLE'}</th>
                    <th className="py-4 px-5 whitespace-nowrap">TODAY&apos;S ACTIVITY</th>
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
                    const todayAct = platform === 'leetcode' ? item.leetcodeTodayActivity : item.codechefTodayActivity;

                    const isLinked = !!account && account.account_status !== 'error' && account.account_status !== 'not_found';
                    const totalSolved = snap?.total_solved != null ? snap.total_solved : null;

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* 1. Student Name */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <Link
                            href={`/students/${s.id}?platform=${platform}&classroomId=${effectiveClassroomId}&filter=${activeFilter}`}
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

                        {/* 4. Today's Activity */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          {!isLinked ? (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          ) : todayAct?.activity_status === 'active' && (todayAct?.submission_count ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                              <span>Active ({todayAct.submission_count} {todayAct.submission_count === 1 ? 'submission' : 'submissions'})</span>
                            </span>
                          ) : todayAct?.activity_status === 'no_activity' && (todayAct?.submission_count ?? 0) === 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>Inactive (0 submissions)</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                              title="Daily activity data not yet scanned or unavailable"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span>Pending Scan</span>
                            </span>
                          )}
                        </td>

                        {/* 5. Total Solved */}
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

            {/* Mobile / Narrow Screen Student Cards Presentation */}
            <div className="md:hidden divide-y divide-[#edf2f9]">
              {processedStudents.map((item) => {
                const s = item.student;
                const account = platform === 'leetcode' ? item.leetcodeAccount : item.codechefAccount;
                const snap = platform === 'leetcode' ? item.leetcodeSnapshot : item.codechefSnapshot;
                const todayAct = platform === 'leetcode' ? item.leetcodeTodayActivity : item.codechefTodayActivity;
                const isLinked = !!account && account.account_status !== 'error' && account.account_status !== 'not_found';
                const totalSolved = snap?.total_solved != null ? snap.total_solved : null;
                const isExpanded = expandedStudentId === s.id;
                const detailsUrl = `/students/${s.id}?platform=${platform}&classroomId=${effectiveClassroomId}&filter=${activeFilter}`;

                return (
                  <div key={`mobile-card-${s.id}`} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors space-y-3.5">
                    {/* Top Row: Student Identity & Primary Action */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#eef4ff] text-[#1769ff] font-bold flex items-center justify-center shrink-0 text-sm shadow-2xs">
                          {s.display_name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={detailsUrl}
                            className="font-bold text-sm text-[#0f1b35] hover:text-[#1769ff] transition block truncate hover:underline"
                          >
                            {s.display_name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-[#64748b]">Reg:</span>
                            {s.register_number ? (
                              <span className="font-mono text-xs font-semibold text-[#334155] bg-slate-100 px-1.5 py-0.5 rounded">
                                {s.register_number}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">—</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Link
                        href={detailsUrl}
                        className="px-3 py-1.5 bg-[#eef4ff] text-[#1769ff] hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1 transition shrink-0 min-h-[36px]"
                        aria-label={`View details for ${s.display_name}`}
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Middle Row: Platform Handle & Today's Activity Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {/* Platform Handle */}
                      {isLinked ? (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50/70 border border-blue-100/80 text-[11px] font-mono font-bold text-[#1769ff]">
                          <span>@{account.username}</span>
                          <a
                            href={account.public_profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open public profile"
                            className="hover:text-blue-700"
                          >
                            <ExternalLink className="w-3 h-3 text-[#1769ff]" />
                          </a>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Not Linked
                        </span>
                      )}

                      {/* Today's Activity */}
                      {!isLinked ? (
                        <span className="text-slate-400 font-mono text-xs">—</span>
                      ) : todayAct?.activity_status === 'active' && (todayAct?.submission_count ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                          <span>Active ({todayAct.submission_count} {todayAct.submission_count === 1 ? 'submission' : 'submissions'})</span>
                        </span>
                      ) : todayAct?.activity_status === 'no_activity' && (todayAct?.submission_count ?? 0) === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Inactive (0 submissions)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>Pending Scan</span>
                        </span>
                      )}
                    </div>

                    {/* Metrics Highlights Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Solved</div>
                        <div className="font-extrabold text-[#1769ff] text-sm mt-0.5">
                          {totalSolved != null ? totalSolved.toLocaleString() : '—'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contest Rating</div>
                        <div className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                          {snap?.contest_rating != null && Number(snap.contest_rating) > 0
                            ? Number(snap.contest_rating).toFixed(1)
                            : platform === 'codechef' && snap?.contest_rating != null
                            ? snap.contest_rating
                            : 'N/A'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {platform === 'leetcode' ? 'Global Rank' : 'Star Tier'}
                        </div>
                        <div className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                          {platform === 'leetcode' ? (
                            snap?.global_rank != null && Number(snap.global_rank) > 0 && Number(snap.global_rank) < 5000000 ? (
                              `#${Number(snap.global_rank).toLocaleString('en-US')}`
                            ) : (
                              'N/A'
                            )
                          ) : snap ? (
                            <span className="inline-flex items-center gap-0.5 text-amber-600 font-bold">
                              <span>{getCodeChefStars(snap.contest_rating ?? snap.highest_rating)}</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Section for Detailed Metrics */}
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => setExpandedStudentId(isExpanded ? null : s.id)}
                        className="text-[11px] font-bold text-[#1769ff] hover:text-blue-700 inline-flex items-center gap-1 transition cursor-pointer"
                        aria-expanded={isExpanded}
                      >
                        <span>{isExpanded ? 'Hide metrics' : 'Show all metrics'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3.5 bg-[#f8faff] rounded-xl border border-blue-100/70 space-y-2.5 animate-in fade-in duration-150 text-xs">
                          {platform === 'leetcode' ? (
                            <>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                  Difficulty Breakdown
                                </span>
                                {snap ? (
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                    <span className="px-2 py-0.5 rounded-md font-bold bg-[#ecfdf5] text-[#059669]">
                                      Easy: {snap.easy_solved ?? 0}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md font-bold bg-[#fffbeb] text-[#d97706]">
                                      Medium: {snap.medium_solved ?? 0}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md font-bold bg-[#fff1f2] text-[#e11d48]">
                                      Hard: {snap.hard_solved ?? 0}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Highest Rating</span>
                                  <span className="font-mono font-bold text-slate-800">
                                    {snap?.highest_rating != null && Number(snap.highest_rating) > 0
                                      ? Number(snap.highest_rating).toFixed(1)
                                      : 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Global Ranking</span>
                                  <span className="font-mono font-bold text-slate-800">
                                    {snap?.global_rank != null && Number(snap.global_rank) > 0 && Number(snap.global_rank) < 5000000
                                      ? `#${Number(snap.global_rank).toLocaleString('en-US')}`
                                      : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Highest Rating</span>
                                  <span className="font-mono font-bold text-slate-800">
                                    {snap?.highest_rating != null
                                      ? Math.round(snap.highest_rating)
                                      : snap?.highest_score != null
                                      ? Math.round(snap.highest_score)
                                      : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Global Rank</span>
                                  <span className="font-mono font-bold text-slate-800">
                                    {snap?.global_rank != null ? `#${snap.global_rank.toLocaleString()}` : '—'}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Country Rank</span>
                                  <span className="font-mono font-bold text-slate-800">
                                    {snap?.country_rank != null ? `#${snap.country_rank.toLocaleString()}` : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Star Tier</span>
                                  <span className="font-bold text-amber-700">
                                    {snap ? getCodeChefStars(snap.contest_rating ?? snap.highest_rating) : '—'}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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
