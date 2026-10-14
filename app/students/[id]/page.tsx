'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { ScanModal } from '@/components/ScanModal';
import { dataCache } from '@/components/DataCacheContext';
import {
  Users,
  Code2,
  ChefHat,
  Trophy,
  Calendar,
  ExternalLink,
  RefreshCw,
  Play,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params?.id as string;
  const { user } = useAuth();
  const cacheKey = studentId ? `student:profile:${studentId}` : null;
  const [data, setData] = useState<any>(() => cacheKey ? dataCache.get(cacheKey) : null);
  const [loading, setLoading] = useState(() => cacheKey ? !dataCache.get(cacheKey) : true);
  const [isScanOpen, setIsScanOpen] = useState(false);

  const fetchStudentData = async (force = false) => {
    if (!force && cacheKey && dataCache.get(cacheKey)) return;
    if (!cacheKey || !dataCache.get(cacheKey)) setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (cacheKey) dataCache.set(cacheKey, json);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (studentId && cacheKey) {
      const cached = dataCache.get(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
      } else {
        fetchStudentData();
      }
    }
  }, [studentId, cacheKey]);

  if (loading || !data) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        <span className="text-xs font-semibold">Loading verified student metrics...</span>
      </div>
    );
  }

  const { student, classrooms, leetcode, codechef } = data;
  const lcSnap = leetcode?.snapshot;
  const ccSnap = codechef?.snapshot;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back button & top bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students Roster</span>
        </Link>

        {user?.role === 'teacher' && (
          <button
            onClick={() => setIsScanOpen(true)}
            className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 transition shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Scan This Student</span>
          </button>
        )}
      </div>

      {/* Student Identity Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xl">
              {student.display_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{student.display_name}</h1>
              <div className="text-xs text-slate-500 font-mono mt-0.5">{student.email}</div>
              <div className="flex items-center gap-2 mt-2">
                {classrooms?.map((c: any) => (
                  <span
                    key={c.id}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    {c.name} ({c.course})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 text-xs">
            {/* LeetCode Account Status */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[10px] uppercase font-bold text-slate-400">LeetCode Profile</div>
              {leetcode?.account ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-slate-800">{leetcode.account.username}</span>
                  <a
                    href={leetcode.account.public_profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-blue-600"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="text-slate-400 italic mt-0.5">Not connected</div>
              )}
            </div>

            {/* CodeChef Account Status */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[10px] uppercase font-bold text-slate-400">CodeChef Profile</div>
              {codechef?.account ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-slate-800">{codechef.account.username}</span>
                  <a
                    href={codechef.account.public_profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-blue-600"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="text-slate-400 italic mt-0.5">Not connected</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LeetCode Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">LeetCode Verified Performance</h2>
              <p className="text-xs text-slate-400">
                {lcSnap ? `Source: ${lcSnap.source} • Synced: ${new Date(lcSnap.observed_at).toLocaleString()}` : 'No LeetCode snapshot available'}
              </p>
            </div>
          </div>
        </div>

        {!lcSnap ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            No verified LeetCode data available for this student. Click &quot;Scan This Student&quot; to fetch stats.
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-semibold uppercase">Total Solved</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{lcSnap.total_solved}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Easy: {lcSnap.easy_solved || 0} • Med: {lcSnap.medium_solved || 0} • Hard: {lcSnap.hard_solved || 0}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-semibold uppercase">Contest Rating</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {lcSnap.contest_rating ? Math.round(lcSnap.contest_rating) : 'Unrated'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Attended: {lcSnap.contests_attended || 0} contests
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-semibold uppercase">Global Ranking</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {lcSnap.global_rank ? `#${lcSnap.global_rank.toLocaleString()}` : 'N/A'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Normal profile ranking</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-semibold uppercase">Acceptance Rate</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {lcSnap.acceptance_rate ? `${lcSnap.acceptance_rate}%` : 'N/A'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {lcSnap.accepted_submissions || 0} / {lcSnap.total_submissions || 0} submissions
                </div>
              </div>
            </div>

            {/* Contest History Table */}
            {leetcode.contests && leetcode.contests.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Recent Verified Contest History
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Contest Title</th>
                        <th className="py-2.5 px-3 text-center">Rank</th>
                        <th className="py-2.5 px-3 text-center">Solved</th>
                        <th className="py-2.5 px-3 text-center">Rating</th>
                        <th className="py-2.5 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leetcode.contests.map((c: any) => (
                        <tr key={c.id}>
                          <td className="py-2 px-3 font-medium text-slate-800">{c.contest_name}</td>
                          <td className="py-2 px-3 text-center font-mono">{c.rank ? `#${c.rank}` : '—'}</td>
                          <td className="py-2 px-3 text-center">
                            {c.problems_solved !== null ? `${c.problems_solved} / ${c.total_problems || 4}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800">
                            {c.rating_after ? Math.round(c.rating_after) : '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-500">
                            {new Date(c.contest_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CodeChef Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">CodeChef Verified Performance</h2>
              <p className="text-xs text-slate-400">
                {ccSnap ? `Source: ${ccSnap.source} • Synced: ${new Date(ccSnap.observed_at).toLocaleString()}` : 'No CodeChef snapshot available'}
              </p>
            </div>
          </div>
        </div>

        {!ccSnap ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            No verified CodeChef data available for this student. Click &quot;Scan This Student&quot; to fetch stats.
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-semibold uppercase">Current Rating</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {ccSnap.contest_rating ? Math.round(ccSnap.contest_rating) : 'Unrated'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Highest: {ccSnap.highest_rating ? Math.round(ccSnap.highest_rating) : '—'}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-semibold uppercase">Total Solved</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{ccSnap.total_solved}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Problems solved count</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-semibold uppercase">Global & Country Rank</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {ccSnap.global_rank ? `#${ccSnap.global_rank.toLocaleString()}` : 'Inactive'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Country: {ccSnap.country_rank ? `#${ccSnap.country_rank.toLocaleString()}` : 'Inactive'}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-semibold uppercase">Contests Attended</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{ccSnap.contests_attended || 0}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Total in retrieved history</div>
              </div>
            </div>

            {/* Contest History Table */}
            {codechef.contests && codechef.contests.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Recent Verified CodeChef Contests
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Contest Name</th>
                        <th className="py-2.5 px-3 text-center">Rank</th>
                        <th className="py-2.5 px-3 text-center">Rating</th>
                        <th className="py-2.5 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {codechef.contests.map((c: any) => (
                        <tr key={c.id}>
                          <td className="py-2 px-3 font-medium text-slate-800">{c.contest_name}</td>
                          <td className="py-2 px-3 text-center font-mono">{c.rank ? `#${c.rank}` : '—'}</td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800">
                            {c.rating_after ? Math.round(c.rating_after) : '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-500">
                            {new Date(c.contest_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Single Student Scan Modal */}
      <ScanModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onScanCompleted={() => {
          fetchStudentData(true);
          setIsScanOpen(false);
        }}
        targetStudentId={student.id}
        targetStudentName={student.display_name}
      />
    </div>
  );
}
