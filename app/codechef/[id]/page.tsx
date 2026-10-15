'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import {
  ChefHat,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  HelpCircle,
  Filter,
  Search,
  Timer,
  Info,
} from 'lucide-react';
import { Contest, StudentContestAttendanceRow } from '@/lib/types';
import { RefreshModal } from '@/components/RefreshModal';

interface PageProps {
  params: Promise<{ id: string }>;
}

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

export default function CodeChefContestDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const contestId = resolvedParams.id;

  const { selectedClassroom } = useAuth();
  const cacheKey = `contest:codechef:${contestId}:${selectedClassroom?.id || 'all'}`;
  const uiKey = `ui:codechef:contest:${contestId}`;

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

  // Active view: 'attended' | 'not_attended' | 'pending' | 'linked'
  const [activeCard, setActiveCard] = useState<'attended' | 'not_attended' | 'pending' | 'linked'>(
    savedUI?.activeCard || 'attended'
  );

  // Problem-solved filter: null | 1 | 2 | ... | 10
  const [solvedFilter, setSolvedFilter] = useState<number | null>(savedUI?.solvedFilter ?? null);
  const [searchQuery, setSearchQuery] = useState(savedUI?.searchQuery || '');

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
    setScanMessage('Initiating scan with official CodeChef records...');
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

  // Determine which list to display based on activeCard
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

  // Apply Problem-Solved Filter and search
  const totalSolvedCount = solvedFilter !== null
    ? baseList.filter((item) => item.contest_problems_solved === solvedFilter).length
    : 0;

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
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const isContestOngoingOrUpcoming = !timeLeft.isCompleted && contest?.status !== 'completed';

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/codechef" className="inline-flex items-center gap-1 hover:text-orange-600 transition font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to CodeChef Contests</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{contest?.title || 'Contest Details'}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200">
                CodeChef Challenge
              </span>
              {timeLeft.isCompleted || contest?.status === 'completed' ? (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Completed
                </span>
              ) : timeLeft.isLive || contest?.status === 'live' ? (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 animate-pulse flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Now
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                  Upcoming
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{contest?.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Start: {contest ? formatKolkata(contest.start_time) : '—'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Duration: {contest ? Math.round(contest.duration_seconds / 60) : 120} mins</span>
              </div>
              <div className="flex items-center gap-1.5 text-orange-700 font-medium">
                <span>Classroom: {selectedClassroom ? selectedClassroom.name : 'All Classrooms'}</span>
              </div>
            </div>
          </div>

          {/* Action / Countdown Box */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isContestOngoingOrUpcoming ? (
              <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-xl text-center min-w-[200px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                  {timeLeft.isLive ? 'Contest Is Live' : 'Starts In'}
                </div>
                <div className="font-mono text-base font-bold text-orange-950 mt-0.5">
                  {timeLeft.isLive
                    ? `${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`
                    : `${timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}${String(timeLeft.hours).padStart(2, '0')}h : ${String(timeLeft.minutes).padStart(2, '0')}m : ${String(timeLeft.seconds).padStart(2, '0')}s`}
                </div>
              </div>
            ) : (
              <button
                onClick={handleScanNow}
                disabled={scanning}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                <span>{scanning ? 'Scanning CodeChef...' : 'Scan Now'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Scan Status Banner */}
        {scanMessage && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-700">
            <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
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

        {/* Notice for Ongoing / Upcoming contests */}
        {isContestOngoingOrUpcoming && (
          <div className="mt-4 p-3.5 bg-orange-50/80 border border-orange-200 rounded-lg flex items-start gap-2.5 text-xs text-orange-950">
            <Clock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Contest in progress / upcoming:</div>
              <p className="mt-0.5 text-orange-800 leading-relaxed">
                Official final attendance and performance will be scanned automatically approximately 1 minute after the contest ends.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Four Primary Summary Cards (Clickable) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Linked Accounts */}
        <button
          onClick={() => setActiveCard('linked')}
          className={`text-left p-5 rounded-xl border transition-all duration-200 shadow-2xs relative ${
            activeCard === 'linked'
              ? 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Linked Accounts
            </span>
            <Users className={`w-4 h-4 ${activeCard === 'linked' ? 'text-blue-600' : 'text-slate-400'}`} />
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{summary.totalLinked}</div>
          <div className="text-xs text-slate-500 mt-1">Verified student accounts linked to CodeChef</div>
          {activeCard === 'linked' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-b-xl" />
          )}
        </button>

        {/* Card 2: Contest Attended */}
        <button
          onClick={() => setActiveCard('attended')}
          className={`text-left p-5 rounded-xl border transition-all duration-200 shadow-2xs relative ${
            activeCard === 'attended'
              ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              2. Contest Attended
            </span>
            <CheckCircle2 className={`w-4 h-4 ${activeCard === 'attended' ? 'text-emerald-600' : 'text-slate-400'}`} />
          </div>
          <div className="text-3xl font-bold text-emerald-950 mt-2">
            {isContestOngoingOrUpcoming ? '—' : summary.attendedCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {isContestOngoingOrUpcoming
              ? 'Available after contest completes'
              : 'Verified participants in contest history'}
          </div>
          {activeCard === 'attended' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-b-xl" />
          )}
        </button>

        {/* Card 3: Contest Not Attended */}
        <button
          onClick={() => setActiveCard('not_attended')}
          className={`text-left p-5 rounded-xl border transition-all duration-200 shadow-2xs relative ${
            activeCard === 'not_attended'
              ? 'bg-rose-50/60 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              3. Contest Not Attended
            </span>
            <XCircle className={`w-4 h-4 ${activeCard === 'not_attended' ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className="text-3xl font-bold text-rose-950 mt-2">
            {isContestOngoingOrUpcoming ? '—' : summary.notAttendedCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {isContestOngoingOrUpcoming
              ? 'Available after contest completes'
              : `${summary.notAttendedCount} verified absent`}
          </div>
          {activeCard === 'not_attended' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-600 rounded-b-xl" />
          )}
        </button>

        {/* Card 4: Pending Verification */}
        <button
          onClick={() => setActiveCard('pending')}
          className={`text-left p-5 rounded-xl border transition-all duration-200 shadow-2xs relative ${
            activeCard === 'pending'
              ? 'bg-amber-50/60 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              4. Pending Verification
            </span>
            <Clock className={`w-4 h-4 ${activeCard === 'pending' ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <div className="text-3xl font-bold text-amber-950 mt-2">
            {summary.pendingCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {summary.pendingCount === 1 ? '1 student awaiting verification' : `${summary.pendingCount} students awaiting verification`}
          </div>
          {activeCard === 'pending' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-600 rounded-b-xl" />
          )}
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Active List Heading */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Showing List:</span>
            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded">
              {activeCard === 'attended'
                ? `Contest Attended (${attended.length})`
                : activeCard === 'not_attended'
                ? `Contest Not Attended (${notAttended.length})`
                : activeCard === 'pending'
                ? `Pending Verification (${pendingVerification.length})`
                : `Linked Accounts (${linkedAccounts.length})`}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student or handle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Problem Solved Filter */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-[11px] uppercase tracking-wider">Contest Problems Solved Filter:</span>
          </div>

          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              onClick={() => setSolvedFilter(solvedFilter === num ? null : num)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                solvedFilter === num
                  ? 'bg-orange-600 text-white font-semibold shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {num} {num === 1 ? 'Problem' : 'Problems'} Solved
            </button>
          ))}

          {solvedFilter !== null && (
            <button
              onClick={() => setSolvedFilter(null)}
              className="text-[11px] text-red-600 hover:text-red-700 font-semibold ml-2 underline"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Student Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {solvedFilter !== null && (
          <div className="px-4 py-2.5 bg-orange-50/80 border-b border-orange-100 flex items-center justify-between text-xs text-orange-950">
            <span className="font-semibold">
              Total number of students solved {solvedFilter} {solvedFilter === 1 ? 'problem' : 'problems'} ({totalSolvedCount})
            </span>
            <button
              onClick={() => setSolvedFilter(null)}
              className="text-[11px] text-orange-700 hover:text-orange-900 font-semibold underline"
            >
              Clear Filter
            </button>
          </div>
        )}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-600" />
            <span className="text-xs font-semibold">Loading CodeChef student contest records...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-20 text-center text-slate-400 p-6">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">No Students Found</div>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {solvedFilter !== null
                ? `No students solved exactly ${solvedFilter} problem${solvedFilter === 1 ? '' : 's'} in this contest.`
                : activeCard === 'attended'
                ? isContestOngoingOrUpcoming
                  ? 'Contest is not completed yet. Final participation records will be scanned automatically ~1 min after contest ends.'
                  : 'No verified students attended this contest.'
                : activeCard === 'not_attended'
                ? 'All verified students attended this contest.'
                : activeCard === 'pending'
                ? 'No students awaiting verification for this contest.'
                : 'No student accounts are linked to CodeChef in this classroom.'}
            </p>
            {solvedFilter !== null && (
              <button
                onClick={() => setSolvedFilter(null)}
                className="mt-3 px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-lg hover:bg-orange-100 transition"
              >
                Reset Solved Filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-[28%] sm:w-[26%]">Name</th>
                  <th className="py-3.5 px-4 w-[20%] sm:w-[18%]">Register Number</th>
                  <th className="py-3.5 px-4 w-[22%] sm:w-[22%]">CodeChef Username</th>
                  <th className="py-3.5 px-4 text-center w-[16%] sm:w-[18%]">Participation Status</th>
                  <th className="py-3.5 px-4 text-center bg-orange-50/50 text-orange-950 border-l border-orange-100 w-[14%] sm:w-[16%]">
                    Contest Problems Solved
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredList.map((st, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    {/* 1. Name */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      <Link
                        href={`/students/${st.student_id}?platform=codechef`}
                        className="hover:text-orange-600 hover:underline transition"
                      >
                        {st.student_name}
                      </Link>
                    </td>

                    {/* 2. Register Number */}
                    <td className="py-3.5 px-4 font-mono text-slate-700 font-medium whitespace-nowrap">
                      {st.register_number ? st.register_number : <span className="text-slate-400 font-mono">—</span>}
                    </td>

                    {/* 3. CodeChef Username */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-slate-800">
                        <span>{st.username}</span>
                        {st.public_profile_url && (
                          <a
                            href={st.public_profile_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-orange-600"
                            title="Open CodeChef Profile"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* 4. Participation Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {st.participation_status === 'attended' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded text-[11px] font-semibold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Attended
                        </span>
                      ) : st.participation_status === 'pending_verification' ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2.5 py-1 rounded text-[11px] font-semibold border border-blue-200">
                          <Clock className="w-3 h-3" /> Pending Verification
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 px-2.5 py-1 rounded text-[11px] font-semibold border border-slate-200">
                          <XCircle className="w-3 h-3" /> Absent
                        </span>
                      )}
                    </td>

                    {/* 5. Contest Problems Solved */}
                    <td className="py-3.5 px-4 text-center font-bold text-base bg-orange-50/30 text-orange-950 border-l border-orange-100/60 font-mono">
                      {st.participation_status === 'attended'
                        ? st.contest_problems_solved !== null
                          ? st.contest_problems_solved
                          : <span className="text-xs text-slate-400 font-normal">Data Unavailable</span>
                        : '—'}
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
