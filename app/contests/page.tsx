'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import {
  Trophy,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
} from 'lucide-react';

export default function ContestsPage() {
  const { selectedClassroom } = useAuth();
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContests = async () => {
    setLoading(true);
    try {
      const url = selectedClassroom
        ? `/api/analytics/contests?classroomId=${selectedClassroom.id}`
        : '/api/analytics/contests';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setContests(json.contests || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchContests();
  }, [selectedClassroom]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-600" />
            <span>Contest Activity & Verification</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified platform contest attendances, ranks, and performance from retrieved profile histories.
          </p>
        </div>

        <button
          onClick={fetchContests}
          className="p-2 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
            <span className="text-xs font-semibold">Loading contest participation records...</span>
          </div>
        ) : contests.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <div className="text-sm font-semibold text-slate-700">No contest records available</div>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Contest histories are populated when students connect their profiles and a scan is executed. No demo contests are fabricated.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Contest Title</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Rank</th>
                  <th className="py-3 px-4 text-center">Problems Solved</th>
                  <th className="py-3 px-4 text-center">Rating</th>
                  <th className="py-3 px-4 text-right">Contest Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {contests.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.contest_name}</td>
                    <td className="py-3 px-4">
                      <span className={`capitalize font-semibold text-[10px] px-2 py-0.5 rounded border ${
                        c.platform === 'leetcode'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {c.platform}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{c.display_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">@{c.username}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Attended
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {c.rank ? `#${c.rank}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {c.problems_solved !== null ? `${c.problems_solved} / ${c.total_problems || 4}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                      {c.rating_after ? Math.round(c.rating_after) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {new Date(c.contest_date).toLocaleDateString()}
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
