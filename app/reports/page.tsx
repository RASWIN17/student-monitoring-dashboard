'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import {
  FileSpreadsheet,
  Download,
  Code2,
  ChefHat,
  Users,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export default function ReportsPage() {
  const { selectedClassroom, classrooms } = useAuth();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (type: 'overview' | 'leetcode' | 'codechef') => {
    if (!selectedClassroom) return;
    setDownloading(type);
    try {
      window.location.href = `/api/export?classroomId=${selectedClassroom.id}&type=${type}`;
    } catch {}
    setTimeout(() => setDownloading(null), 1500);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <span>Reports & Verified CSV Export</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate sanitized, audit-logged CSV spreadsheets for classroom reporting and grading.
        </p>
      </div>

      {!selectedClassroom ? (
        <div className="p-8 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">Please Select a Classroom</h3>
          <p className="text-xs text-slate-400 mt-1">
            Choose a classroom from the top navigation bar to export verified analytics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Overview */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg w-fit mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Classroom Student Overview</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Complete roster with connected LeetCode and CodeChef usernames, total problems solved, ratings, and current activity status.
              </p>
            </div>
            <button
              onClick={() => handleDownload('overview')}
              disabled={downloading !== null}
              className="mt-6 w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>{downloading === 'overview' ? 'Exporting...' : 'Export Overview CSV'}</span>
            </button>
          </div>

          {/* Card 2: LeetCode */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg w-fit mb-3">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">LeetCode Full Statistics</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Detailed difficulty breakdown (Easy, Medium, Hard), total submissions, acceptance rate, contest ratings, and global rankings.
              </p>
            </div>
            <button
              onClick={() => handleDownload('leetcode')}
              disabled={downloading !== null}
              className="mt-6 w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>{downloading === 'leetcode' ? 'Exporting...' : 'Export LeetCode CSV'}</span>
            </button>
          </div>

          {/* Card 3: CodeChef */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg w-fit mb-3">
                <ChefHat className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">CodeChef Full Statistics</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Current rating, highest rating, total problems solved, global rank, country rank, and contest attendance counts.
              </p>
            </div>
            <button
              onClick={() => handleDownload('codechef')}
              disabled={downloading !== null}
              className="mt-6 w-full py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>{downloading === 'codechef' ? 'Exporting...' : 'Export CodeChef CSV'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Security & Provenance Banner */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800">CSV Security & Integrity Guarantee:</span>
          <p className="mt-0.5">
            All exported CSV rows undergo automatic CSV Formula Injection sanitization. Missing metrics are left as explicit empty cells rather than deceptive zero values. Every export event is recorded in the immutable audit log.
          </p>
        </div>
      </div>
    </div>
  );
}
