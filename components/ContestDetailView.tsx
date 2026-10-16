'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  ChevronDown,
  Check,
  ExternalLink,
  HelpCircle,
  RefreshCw,
  Scan,
  Info,
} from 'lucide-react';
import { Contest, StudentContestAttendanceRow } from '@/lib/types';
import { RefreshModal } from '@/components/RefreshModal';
import { dataCache } from '@/components/DataCacheContext';

interface ContestDataCache {
  contest: Contest | null;
  linkedAccounts: StudentContestAttendanceRow[];
  attended: StudentContestAttendanceRow[];
  notAttended: StudentContestAttendanceRow[];
  pendingVerification: StudentContestAttendanceRow[];
  summary: { totalLinked: number; attendedCount: number; notAttendedCount: number; pendingCount: number };
  scanMessage?: string | null;
}

interface ContestDetailViewProps {
  platform: 'leetcode' | 'codechef';
  contestId: string;
}

export function ContestDetailView({ platform, contestId }: ContestDetailViewProps) {
  const { selectedClassroom } = useAuth();
  const cacheKey = `contest:${platform}:${contestId}:${selectedClassroom?.id || 'all'}`;
  const uiKey = `ui:${platform}:contest:${contestId}`;

  const cachedData = dataCache.get<ContestDataCache>(cacheKey);
  const [contest, setContest] = useState<Contest | null>(() => cachedData?.contest || null);
  const [linkedAccounts, setLinkedAccounts] = useState<StudentContestAttendanceRow[]>(() => cachedData?.linkedAccounts || []);
  const [attended, setAttended] = useState<StudentContestAttendanceRow[]>(() => cachedData?.attended || []);
  const [notAttended, setNotAttended] = useState<StudentContestAttendanceRow[]>(() => cachedData?.notAttended || []);
  const [pendingVerification, setPendingVerification] = useState<StudentContestAttendanceRow[]>(() => cachedData?.pendingVerification || []);
  const [summary, setSummary] = useState(() => cachedData?.summary || {
    totalLinked: 0,
    attendedCount: 0,
    notAttendedCount: 0,
    pendingCount: 0,
  });

  const [loading, setLoading] = useState(() => !cachedData);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(() => cachedData?.scanMessage || null);
  const [showRefreshPopup, setShowRefreshPopup] = useState(false);

  const savedUI = dataCache.getUI<{
    activeCard: 'attended' | 'not_attended' | 'pending' | 'linked';
    solvedFilter: number | null;
    searchQuery: string;
  }>(uiKey);

  // Active view: default to 'linked' as in the reference screenshots (Card 1 selected)
  const [activeCard, setActiveCard] = useState<'attended' | 'not_attended' | 'pending' | 'linked'>(
    savedUI?.activeCard || 'linked'
  );

  // Problem-solved filter: null | 1 | 2 | ...
  const [solvedFilter, setSolvedFilter] = useState<number | null>(savedUI?.solvedFilter ?? null);
  const [searchQuery, setSearchQuery] = useState(savedUI?.searchQuery || '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    dataCache.setUI(uiKey, { activeCard, solvedFilter, searchQuery });
  }, [uiKey, activeCard, solvedFilter, searchQuery]);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLive: false,
    isCompleted: false,
  });

  const fetchContestData = async (force = false) => {
    if (!force && !dataCache.get(cacheKey)) setLoading(true);
    try {
      const classroomParam = selectedClassroom ? `?classroomId=${selectedClassroom.id}` : '';
      const res = await fetch(`/api/contests/${contestId}${classroomParam}`);
      if (res.ok) {
        const json = await res.json();
        const loadedData: ContestDataCache = {
          contest: json.contest,
          linkedAccounts: json.linkedAccounts || [],
          attended: json.attended || [],
          notAttended: json.notAttended || [],
          pendingVerification: json.pendingVerification || [],
          summary: json.summary || { totalLinked: 0, attendedCount: 0, notAttendedCount: 0, pendingCount: 0 },
          scanMessage: json.contest?.scan_message || null,
        };
        setContest(loadedData.contest);
        setLinkedAccounts(loadedData.linkedAccounts);
        setAttended(loadedData.attended);
        setNotAttended(loadedData.notAttended);
        setPendingVerification(loadedData.pendingVerification);
        setSummary(loadedData.summary);
        if (loadedData.scanMessage) {
          setScanMessage(loadedData.scanMessage);
        }
        dataCache.set(cacheKey, loadedData);
      }
    } catch (err) {
      console.error('Failed to load contest analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = dataCache.get<ContestDataCache>(cacheKey);
    if (cached) {
      setContest(cached.contest);
      setLinkedAccounts(cached.linkedAccounts);
      setAttended(cached.attended);
      setNotAttended(cached.notAttended);
      setPendingVerification(cached.pendingVerification);
      setSummary(cached.summary);
      if (cached.scanMessage) setScanMessage(cached.scanMessage);
      setLoading(false);
    } else {
      fetchContestData();
    }
  }, [cacheKey]);

  // Live countdown timer logic
  useEffect(() => {
    if (!contest) return;

    const tick = () => {
      const now = Date.now();
      const startMs = new Date(contest.start_time).getTime();
      const endMs = new Date(contest.end_time).getTime();

      if (now >= endMs) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: false, isCompleted: true });
        return;
      }

      if (now >= startMs) {
        const diff = Math.max(0, endMs - now);
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
          isLive: true,
          isCompleted: false,
        });
        return;
      }

      const diff = Math.max(0, startMs - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        isLive: false,
        isCompleted: false,
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [contest]);

  // Manual Scan trigger
  const handleScanNow = async () => {
    setScanning(true);
    setScanMessage(`Initiating scan with official ${platform === 'codechef' ? 'CodeChef' : 'LeetCode'} records...`);
    try {
      const res = await fetch(`/api/contests/${contestId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId: selectedClassroom?.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setScanMessage(data.message || 'Scan completed successfully.');
        await fetchContestData(true);
        setShowRefreshPopup(true);
      } else {
        setScanMessage(data.error || 'Failed to scan contest.');
      }
    } catch {
      setScanMessage('Network error occurred during scan.');
    } finally {
      setScanning(false);
    }
  };

  // Determine base list according to activeCard
  let baseList: StudentContestAttendanceRow[] = [];
  if (activeCard === 'attended') {
    baseList = attended;
  } else if (activeCard === 'not_attended') {
    baseList = notAttended;
  } else if (activeCard === 'pending') {
    baseList = pendingVerification;
  } else {
    baseList = linkedAccounts;
  }

  // Calculate dynamic problem count options
  const problemOptions = useMemo(() => {
    const maxTotalInRecords = Math.max(0, ...baseList.map((r) => r.contest_total_problems || 0));
    const maxSolvedInRecords = Math.max(0, ...baseList.map((r) => r.contest_problems_solved || 0));

    let maxProblems = 6;
    if (platform === 'leetcode') {
      maxProblems = Math.max(10, maxTotalInRecords, maxSolvedInRecords);
    } else {
      maxProblems = Math.max(6, maxTotalInRecords, maxSolvedInRecords);
    }

    const options: number[] = [];
    for (let i = 1; i <= maxProblems; i++) {
      options.push(i);
    }
    return options;
  }, [baseList, platform]);

  // Apply Problem-Solved Filter and search
  const filteredList = baseList.filter((item) => {
    if (solvedFilter !== null) {
      if (item.contest_problems_solved !== solvedFilter) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.student_name.toLowerCase().includes(q) ||
        (item.register_number && item.register_number.toLowerCase().includes(q)) ||
        item.username.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const formatKolkata = (iso: string) => {
    try {
      const d = new Date(iso);
      const datePart = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
      const timePart = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d).toLowerCase();

      const parts = datePart.split(' ');
      const formattedDate =
        parts.length >= 4
          ? `${parts[0]} ${parts[1]} ${parts[2].replace(',', '')}, ${parts[3]}`
          : datePart;

      return `${formattedDate}, ${timePart}`;
    } catch {
      return iso;
    }
  };

  const isContestOngoingOrUpcoming = !timeLeft.isCompleted && contest?.status !== 'completed';

  const backLink = platform === 'codechef' ? '/codechef' : '/leetcode';
  const backText = platform === 'codechef' ? 'Back to CodeChef Contests' : 'Back to LeetCode Contests';

  const platformBadgeLabel =
    platform === 'codechef'
      ? 'CODECHEF CHALLENGE'
      : contest?.title?.toLowerCase().includes('biweekly')
      ? 'LEETCODE BIWEEKLY'
      : 'LEETCODE CONTEST';

  const classroomLabel = selectedClassroom
    ? selectedClassroom.department || selectedClassroom.name.split(' ')[0] || selectedClassroom.name
    : 'All Classrooms';

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href={backLink} className="inline-flex items-center gap-1.5 hover:text-blue-600 transition font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{backText}</span>
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-[#0f1b35] font-bold">{contest?.title || 'Contest Details'}</span>
      </div>

      {/* Contest Information Header Card */}
      <div className="bg-white rounded-2xl border border-[#e1eaf5] p-6 shadow-[0_2px_12px_rgba(30,64,175,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            {/* Badges Row */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-md bg-[#fff4ed] text-[#ea580c] border border-[#fed7aa]/50">
                {platformBadgeLabel}
              </span>
              {timeLeft.isCompleted || contest?.status === 'completed' ? (
                <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1]">
                  Completed
                </span>
              ) : timeLeft.isLive || contest?.status === 'live' ? (
                <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 animate-pulse flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Now
                </span>
              ) : (
                <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
                  Upcoming
                </span>
              )}
            </div>

            {/* Contest Title */}
            <h1 className="text-2xl sm:text-[26px] font-black text-[#0f1b35] tracking-tight">
              {contest?.title || 'Contest Details'}
            </h1>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-0.5">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Start: {contest ? formatKolkata(contest.start_time) : '—'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Duration: {contest ? Math.round(contest.duration_seconds / 60) : 90} mins</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#ea580c]">Classroom: {classroomLabel}</span>
              </div>
            </div>
          </div>

          {/* Right-Side Action / Countdown Box */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isContestOngoingOrUpcoming ? (
              <div className="bg-[#fff8f5] border border-[#ffedd5] rounded-xl px-7 py-3 text-center min-w-[170px] shadow-[0_1px_3px_rgba(234,88,12,0.04)]">
                <div className="text-[10px] font-extrabold text-[#ea580c] uppercase tracking-wider mb-0.5">
                  {timeLeft.isLive ? 'CONTEST IS LIVE' : 'STARTS IN'}
                </div>
                <div className="font-mono text-base font-extrabold text-[#0f1b35]">
                  {timeLeft.isLive
                    ? `${String(timeLeft.hours).padStart(2, '0')}h : ${String(timeLeft.minutes).padStart(2, '0')}m : ${String(timeLeft.seconds).padStart(2, '0')}s`
                    : timeLeft.days > 0
                    ? `${timeLeft.days}d : ${String(timeLeft.hours).padStart(2, '0')}h : ${String(timeLeft.minutes).padStart(2, '0')}m : ${String(timeLeft.seconds).padStart(2, '0')}s`
                    : `${String(timeLeft.hours).padStart(2, '0')}h : ${String(timeLeft.minutes).padStart(2, '0')}m : ${String(timeLeft.seconds).padStart(2, '0')}s`}
                </div>
              </div>
            ) : (
              <button
                onClick={handleScanNow}
                disabled={scanning}
                className="px-5 py-2.5 bg-[#1769ff] hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-[0_4px_16px_rgba(23,105,255,0.25)] flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Scan className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                <span>{scanning ? 'Scanning...' : 'Scan Now'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Scan Status Banner */}
        {scanMessage && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-700">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-800">Scan Status:</div>
              <div>{scanMessage}</div>
              {contest?.last_scanned_at && (
                <div className="text-[11px] text-slate-400 mt-1">
                  Last scanned at: {formatKolkata(contest.last_scanned_at)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Four Primary Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Linked Accounts */}
        <button
          type="button"
          onClick={() => setActiveCard('linked')}
          className={`text-left p-5 rounded-2xl transition-all duration-150 ${
            activeCard === 'linked'
              ? 'border-2 border-[#1769ff] bg-[#fbfdff] shadow-[0_4px_16px_rgba(23,105,255,0.06)]'
              : 'border border-[#e1eaf5] bg-white hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              1. LINKED ACCOUNTS
            </span>
            <Users className="w-4 h-4 text-[#1769ff]" />
          </div>
          <div className="text-3xl font-black text-[#0f1b35] my-2">{summary.totalLinked}</div>
          <div className="text-xs text-slate-400 font-medium">
            {platform === 'codechef'
              ? 'Verified student accounts linked to CodeChef'
              : 'Verified student accounts linked to LeetCode'}
          </div>
        </button>

        {/* Card 2: Contest Attended */}
        <button
          type="button"
          onClick={() => setActiveCard('attended')}
          className={`text-left p-5 rounded-2xl transition-all duration-150 ${
            activeCard === 'attended'
              ? 'border-2 border-[#16a34a] bg-[#fbfdfb] shadow-[0_4px_16px_rgba(22,163,74,0.06)]'
              : 'border border-[#e1eaf5] bg-white hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#16a34a]">
              2. CONTEST ATTENDED
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
          </div>
          <div className="text-3xl font-black text-[#16a34a] my-2">
            {isContestOngoingOrUpcoming ? '—' : summary.attendedCount}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {isContestOngoingOrUpcoming
              ? 'Available after contest completes'
              : 'Verified participants with evidence'}
          </div>
        </button>

        {/* Card 3: Contest Not Attended */}
        <button
          type="button"
          onClick={() => setActiveCard('not_attended')}
          className={`text-left p-5 rounded-2xl transition-all duration-150 ${
            activeCard === 'not_attended'
              ? 'border-2 border-[#dc2626] bg-[#fdfbfb] shadow-[0_4px_16px_rgba(220,38,38,0.06)]'
              : 'border border-[#e1eaf5] bg-white hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#dc2626]">
              3. CONTEST NOT ATTENDED
            </span>
            <XCircle className="w-4 h-4 text-[#dc2626]" />
          </div>
          <div className="text-3xl font-black text-[#dc2626] my-2">
            {isContestOngoingOrUpcoming ? '—' : summary.notAttendedCount}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {isContestOngoingOrUpcoming
              ? 'Available after contest completes'
              : `${summary.notAttendedCount} verified absent`}
          </div>
        </button>

        {/* Card 4: Pending Verification */}
        <button
          type="button"
          onClick={() => setActiveCard('pending')}
          className={`text-left p-5 rounded-2xl transition-all duration-150 ${
            activeCard === 'pending'
              ? 'border-2 border-[#d97706] bg-[#fffdfb] shadow-[0_4px_16px_rgba(217,119,6,0.06)]'
              : 'border border-[#e1eaf5] bg-white hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d97706]">
              4. PENDING VERIFICATION
            </span>
            <Clock className="w-4 h-4 text-[#d97706]" />
          </div>
          <div className="text-3xl font-black text-[#0f1b35] my-2">
            {summary.pendingCount}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {summary.pendingCount === 1 ? '1 student awaiting verification' : `${summary.pendingCount} students awaiting verification`}
          </div>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl border border-[#e1eaf5] p-4 shadow-[0_2px_10px_rgba(30,64,175,0.03)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-[#1769ff]" />
            <span className="text-xs font-extrabold text-[#0f1b35] uppercase tracking-wider">
              CONTEST PROBLEMS SOLVED
            </span>
          </div>

          {/* Custom Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="border border-[#1769ff] bg-white text-[#0f1b35] text-xs font-bold rounded-xl px-3.5 py-2 flex items-center justify-between gap-4 min-w-[130px] shadow-[0_1px_3px_rgba(23,105,255,0.08)] hover:bg-blue-50/20 transition"
            >
              <span>
                {solvedFilter === null
                  ? 'Starting'
                  : `${solvedFilter} ${solvedFilter === 1 ? 'Problem' : 'Problems'}`}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#1769ff] transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-44 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-[#e1eaf5] py-1.5 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setSolvedFilter(null);
                    setDropdownOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#0f1b35] hover:bg-[#f1f5f9] flex items-center justify-between transition"
                >
                  <span>Starting</span>
                  {solvedFilter === null && <Check className="w-3.5 h-3.5 text-[#1769ff]" />}
                </button>
                {problemOptions.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setSolvedFilter(num);
                      setDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#334155] hover:bg-[#f1f5f9] flex items-center justify-between transition"
                  >
                    <span>{num} {num === 1 ? 'Problem' : 'Problems'}</span>
                    {solvedFilter === num && <Check className="w-3.5 h-3.5 text-[#1769ff]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search student or handle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#e1eaf5] rounded-xl text-xs placeholder-slate-400 text-[#0f1b35] focus:outline-none focus:border-[#1769ff] transition shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Main Student Data Table */}
      <div className="bg-white rounded-2xl border border-[#e1eaf5] shadow-[0_2px_12px_rgba(30,64,175,0.03)] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1769ff]" />
            <span className="text-xs font-semibold">Loading student contest records...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-20 text-center text-slate-400 p-6">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">No Students Found</div>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {searchQuery
                ? `No students matching "${searchQuery}".`
                : solvedFilter !== null
                ? `No students solved exactly ${solvedFilter} problem${solvedFilter === 1 ? '' : 's'} in this contest.`
                : activeCard === 'attended'
                ? isContestOngoingOrUpcoming
                  ? 'Contest is not completed yet. Final participation records will be scanned automatically ~1 min after contest ends.'
                  : 'No verified students attended this contest.'
                : activeCard === 'not_attended'
                ? 'All verified students attended this contest.'
                : activeCard === 'pending'
                ? 'No students awaiting verification for this contest.'
                : `No student accounts are linked to ${platform === 'codechef' ? 'CodeChef' : 'LeetCode'} in this classroom.`}
            </p>
            {solvedFilter !== null && (
              <button
                type="button"
                onClick={() => setSolvedFilter(null)}
                className="mt-3 px-3 py-1.5 bg-blue-50 text-[#1769ff] text-xs font-semibold rounded-lg hover:bg-blue-100 transition"
              >
                Reset Solved Filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fbfcfd] border-b border-[#e1eaf5] text-[#64748b] font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-6">
                    {platform === 'codechef' ? 'NAME' : 'STUDENT NAME'}
                  </th>
                  <th className="py-4 px-6">REGISTER NUMBER</th>
                  <th className="py-4 px-6">
                    {platform === 'codechef' ? 'CODECHEF USERNAME' : 'LEETCODE USERNAME'}
                  </th>
                  <th className="py-4 px-6 text-center">
                    {platform === 'codechef' ? 'PARTICIPATION STATUS' : 'CONTEST STATUS'}
                  </th>
                  <th className="py-4 px-6 text-center bg-[#fff8f5] text-[#9a3412] font-black border-l border-[#ffedd5]/60 w-[220px]">
                    CONTEST PROBLEMS SOLVED
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] text-[#334155]">
                {filteredList.map((st, idx) => (
                  <tr key={idx} className="hover:bg-[#f8fafc]/80 transition-colors">
                    {/* 1. Student Name */}
                    <td className="py-4 px-6 font-bold text-[#0f1b35] whitespace-nowrap">
                      <Link
                        href={`/students/${st.student_id}?platform=${platform}`}
                        className="hover:text-[#1769ff] hover:underline transition"
                      >
                        {st.student_name}
                      </Link>
                    </td>

                    {/* 2. Register Number */}
                    <td className="py-4 px-6 font-mono text-[#334155] font-semibold whitespace-nowrap">
                      {st.register_number ? st.register_number : <span className="text-slate-400 font-mono">—</span>}
                    </td>

                    {/* 3. Platform Username */}
                    <td className="py-4 px-6 font-mono text-[#0f1b35] font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{st.username}</span>
                        {st.public_profile_url && (
                          <a
                            href={st.public_profile_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-[#1769ff] transition"
                            title={`Open ${platform === 'codechef' ? 'CodeChef' : 'LeetCode'} Profile`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* 4. Contest / Participation Status */}
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      {st.participation_status === 'attended' ? (
                        <span className="inline-flex items-center gap-1.5 text-[#059669] bg-[#ecfdf5] border border-emerald-200/80 px-3 py-1 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                          <span>Attended</span>
                        </span>
                      ) : st.participation_status === 'pending_verification' ? (
                        <span className="inline-flex items-center gap-1.5 text-[#1769ff] bg-[#eef4ff] border border-blue-200/80 px-3 py-1 rounded-full text-xs font-bold">
                          <Clock className="w-3.5 h-3.5 text-[#1769ff]" />
                          <span>Pending Verification</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[#64748b] bg-[#f8fafc] border border-slate-200 px-3 py-1 rounded-full text-xs font-bold">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          <span>Absent</span>
                        </span>
                      )}
                    </td>

                    {/* 5. Contest Problems Solved */}
                    <td className="py-4 px-6 text-center bg-[#fff8f5]/40 border-l border-[#ffedd5]/40 whitespace-nowrap">
                      {isContestOngoingOrUpcoming || st.participation_status !== 'attended' || st.contest_problems_solved === null ? (
                        <span className="text-[#ea580c] font-black text-sm">—</span>
                      ) : (
                        <span className="font-mono font-black text-sm text-[#0f1b35]">
                          {st.contest_problems_solved}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RefreshModal isOpen={showRefreshPopup} />
    </div>
  );
}
