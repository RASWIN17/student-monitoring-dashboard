'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { ContestCard } from '@/components/ContestCard';
import { Contest } from '@/lib/types';
import {
  Trophy,
  RefreshCw,
  Calendar,
  Clock,
  Users,
  Code2,
  ChefHat,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export default function ContestOverviewPage() {
  const { selectedClassroom } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<'all' | 'leetcode' | 'codechef'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'live' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchContests = async (forceSync = false) => {
    if (forceSync) setRefreshing(true);
    else setLoading(true);

    try {
      const classroomParam = selectedClassroom ? `&classroomId=${selectedClassroom.id}` : '';
      const syncParam = forceSync ? '&sync=true' : '';
      const res = await fetch(`/api/contests?platform=all${classroomParam}${syncParam}`);
      if (res.ok) {
        const json = await res.json();
        setContests(json.contests || []);
      }
    } catch (err) {
      console.error('Failed to load contest overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, [selectedClassroom]);

  const filteredContests = contests.filter((c) => {
    if (platformFilter !== 'all' && c.platform !== platformFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.contest_code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const liveContests = filteredContests.filter((c) => c.status === 'live');
  const upcomingContests = filteredContests.filter((c) => c.status === 'upcoming');
  const completedContests = filteredContests.filter((c) => c.status === 'completed');

  // Aggregated KPI counts
  const totalUpcoming = contests.filter((c) => c.status === 'upcoming').length;
  const totalLive = contests.filter((c) => c.status === 'live').length;
  const totalCompleted = contests.filter((c) => c.status === 'completed').length;
  const leetcodeCount = contests.filter((c) => c.platform === 'leetcode').length;
  const codechefCount = contests.filter((c) => c.platform === 'codechef').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Contest Overview</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Unified live monitoring across LeetCode and CodeChef contests with verified classroom analytics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => fetchContests(true)}
            disabled={refreshing}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-2 transition disabled:opacity-50"
            title="Sync contest schedules from both platforms"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-600' : 'text-slate-500'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Sync Both Platforms'}</span>
          </button>
        </div>
      </div>

      {/* Classroom Context Notice */}
      {selectedClassroom && (
        <div className="px-4 py-2.5 bg-purple-50/70 border border-purple-200/60 rounded-xl flex items-center justify-between text-xs text-purple-950">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Selected Classroom:</span>
            <span>{selectedClassroom.name} ({selectedClassroom.course} - Sec {selectedClassroom.section})</span>
          </div>
          <span className="text-[11px] text-purple-800 font-medium">Timezone: Asia/Kolkata</span>
        </div>
      )}

      {/* Top Unified Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Upcoming Contests</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{totalUpcoming}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">LeetCode & CodeChef scheduled</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Live Contests</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{totalLive}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active right now</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Completed Contests</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCompleted}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Scanned & verified records</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Monitored Platforms</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">2</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {leetcodeCount} LeetCode • {codechefCount} CodeChef
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Platform Filter */}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
            <button
              onClick={() => setPlatformFilter('all')}
              className={`px-3 py-1.5 rounded-md transition ${
                platformFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              All Platforms
            </button>
            <button
              onClick={() => setPlatformFilter('leetcode')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                platformFilter === 'leetcode'
                  ? 'bg-white text-amber-700 shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-amber-600" />
              <span>LeetCode ({leetcodeCount})</span>
            </button>
            <button
              onClick={() => setPlatformFilter('codechef')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                platformFilter === 'codechef'
                  ? 'bg-white text-orange-700 shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5 text-orange-600" />
              <span>CodeChef ({codechefCount})</span>
            </button>
          </div>

          {/* Status Filter */}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter('upcoming')}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'upcoming'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Upcoming ({totalUpcoming})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'completed'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Completed ({totalCompleted})
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search contest title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 bg-slate-200 rounded w-28" />
                <div className="h-4 bg-slate-200 rounded w-16" />
              </div>
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-8 bg-slate-100 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : filteredContests.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-xl border border-slate-200 p-8 shadow-2xs">
          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Contests Match Your Filters</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No contests matching "${searchQuery}". Clear your search query to see all contests.`
              : 'Try clearing your platform or status filters, or click "Sync Both Platforms" above.'}
          </p>
          {(searchQuery || platformFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setPlatformFilter('all');
                setStatusFilter('all');
              }}
              className="mt-3 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg hover:bg-purple-100 transition"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Live Contests */}
          {liveContests.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-800">
                  Live Contests In Progress
                </h2>
                <span className="text-xs text-emerald-600 font-medium">({liveContests.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {liveContests.map((c) => {
                  const href = c.platform === 'leetcode' ? `/leetcode/${c.id}` : `/codechef/${c.id}`;
                  return <ContestCard key={c.id} contest={c} href={href} />;
                })}
              </div>
            </div>
          )}

          {/* Upcoming Contests */}
          {statusFilter !== 'completed' && upcomingContests.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Upcoming Contests & Schedules
                </h2>
                <span className="text-xs text-slate-400 font-medium">({upcomingContests.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {upcomingContests.map((c) => {
                  const href = c.platform === 'leetcode' ? `/leetcode/${c.id}` : `/codechef/${c.id}`;
                  return <ContestCard key={c.id} contest={c} href={href} />;
                })}
              </div>
            </div>
          )}

          {/* Completed Contests */}
          {statusFilter !== 'upcoming' && completedContests.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Completed Contests & Analytics
                </h2>
                <span className="text-xs text-slate-400 font-medium">({completedContests.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {completedContests.map((c) => {
                  const href = c.platform === 'leetcode' ? `/leetcode/${c.id}` : `/codechef/${c.id}`;
                  return <ContestCard key={c.id} contest={c} href={href} />;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
