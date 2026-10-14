'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { LeetCodeIcon, CodeChefIcon } from '@/components/PlatformIcons';
import {
  Users,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Trophy,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Code2,
  ChefHat,
  CheckCircle2,
} from 'lucide-react';

export default function StudentsLandingPage() {
  const { user, classrooms } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // Compute total enrolled students across all teacher's classrooms
  useEffect(() => {
    let count = 0;
    for (const c of classrooms) {
      count += c.enrolled_count ?? 0;
    }
    setTotalStudents(count);
    setLoadingStats(false);
  }, [classrooms]);

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
          href="/student/dashboard"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
        >
          Go to Student Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Page Section Indicator */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-800">Students</span>
      </nav>

      {/* Hero Welcome Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/80">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Classroom Coding Platform Analytics</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Students Performance Section
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Select a coding platform below to inspect classroom-specific student records, verified problem counts,
          official contest ratings, and leaderboard standings.
        </p>
      </div>

      {/* Two Large, Attractive, Clickable Cards in Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-2">
        {/* Card 1: LeetCode */}
        <Link
          href="/students/leetcode"
          className="group relative bg-white rounded-3xl border-2 border-slate-200 p-8 flex flex-col justify-between hover:border-amber-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
        >
          {/* Subtle top brand color accent bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500" />

          {/* Background watermark icon */}
          <div className="absolute -bottom-6 -right-6 text-slate-100 group-hover:text-amber-50 transition-colors pointer-events-none opacity-40">
            <LeetCodeIcon className="w-48 h-48" />
          </div>

          <div className="relative z-10 space-y-5">
            {/* Header: Icon & Badge */}
            <div className="flex items-center justify-between">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:bg-amber-100 transition-all duration-300">
                <LeetCodeIcon className="w-9 h-9" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                DSA & Algorithms
              </span>
            </div>

            {/* Platform Name & Description */}
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-amber-700 transition">
                LeetCode
              </h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Track algorithmic problem-solving metrics, difficulty breakdowns (Easy, Medium, Hard), official contest
                ratings, and global rankings for all enrolled students.
              </p>
            </div>

            {/* Feature Highlights Pills */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Easy, Medium & Hard problem categorizations</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified LeetCode contest rating & global ranks</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Classroom leaderboards with numeric sorting</span>
              </div>
            </div>
          </div>

          {/* Button CTA */}
          <div className="relative z-10 pt-8">
            <div className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all">
              <span>Select Classroom for LeetCode</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Card 2: CodeChef */}
        <Link
          href="/students/codechef"
          className="group relative bg-white rounded-3xl border-2 border-slate-200 p-8 flex flex-col justify-between hover:border-orange-500 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
        >
          {/* Subtle top brand color accent bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-amber-600 to-yellow-600" />

          {/* Background watermark icon */}
          <div className="absolute -bottom-6 -right-6 text-slate-100 group-hover:text-orange-50 transition-colors pointer-events-none opacity-40">
            <CodeChefIcon className="w-48 h-48" />
          </div>

          <div className="relative z-10 space-y-5">
            {/* Header: Icon & Badge */}
            <div className="flex items-center justify-between">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200/80 flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:bg-orange-100 transition-all duration-300">
                <CodeChefIcon className="w-9 h-9" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-900 border border-orange-300">
                Competitive Contests
              </span>
            </div>

            {/* Platform Name & Description */}
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-orange-700 transition">
                CodeChef
              </h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Monitor competitive programming contest ratings, star tiers (1★ to 7★), global & country ranks, and
                verified lifetime problem counts for every student.
              </p>
            </div>

            {/* Feature Highlights Pills */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Star tiers (1★ to 7★) & current contest rating</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Global rank, country rank & peak rating tracking</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified lifetime problems solved & attendance</span>
              </div>
            </div>
          </div>

          {/* Button CTA */}
          <div className="relative z-10 pt-8">
            <div className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-700 hover:to-amber-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all">
              <span>Select Classroom for CodeChef</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Summary Row */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">{classrooms.length}</div>
                <div className="text-[11px] text-slate-500">Active Classrooms</div>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">{totalStudents}</div>
                <div className="text-[11px] text-slate-500">Total Enrolled Students</div>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden md:block" />

            <div className="hidden md:flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">2 Platforms</div>
                <div className="text-[11px] text-slate-500">LeetCode & CodeChef</div>
              </div>
            </div>
          </div>

          <Link
            href="/classrooms"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 hover:underline"
          >
            <span>Manage Classrooms</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
