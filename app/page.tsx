'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import {
  Users,
  GraduationCap,
  Code2,
  ChefHat,
  Trophy,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  BarChart3,
  Sparkles,
} from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'teacher' || user.role === 'admin') {
        router.replace('/teacher/dashboard');
      } else {
        router.replace('/student/dashboard');
      }
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Checking authentication status...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-10">
      {/* Hero Welcome */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-Time Coding Activity Monitoring</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Welcome to CodeTrack
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          Monitor real-world problem-solving progress and contest ratings on LeetCode and CodeChef with verified, automated classroom reporting.
        </p>
      </div>

      {/* Role Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {/* Teacher Entry Card */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 flex flex-col justify-between hover:border-blue-500 hover:shadow-md transition">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">For Teachers & Faculty</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Create classroom sections, distribute secure join codes, run automated web scrapes, and export CSV audit reports for grading.
            </p>
          </div>

          <div className="pt-6">
            <Link
              href="/login?role=teacher"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition shadow-xs"
            >
              <span>Sign In as Teacher</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Student Entry Card */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 flex flex-col justify-between hover:border-blue-500 hover:shadow-md transition">
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Code2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">For Students</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Link your public LeetCode and CodeChef handles, join your instructor&apos;s classrooms, and view your daily submission streaks.
            </p>
          </div>

          <div className="pt-6">
            <Link
              href="/login?role=student"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition shadow-xs"
            >
              <span>Sign In as Student</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg w-fit mb-2">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-900">Zero Fake Data</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Only verified platform metrics and true database observations are displayed.
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg w-fit mb-2">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-900">Asia/Kolkata Alignment</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Strict timezone calendar mapping prevents date boundary errors across daily submissions.
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg w-fit mb-2">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-900">Role-Based Security</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Teacher-only administrative endpoints and classroom join codes protect institutional records.
          </div>
        </div>
      </div>
    </div>
  );
}
