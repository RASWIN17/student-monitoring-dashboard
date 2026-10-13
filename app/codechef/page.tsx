'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import {
  ChefHat,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  Trophy,
  Flame,
  Award,
} from 'lucide-react';

export default function CodeChefPage() {
  const { selectedClassroom } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCodeChefData = async () => {
    setLoading(true);
    try {
      const url = selectedClassroom
        ? `/api/analytics/codechef?classroomId=${selectedClassroom.id}`
        : '/api/analytics/codechef';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchCodeChefData();
  }, [selectedClassroom]);

  const students = data?.students || [];
  const aggs = data?.aggregates || {
    totalAccounts: 0,
    totalSolvedSum: 0,
    totalContestsSum: 0,
    averageRating: null,
    ratedUsersCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-orange-600" />
            <span>CodeChef Classroom Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified ratings, global rankings, and rated contest participations scraped from public CodeChef profiles.
          </p>
        </div>

        <button
          onClick={fetchCodeChefData}
          className="p-2 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Linked Accounts</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{aggs.totalAccounts}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Connected CodeChef handles</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Total Problems Solved</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{aggs.totalSolvedSum}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Verified across student profiles</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Average Current Rating</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {aggs.averageRating ? aggs.averageRating : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{aggs.ratedUsersCount} rated students</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Total Contests Attended</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{aggs.totalContestsSum}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">In retrieved contest history</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <span className="text-xs font-semibold">Loading CodeChef metrics...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <div className="text-sm font-semibold text-slate-700">No students with CodeChef connected</div>
            <p className="text-xs text-slate-400 mt-1">
              Students can link their public handle in their Settings tab.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4 text-center">Total Solved</th>
                  <th className="py-3 px-4 text-center">Current Rating</th>
                  <th className="py-3 px-4 text-center">Highest Rating</th>
                  <th className="py-3 px-4 text-center">Global Rank</th>
                  <th className="py-3 px-4 text-center">Country Rank</th>
                  <th className="py-3 px-4 text-center">Contests Attended</th>
                  <th className="py-3 px-4 text-right">Last Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.display_name}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-slate-800">
                        <span>{item.username}</span>
                        <a
                          href={item.public_profile_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-blue-600"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {item.total_solved !== null ? item.total_solved : '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono text-slate-900">
                      {item.contest_rating ? Math.round(item.contest_rating) : '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      {item.highest_rating ? Math.round(item.highest_rating) : '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      {item.global_rank ? `#${item.global_rank.toLocaleString()}` : 'Inactive'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      {item.country_rank ? `#${item.country_rank.toLocaleString()}` : 'Inactive'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {item.contests_attended !== null ? item.contests_attended : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                      {item.observed_at ? new Date(item.observed_at).toLocaleDateString() : 'Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
