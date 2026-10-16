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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="mb-2">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Platform Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">
          Select a platform to view verified classroom solve counts, rankings, and leaderboards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl pt-2">
        {/* Card 1: LeetCode */}
        <Link
          href="/students/leetcode"
          className="group relative bg-white rounded-2xl border border-slate-200 p-7 flex flex-col justify-between hover:border-amber-400 transition-colors overflow-hidden"
        >
          {/* Flat top accent strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />

          <div className="space-y-5">
            {/* Header: Icon & Badge */}
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <LeetCodeIcon className="w-7 h-7" />
              </div>
              <span className="px-2.5 py-1 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
                DSA & Algorithms
              </span>
            </div>

            {/* Platform Name & Description */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-amber-700 transition-colors">
                LeetCode
              </h2>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Track algorithmic problem-solving metrics, difficulty breakdowns (Easy, Medium, Hard), official contest
                ratings, and global rankings for all enrolled students.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Easy, Medium & Hard problem categorizations</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified LeetCode contest rating & global ranks</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Classroom leaderboards with numeric sorting</span>
              </div>
            </div>
          </div>

          {/* Button CTA */}
          <div className="pt-6">
            <div className="w-full py-2.5 px-4 rounded-lg bg-slate-900 group-hover:bg-amber-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors">
              <span>Select Classroom for LeetCode</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Card 2: CodeChef */}
        <Link
          href="/students/codechef"
          className="group relative bg-white rounded-2xl border border-slate-200 p-7 flex flex-col justify-between hover:border-orange-400 transition-colors overflow-hidden"
        >
          {/* Flat top accent strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-orange-600" />

          <div className="space-y-5">
            {/* Header: Icon & Badge */}
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <CodeChefIcon className="w-7 h-7" />
              </div>
              <span className="px-2.5 py-1 rounded text-[11px] font-medium bg-orange-50 text-orange-900 border border-orange-200">
                Competitive Contests
              </span>
            </div>

            {/* Platform Name & Description */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-orange-700 transition-colors">
                CodeChef
              </h2>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Monitor competitive programming contest ratings, star tiers (1 Star to 7 Stars), global & country ranks, and
                verified lifetime problem counts for every student.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Star tiers (1 Star to 7 Stars) & current contest rating</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Global rank, country rank & peak rating tracking</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified lifetime problems solved & attendance</span>
              </div>
            </div>
          </div>

          {/* Button CTA */}
          <div className="pt-6">
            <div className="w-full py-2.5 px-4 rounded-lg bg-slate-900 group-hover:bg-orange-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors">
              <span>Select Classroom for CodeChef</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
