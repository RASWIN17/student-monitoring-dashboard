'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { ContestCard } from '@/components/ContestCard';
import { Contest } from '@/lib/types';
import { dataCache } from '@/components/DataCacheContext';
import {
  ChefHat,
  RefreshCw,
  Trophy,
  Calendar,
  AlertCircle,
  HelpCircle,
  Search,
} from 'lucide-react';

import { StudentCodeChefAnalytics } from '@/components/StudentCodeChefAnalytics';

export default function CodeChefContestsPage() {
  const { user, selectedClassroom } = useAuth();

  if (user?.role === 'student') {
    return <StudentCodeChefAnalytics user={user} />;
  }

  const cacheKey = `contests:codechef:${selectedClassroom?.id || 'all'}`;
  const uiKey = 'ui:codechef:contests';

  const [contests, setContests] = useState<Contest[]>(() => dataCache.get<Contest[]>(cacheKey) || []);
  const [loading, setLoading] = useState(() => !dataCache.get<Contest[]>(cacheKey));
  const [refreshing, setRefreshing] = useState(false);

  const savedUI = dataCache.getUI<{ activeTab: 'all' | 'upcoming' | 'completed'; searchQuery: string }>(uiKey);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed'>(savedUI?.activeTab || 'all');
  const [searchQuery, setSearchQuery] = useState(savedUI?.searchQuery || '');

  useEffect(() => {
    dataCache.setUI(uiKey, { activeTab, searchQuery });
  }, [activeTab, searchQuery]);

  const fetchContests = async (forceSync = false) => {
    if (forceSync) setRefreshing(true);
    else if (!dataCache.get(cacheKey)) setLoading(true);

    try {
      const classroomParam = selectedClassroom ? `&classroomId=${selectedClassroom.id}` : '';
      const syncParam = forceSync ? '&sync=true' : '';
      const res = await fetch(`/api/contests?platform=codechef${classroomParam}${syncParam}`);
      if (res.ok) {
        const json = await res.json();
        const loaded = json.contests || [];
        setContests(loaded);
        dataCache.set(cacheKey, loaded);
      }
    } catch (err) {
      console.error('Failed to load CodeChef contests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const cached = dataCache.get<Contest[]>(cacheKey);
    if (cached) {
      setContests(cached);
      setLoading(false);
    } else {
      fetchContests();
    }
  }, [cacheKey]);

  const filteredContests = contests.filter((c) => {
    if (activeTab === 'upcoming' && c.status === 'completed') return false;
    if (activeTab === 'completed' && c.status !== 'completed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.contest_code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const upcomingAndLive = filteredContests.filter((c) => c.status !== 'completed');
  const completed = filteredContests.filter((c) => c.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">CodeChef Contest Analytics</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic contest schedules and verified student participation records from official CodeChef data.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => fetchContests(true)}
            disabled={refreshing}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-2 transition disabled:opacity-50"
            title="Refresh contest schedules"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Sync Schedules'}</span>
          </button>
        </div>
      </div>

      {/* Classroom Context Notice */}
      {selectedClassroom && (
        <div className="px-4 py-2.5 bg-orange-50/70 border border-orange-200/60 rounded-xl flex items-center justify-between text-xs text-orange-950">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Selected Classroom:</span>
            <span>{selectedClassroom.name} ({selectedClassroom.course} - Sec {selectedClassroom.section})</span>
          </div>
          <span className="text-[11px] text-orange-800 font-medium">Timezone: Asia/Kolkata</span>
        </div>
      )}

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'hover:text-slate-900'
            }`}
          >
            All Contests ({contests.length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'upcoming'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'hover:text-slate-900'
            }`}
          >
            Upcoming & Live ({contests.filter((c) => c.status !== 'completed').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'completed'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'hover:text-slate-900'
            }`}
          >
            Completed ({contests.filter((c) => c.status === 'completed').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search CodeChef contest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Content Area */}
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
          <h3 className="text-sm font-bold text-slate-800">No CodeChef Contests Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No contests matching "${searchQuery}". Clear your search query to see all contests.`
              : 'Click "Sync Schedules" above to fetch the latest official CodeChef Starters and rated challenges.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-lg hover:bg-orange-100 transition"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Upcoming & Live Contests */}
          {activeTab !== 'completed' && upcomingAndLive.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-orange-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Upcoming & Active Contests
                </h2>
                <span className="text-xs text-slate-400 font-medium">({upcomingAndLive.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {upcomingAndLive.map((c) => (
                  <ContestCard key={c.id} contest={c} href={`/codechef/${c.id}`} />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Recently Completed Contests */}
          {activeTab !== 'upcoming' && completed.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Completed Contests & Past Analytics
                </h2>
                <span className="text-xs text-slate-400 font-medium">({completed.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {completed.map((c) => (
                  <ContestCard key={c.id} contest={c} href={`/codechef/${c.id}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
