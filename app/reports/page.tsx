'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import {
  FileSpreadsheet,
  Download,
  Users,
  Code,
  Trophy,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function ReportsPage() {
  const { selectedClassroom, classrooms, user } = useAuth();
  const [downloading, setDownloading] = useState<string | null>(null);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const handleDownload = async (type: 'overview' | 'leetcode' | 'codechef') => {
    if (!selectedClassroom || !isTeacher) return;
    setDownloading(type);
    try {
      window.location.href = `/api/export?classroomId=${selectedClassroom.id}&type=${type}`;
    } catch {}
    setTimeout(() => setDownloading(null), 1500);
  };

  if (user && !isTeacher) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-red-200 p-8 text-center shadow-xs">
        <div className="h-12 w-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Institutional CSV exports and grade reports are restricted to verified faculty members.
        </p>
        <a
          href="/classrooms"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
        >
          Go to Classrooms
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7 w-full">
      {/* Page Heading */}
      <div className="flex items-center gap-3.5 sm:gap-4">
        <div className="w-12 h-12 rounded-[14px] bg-[#E6F8F0] border border-[#C6F1DD]/80 flex items-center justify-center shrink-0 shadow-2xs">
          <FileSpreadsheet className="w-6 h-6 text-[#059669] stroke-[2]" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Reports &amp; Verified CSV Export
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Generate sanitized, audit-logged CSV spreadsheets for classroom reporting and grading.
          </p>
        </div>
      </div>

      {!selectedClassroom ? (
        <div className="p-8 sm:p-10 bg-white rounded-2xl border border-amber-200/80 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Please Select a Classroom</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Choose a classroom from the top navigation bar to export verified analytics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {/* Card 1: Classroom Student Overview */}
          <div className="bg-white rounded-2xl border border-[#DCE7F9] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] group">
            {/* Soft tinted top-right decorative accent */}
            <div
              className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-[#EFF5FF] pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10">
              {/* Icon Container */}
              <div className="w-12 h-12 rounded-[14px] bg-[#EEF4FF] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-[#2563EB] stroke-[2]" />
              </div>

              {/* Title & Description */}
              <h3 className="text-slate-900 font-bold text-[17px] sm:text-lg tracking-tight mt-5">
                Classroom Student Overview
              </h3>
              <p className="text-slate-500 text-xs sm:text-[13px] leading-relaxed mt-2.5">
                Complete roster with connected LeetCode and CodeChef usernames, total problems solved, ratings, and current activity status.
              </p>
            </div>

            {/* Action Button */}
            <div className="mt-7 pt-2 relative z-10">
              <button
                onClick={() => handleDownload('overview')}
                disabled={downloading !== null}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white rounded-xl text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-2 transition duration-150 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-[0_2px_8px_rgba(37,99,235,0.22)] cursor-pointer"
              >
                {downloading === 'overview' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 shrink-0 stroke-[2.2]" />
                    <span>Export Overview CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: LeetCode Full Statistics */}
          <div className="bg-white rounded-2xl border border-[#FDE5C5] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] group">
            {/* Soft tinted top-right decorative accent */}
            <div
              className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-[#FFF7ED] pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10">
              {/* Icon Container */}
              <div className="w-12 h-12 rounded-[14px] bg-[#FFF5EA] flex items-center justify-center shrink-0">
                <div className="w-6 h-6 rounded-[7px] bg-[#111827] flex items-center justify-center shadow-2xs">
                  <Code className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-slate-900 font-bold text-[17px] sm:text-lg tracking-tight mt-5">
                LeetCode Full Statistics
              </h3>
              <p className="text-slate-500 text-xs sm:text-[13px] leading-relaxed mt-2.5">
                Detailed difficulty breakdown (Easy, Medium, Hard), total submissions, acceptance rate, contest ratings, and global rankings.
              </p>
            </div>

            {/* Action Button */}
            <div className="mt-7 pt-2 relative z-10">
              <button
                onClick={() => handleDownload('leetcode')}
                disabled={downloading !== null}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#E98D1D] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white rounded-xl text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-2 transition duration-150 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-[0_2px_8px_rgba(233,141,29,0.22)] cursor-pointer"
              >
                {downloading === 'leetcode' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 shrink-0 stroke-[2.2]" />
                    <span>Export LeetCode CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 3: CodeChef Full Statistics */}
          <div className="bg-white rounded-2xl border border-[#FDD5CD] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] group">
            {/* Soft tinted top-right decorative accent */}
            <div
              className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-[#FFF1EE] pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10">
              {/* Icon Container */}
              <div className="w-12 h-12 rounded-[14px] bg-[#FFF0ED] flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-[#EA580C] stroke-[2]" />
              </div>

              {/* Title & Description */}
              <h3 className="text-slate-900 font-bold text-[17px] sm:text-lg tracking-tight mt-5">
                CodeChef Full Statistics
              </h3>
              <p className="text-slate-500 text-xs sm:text-[13px] leading-relaxed mt-2.5">
                Current rating, highest rating, total problems solved, global rank, country rank, and contest attendance counts.
              </p>
            </div>

            {/* Action Button */}
            <div className="mt-7 pt-2 relative z-10">
              <button
                onClick={() => handleDownload('codechef')}
                disabled={downloading !== null}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#F95721] to-[#E03A0F] hover:from-[#E03A0F] hover:to-[#C22E06] text-white rounded-xl text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-2 transition duration-150 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-[0_2px_8px_rgba(249,87,33,0.22)] cursor-pointer"
              >
                {downloading === 'codechef' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 shrink-0 stroke-[2.2]" />
                    <span>Export CodeChef CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Security Notice */}
      <div className="p-5 sm:p-6 bg-[#EAF8F0] border border-[#A7F3D0]/80 rounded-2xl relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        {/* Abstract subtle mint-green decorative shapes on the right */}
        <svg
          className="absolute right-0 top-0 bottom-0 h-full w-64 sm:w-80 pointer-events-none"
          viewBox="0 0 320 96"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M110 0C170 30 215 75 320 96V0H110Z"
            fill="#A7F3D0"
            fillOpacity="0.25"
          />
          <path
            d="M190 0C235 25 265 65 320 80V0H190Z"
            fill="#6EE7B7"
            fillOpacity="0.2"
          />
        </svg>

        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-[14px] bg-[#D1FAE5] border border-[#A7F3D0]/50 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#059669] stroke-[2]" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm tracking-tight">
              CSV Security &amp; Integrity Guarantee:
            </h4>
            <p className="text-xs sm:text-[13px] text-slate-600 mt-0.5 leading-relaxed">
              All exported CSV rows undergo automatic CSV Formula Injection sanitization. Missing metrics are left as explicit empty cells rather than deceptive zero values.
            </p>
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
              Every export event is recorded in the immutable audit log.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
