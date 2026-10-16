'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { LeetCodeIcon, CodeChefIcon } from '@/components/PlatformIcons';
import {
  ArrowRight,
  AlertTriangle,
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
    <div className="max-w-6xl mx-auto space-y-8 pb-12 pt-6 sm:pt-10">
      {/* Two Platform Cards matching reference image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 sm:gap-8 max-w-4xl mx-auto items-stretch">
        {/* Card 1: LeetCode */}
        <Link
          href="/students/leetcode"
          className="group relative bg-white rounded-[24px] sm:rounded-[28px] border-[1.5px] border-[#fbb024] p-8 sm:p-9 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[280px] shadow-[0_8px_30px_rgba(245,158,11,0.06)] hover:shadow-[0_14px_40px_rgba(245,158,11,0.14)] hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
        >
          {/* Subtle background decoration: Top-left pastel shape */}
          <div className="absolute -top-10 -left-10 w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-[#fef5e1] pointer-events-none transition-transform duration-500 group-hover:scale-105" />

          {/* Subtle background decoration: Bottom-right soft radial glow */}
          <div className="absolute -bottom-14 -right-14 w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-gradient-to-tl from-[#fde8b0]/70 via-[#fef5e1]/30 to-transparent blur-xl pointer-events-none" />

          {/* Centered Title */}
          <h2 className="text-2xl sm:text-[28px] font-bold text-[#1e293b] tracking-tight text-center relative z-10 mb-4 sm:mb-5">
            LeetCode
          </h2>

          {/* Centered Logo in Black Squircle */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[22px] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.14)] flex items-center justify-center bg-black relative z-10 group-hover:scale-105 transition-transform duration-300">
            <LeetCodeIcon className="w-full h-full object-cover select-none pointer-events-none" />
          </div>

          {/* Circular Arrow Button at Bottom-Right */}
          <div className="absolute bottom-5 right-5 sm:bottom-6 sm:right-6 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#f59e0b] group-hover:bg-[#d97706] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(245,158,11,0.35)] transition-all duration-200 z-10 group-hover:scale-105">
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Card 2: CodeChef */}
        <Link
          href="/students/codechef"
          className="group relative bg-white rounded-[24px] sm:rounded-[28px] border-[1.5px] border-[#f97316] p-8 sm:p-9 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[280px] shadow-[0_8px_30px_rgba(249,115,22,0.06)] hover:shadow-[0_14px_40px_rgba(249,115,22,0.14)] hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
        >
          {/* Subtle background decoration: Top-left pastel shape */}
          <div className="absolute -top-10 -left-10 w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-[#ffede6] pointer-events-none transition-transform duration-500 group-hover:scale-105" />

          {/* Subtle background decoration: Bottom-right soft radial glow */}
          <div className="absolute -bottom-14 -right-14 w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-gradient-to-tl from-[#fed5c7]/70 via-[#ffede6]/30 to-transparent blur-xl pointer-events-none" />

          {/* Centered Title */}
          <h2 className="text-2xl sm:text-[28px] font-bold text-[#1e293b] tracking-tight text-center relative z-10 mb-4 sm:mb-5">
            CodeChef
          </h2>

          {/* Centered Logo */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center relative z-10 group-hover:scale-105 transition-transform duration-300">
            <CodeChefIcon className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.06)] select-none pointer-events-none" />
          </div>

          {/* Circular Arrow Button at Bottom-Right */}
          <div className="absolute bottom-5 right-5 sm:bottom-6 sm:right-6 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#f97316] group-hover:bg-[#ea580c] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(249,115,22,0.35)] transition-all duration-200 z-10 group-hover:scale-105">
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
