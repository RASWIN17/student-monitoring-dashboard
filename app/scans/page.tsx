'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { dataCache } from '@/components/DataCacheContext';
import {
  History,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RotateCcw,
  HelpCircle,
} from 'lucide-react';

export default function ScansPage() {
  const { selectedClassroom, user } = useAuth();
  const cacheKey = `scans:history:${selectedClassroom?.id || 'all'}`;
  const [jobs, setJobs] = useState<any[]>(() => dataCache.get<any[]>(cacheKey) || []);
  const [loading, setLoading] = useState(() => !dataCache.get<any[]>(cacheKey));

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const fetchScanHistory = async (force = false) => {
    if (!isTeacher) return;
    if (!force && dataCache.get(cacheKey)) return;
    if (!dataCache.get(cacheKey)) setLoading(true);
    try {
      const url = selectedClassroom
        ? `/api/scan?classroomId=${selectedClassroom.id}`
        : '/api/scan';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const loaded = json.jobs || [];
        setJobs(loaded);
        dataCache.set(cacheKey, loaded);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (isTeacher) {
      const cached = dataCache.get<any[]>(cacheKey);
      if (cached) {
        setJobs(cached);
        setLoading(false);
      } else {
        fetchScanHistory();
      }
    }
  }, [cacheKey, isTeacher]);

  if (user && !isTeacher) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-xl border border-red-200 p-8 text-center shadow-xs">
        <div className="h-12 w-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-500 mb-6">
          Background scraping history is only accessible to verified teachers and administrators.
        </p>
        <a
          href="/student/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
        >
          Go to Student Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <span>Scan Jobs History</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of all classroom background scraping jobs, status outcomes, and account level error logs.
          </p>
        </div>

        <button
          onClick={() => fetchScanHistory(true)}
          className="p-2 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <span className="text-xs font-semibold">Loading scan history...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <div className="text-sm font-semibold text-slate-700">No scans performed yet</div>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Initiate your first scan by clicking &quot;Scan Now&quot; on the top navigation bar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Job ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Accounts Total</th>
                  <th className="py-3 px-4 text-center">Succeeded</th>
                  <th className="py-3 px-4 text-center">Failed</th>
                  <th className="py-3 px-4">Platforms</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4 text-right">Initiated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {job.id.substring(0, 8)}
                    </td>
                    <td className="py-3 px-4">
                      {job.status === 'succeeded' && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Succeeded
                        </span>
                      )}
                      {job.status === 'partial' && (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">
                          <AlertTriangle className="w-3 h-3" /> Partial
                        </span>
                      )}
                      {job.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-red-200">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                      {job.status === 'running' && (
                        <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-blue-200">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Running
                        </span>
                      )}
                      {job.status === 'queued' && (
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          <Clock className="w-3 h-3" /> Queued
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">{job.total_accounts}</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-semibold">{job.successful_accounts}</td>
                    <td className="py-3 px-4 text-center text-red-600 font-semibold">{job.failed_accounts}</td>
                    <td className="py-3 px-4 capitalize">{job.selected_platforms}</td>
                    <td className="py-3 px-4 capitalize">{job.requested_scope}</td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {new Date(job.created_at).toLocaleString()}
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
