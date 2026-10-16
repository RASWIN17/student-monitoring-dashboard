'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { LeetCodeIcon, CodeChefIcon } from '@/components/PlatformIcons';
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export default function StudentsLandingPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  if (user && !isTeacher) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white rounded-2xl border border-red-200 p-8 text-center shadow-xs space-y-4">
        <div className="h-12 w-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The Students Platform Monitoring section is exclusively available to verified teachers and instructors.
        </p>
        <Link
          href="/classrooms"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
        >
          Go to Classrooms
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 pt-3">
      {/* Two Large, Attractive, Clickable Cards in Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
        {/* Card 1: LeetCode */}
        <Link
          href="/students/leetcode"
          className="group relative bg-gradient-to-br from-[#fffdfa] via-white to-[#fffcf5] rounded-3xl border border-amber-200/80 p-8 lg:p-9 flex flex-col justify-between shadow-[0_12px_36px_rgba(245,158,11,0.08)] hover:shadow-[0_18px_48px_rgba(245,158,11,0.16)] hover:border-amber-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
        >
          {/* Subtle top brand color accent bar */}
          <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500" />

          {/* Background watermark icon */}
          <div className="absolute -bottom-10 -right-10 pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity">
            <LeetCodeIcon className="w-60 h-60 text-amber-400" />
          </div>

          <div className="relative z-10 space-y-5">
            {/* Header: Icon & Title + Badge */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white border border-amber-200/80 flex items-center justify-center p-3 shadow-xs group-hover:scale-105 transition-transform duration-300 shrink-0">
                <LeetCodeIcon className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#0f1b35] tracking-tight group-hover:text-amber-600 transition">
                  LeetCode
                </h2>
                <span className="mt-1 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200/80 inline-block">
                  DSA & ALGORITHMS
                </span>
              </div>
            </div>

            {/* Platform Description */}
            <p className="text-xs text-[#4b5563] leading-relaxed">
              Track algorithmic problem-solving metrics, difficulty breakdowns (Easy, Medium, Hard), official contest
              ratings, and global rankings for all enrolled students.
            </p>

            {/* Feature Highlights */}
            <div className="space-y-3 pt-4 border-t border-amber-100/70">
              <div className="flex items-center gap-2.5 text-xs text-[#334155] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Easy, Medium & Hard problem categorizations</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#334155] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Verified LeetCode contest rating & global ranks</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#334155] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Classroom leaderboards with numeric sorting</span>
              </div>
            </div>
          </div>

          {/* Button CTA */}
          <div className="relative z-10 pt-8">
            <div className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#eab308] via-[#f59e0b] to-[#d97706] hover:brightness-105 text-white font-bold text-xs flex items-center justify-center gap-3 shadow-[0_6px_20px_rgba(245,158,11,0.35)] transition-all">
              <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center p-1 shrink-0 shadow-2xs">
                <LeetCodeIcon className="w-4 h-4" />
              </div>
              <span>Select Classroom for LeetCode</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Card 2: CodeChef */}
        <Link
          href="/students/codechef"
          className="group relative bg-gradient-to-br from-[#fffbfa] via-white to-[#fff8f5] rounded-3xl border border-orange-200/80 p-8 lg:p-9 flex flex-col justify-between shadow-[0_12px_36px_rgba(249,115,22,0.08)] hover:shadow-[0_18px_48px_rgba(249,115,22,0.16)] hover:border-orange-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
        >
          {/* Subtle top brand color accent bar */}
          <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-orange-500 via-amber-600 to-yellow-600" />

          {/* Background watermark icon */}
          <div className="absolute -bottom-10 -right-10 pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity">
            <CodeChefIcon className="w-60 h-60 text-orange-400" />
          </div>

          <div className="relative z-10 space-y-5">
            {/* Header: Icon & Title + Badge */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white border border-orange-200/80 flex items-center justify-center p-2.5 shadow-xs group-hover:scale-105 transition-transform duration-300 shrink-0">
                <CodeChefIcon className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#0f1b35] tracking-tight group-hover:text-orange-600 transition">
                  CodeChef
                </h2>
                <span className="mt-1 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-900 border border-orange-200/80 inline-block">
                  COMPETITIVE CONTESTS
                </span>
              </div>
            </div>

            {/* Platform Description */}
            <p className="text-xs text-[#4b5563] leading-relaxed">
              Monitor competitive programming contest ratings, star tiers (1★ to 7★), global & country ranks, and
              verified lifetime problem counts for every student.
            </p>

            {/* Feature Highlights */}
            <div className="space-y-3 pt-4 border-t border-orange-100/70">
              <div className="flex items-center gap-2.5 text-xs text-[#334155] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Star tiers (1★ to 7★) & current contest rating</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#334155] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Global rank, country rank & peak rating tracking</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#334155] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Verified lifetime problems solved & attendance</span>
              </div>
            </div>
          </div>

          {/* Button CTA */}
          <div className="relative z-10 pt-8">
            <div className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-3 shadow-[0_6px_20px_rgba(249,115,22,0.35)] transition-all">
              <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
                <CodeChefIcon className="w-4 h-4" />
              </div>
              <span>Select Classroom for CodeChef</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
