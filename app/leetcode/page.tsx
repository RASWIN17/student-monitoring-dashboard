'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { ContestCard } from '@/components/ContestCard';
import { ContestAnalyticsBanner } from '@/components/ContestAnalyticsBanner';
import { Contest } from '@/lib/types';
import { dataCache } from '@/components/DataCacheContext';
import {
  Trophy,
  Search,
  HelpCircle,
} from 'lucide-react';

import { StudentLeetCodeAnalytics } from '@/components/StudentLeetCodeAnalytics';

export default function LeetCodeContestsPage() {
  const { user, selectedClassroom } = useAuth();

  if (user?.role === 'student') {
    return <StudentLeetCodeAnalytics user={user} />;
  }

  const cacheKey = `contests:leetcode:${selectedClassroom?.id || 'all'}`;
  const uiKey = 'ui:leetcode:contests';

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
      const res = await fetch(`/api/contests?platform=leetcode${classroomParam}${syncParam}`);
      if (res.ok) {
        const json = await res.json();
        const loaded = json.contests || [];
        setContests(loaded);
        dataCache.set(cacheKey, loaded);
      }
    } catch (err) {
      console.error('Failed to load LeetCode contests:', err);
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

  // Sort Upcoming & Active contests in ascending chronological order (starting soonest first)
  const upcomingAndLive = filteredContests
    .filter((c) => c.status !== 'completed')
    .sort((a, b) => {
      const timeA = new Date(a.start_time).getTime();
      const timeB = new Date(b.start_time).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.title.localeCompare(b.title);
    });

  // Keep completed contests sorted descending (most recently completed first)
  const completed = filteredContests
    .filter((c) => c.status === 'completed')
    .sort((a, b) => {
      const timeA = new Date(a.start_time).getTime();
      const timeB = new Date(b.start_time).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return a.title.localeCompare(b.title);
    });

  const totalCount = contests.length;
  const upcomingAndLiveTotalCount = contests.filter((c) => c.status !== 'completed').length;
  const completedTotalCount = contests.filter((c) => c.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Page Banner matching Reference Image 1 */}
      <ContestAnalyticsBanner
        platform="leetcode"
        title="LeetCode Contest Analytics"
        refreshing={refreshing}
        onRefresh={() => fetchContests(true)}
      />

      {/* Contest Navigation and Search Container */}
      <div className="bg-white rounded-2xl border border-[#e1eaf5] p-2 sm:px-4 sm:py-2.5 shadow-[0_2px_12px_rgba(30,64,175,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-[#1769ff] text-white shadow-xs'
                : 'text-[#64748b] hover:text-[#0f1b35] hover:bg-slate-50 font-semibold'
            }`}
          >
            All Contests ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap ${
              activeTab === 'upcoming'
                ? 'bg-[#1769ff] text-white shadow-xs'
                : 'text-[#64748b] hover:text-[#0f1b35] hover:bg-slate-50 font-semibold'
            }`}
          >
            Upcoming & Live ({upcomingAndLiveTotalCount})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap ${
              activeTab === 'completed'
                ? 'bg-[#1769ff] text-white shadow-xs'
                : 'text-[#64748b] hover:text-[#0f1b35] hover:bg-slate-50 font-semibold'
            }`}
          >
            Completed ({completedTotalCount})
          </button>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search contest name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#e1eaf5] rounded-xl text-xs sm:text-sm text-slate-800 placeholder-[#94a3b8] focus:outline-none focus:border-[#1769ff] focus:ring-1 focus:ring-[#1769ff] transition-all"
          />
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[#e1eaf5] border-t-[3.5px] border-t-[#1769ff] p-6 space-y-4 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 bg-slate-200 rounded-lg w-32" />
                <div className="h-5 bg-slate-200 rounded-lg w-20" />
              </div>
              <div className="h-6 bg-slate-200 rounded-lg w-3/4" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-4 bg-slate-100 rounded w-1/3" />
              </div>
              <div className="border-t border-[#edf2f9] my-4" />
              <div className="h-7 bg-slate-100 rounded-lg w-44" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-4 bg-slate-100 rounded w-28" />
                <div className="h-4 bg-slate-200 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredContests.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-[#e1eaf5] p-8 shadow-xs">
          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No LeetCode Contests Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No contests matching "${searchQuery}". Clear your search query to see all contests.`
              : 'Click the sync button above to fetch the latest official LeetCode Weekly and Biweekly contests.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 px-3.5 py-1.5 bg-[#eef4ff] text-[#1769ff] text-xs font-semibold rounded-xl hover:bg-blue-100 transition"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Upcoming & Active Contests (2-column desktop grid matching Reference Image 1) */}
          {activeTab !== 'completed' && upcomingAndLive.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-[#1769ff]" />
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#0f1b35]">
                  UPCOMING & ACTIVE CONTESTS ({upcomingAndLive.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingAndLive.map((c) => (
                  <ContestCard key={c.id} contest={c} href={`/leetcode/${c.id}`} />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Completed Contests (2-column desktop grid) */}
          {activeTab !== 'upcoming' && completed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-[#1769ff]" />
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#0f1b35]">
                  COMPLETED CONTESTS ({completed.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {completed.map((c) => (
                  <ContestCard key={c.id} contest={c} href={`/leetcode/${c.id}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
