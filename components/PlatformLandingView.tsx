'use client';

import React from 'react';
import Link from 'next/link';
import { LeetCodeIcon, CodeChefIcon } from '@/components/PlatformIcons';
import { BackButton } from '@/components/BackButton';

interface Props {
  platform: 'leetcode' | 'codechef';
}

function ContestTrophyIcon({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sparkles / Rays around cup */}
      {/* Top Left Sparkles */}
      <line x1="22" y1="30" x2="14" y2="26" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <line x1="24" y1="42" x2="15" y2="44" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      {/* Top Right Sparkles */}
      <line x1="78" y1="30" x2="86" y2="26" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <line x1="76" y1="42" x2="85" y2="44" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />

      {/* Left Handle */}
      <path
        d="M32 30 C19 30 18 48 33 52"
        stroke="#f59e0b"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right Handle */}
      <path
        d="M68 30 C81 30 82 48 67 52"
        stroke="#f59e0b"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Trophy Cup Body */}
      <path
        d="M28 22 H72 V38 C72 52 62 62 50 62 C38 62 28 52 28 38 V22 Z"
        fill="#f59e0b"
      />

      {/* Trophy Stem */}
      <path d="M45 62 H55 V74 H45 Z" fill="#f59e0b" />

      {/* Trophy Base */}
      <path
        d="M36 74 H64 C65.5 74 66 75 66 76 L68 83 H32 L34 76 C34 75 34.5 74 36 74 Z"
        fill="#f59e0b"
      />
      <rect x="29" y="81" width="42" height="4" rx="2" fill="#d97706" />

      {/* White Star in Cup */}
      <polygon
        points="50,33 53.09,40.18 60.85,40.73 54.95,45.82 56.82,53.42 50,49.2 43.18,53.42 45.05,45.82 39.15,40.73 46.91,40.18"
        fill="#ffffff"
      />
    </svg>
  );
}

function ProgressChartIcon({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bar 1 (Left - Shortest) */}
      <rect x="30" y="56" width="10" height="26" rx="4" fill="#a78bfa" />
      {/* Bar 2 (Middle - Medium) */}
      <rect x="46" y="44" width="10" height="38" rx="4" fill="#8b5cf6" />
      {/* Bar 3 (Right - Tallest) */}
      <rect x="62" y="32" width="10" height="50" rx="4" fill="#7c3aed" />

      {/* Curved Growth Arrow */}
      <path
        d="M24 68 C40 64 54 46 68 28"
        stroke="#4f46e5"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <path
        d="M57 26 H70 V39"
        stroke="#4f46e5"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlatformLandingView({ platform }: Props) {
  const isLeetCode = platform === 'leetcode';
  const platformDisplayName = isLeetCode ? 'LeetCode' : 'CodeChef';

  const contestUrl = isLeetCode ? '/leetcode' : '/codechef';
  const progressUrl = isLeetCode ? '/students/leetcode/progress' : '/students/codechef/progress';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-16">
      {/* 1. Back Button */}
      <div className="mb-8 sm:mb-10">
        <BackButton fallbackHref="/students" />
      </div>

      {/* 2. Platform Logo & Title (Centered) */}
      <div className="flex items-center justify-center gap-4 sm:gap-5 mb-12 sm:mb-16">
        {isLeetCode ? (
          <>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[22px] bg-black flex items-center justify-center p-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.18)] shrink-0">
              <LeetCodeIcon className="w-full h-full object-contain" />
            </div>
            <h1 className="text-4xl sm:text-[48px] font-black text-[#0f172a] tracking-tight">
              LeetCode
            </h1>
          </>
        ) : (
          <>
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
              <CodeChefIcon className="w-full h-full object-contain drop-shadow-xs" />
            </div>
            <h1 className="text-4xl sm:text-[48px] font-black text-[#0f172a] tracking-tight">
              CodeChef
            </h1>
          </>
        )}
      </div>

      {/* 3. Contest and Progress Cards (Side-by-Side) */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 max-w-3xl mx-auto">
        {/* Card 1: Contest */}
        <Link
          href={contestUrl}
          className="group relative w-full sm:w-[350px] min-h-[260px] sm:h-[280px] bg-gradient-to-b from-[#fffefc] via-[#fffdf7] to-[#fff9e6] rounded-[28px] border-[1.5px] border-[#fde68a] p-8 flex flex-col items-center justify-center shadow-[0_8px_28px_rgba(250,204,21,0.07)] hover:shadow-[0_16px_36px_rgba(250,204,21,0.16)] hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer select-none"
        >
          {/* Subtle bottom wavy layers */}
          <svg
            className="absolute bottom-0 left-0 right-0 w-full h-16 pointer-events-none"
            viewBox="0 0 320 64"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M0 38C60 22 130 52 200 36C250 24 290 40 320 32V64H0V38Z"
              fill="#fde68a"
              fillOpacity="0.45"
            />
            <path
              d="M0 48C70 34 150 56 230 42C280 32 305 46 320 40V64H0V48Z"
              fill="#fef08a"
              fillOpacity="0.55"
            />
          </svg>

          {/* Trophy Icon */}
          <div className="relative z-10 transition-transform duration-300 group-hover:scale-105">
            <ContestTrophyIcon className="w-20 h-20 sm:w-22 sm:h-22 drop-shadow-xs" />
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-[28px] font-black text-[#0f172a] mt-4 tracking-tight relative z-10">
            Contest
          </h2>
        </Link>

        {/* Card 2: Progress */}
        <Link
          href={progressUrl}
          className="group relative w-full sm:w-[350px] min-h-[260px] sm:h-[280px] bg-gradient-to-b from-[#fdfcff] via-[#faf7ff] to-[#f3ebff] rounded-[28px] border-[1.5px] border-[#e9d5ff] p-8 flex flex-col items-center justify-center shadow-[0_8px_28px_rgba(168,85,247,0.07)] hover:shadow-[0_16px_36px_rgba(168,85,247,0.16)] hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer select-none"
        >
          {/* Subtle bottom wavy layers */}
          <svg
            className="absolute bottom-0 left-0 right-0 w-full h-16 pointer-events-none"
            viewBox="0 0 320 64"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M0 38C60 22 130 52 200 36C250 24 290 40 320 32V64H0V38Z"
              fill="#ddd6fe"
              fillOpacity="0.5"
            />
            <path
              d="M0 48C70 34 150 56 230 42C280 32 305 46 320 40V64H0V48Z"
              fill="#ede9fe"
              fillOpacity="0.6"
            />
          </svg>

          {/* Progress Chart Icon */}
          <div className="relative z-10 transition-transform duration-300 group-hover:scale-105">
            <ProgressChartIcon className="w-20 h-20 sm:w-22 sm:h-22 drop-shadow-xs" />
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-[28px] font-black text-[#0f172a] mt-4 tracking-tight relative z-10">
            Progress
          </h2>
        </Link>
      </div>
    </div>
  );
}
