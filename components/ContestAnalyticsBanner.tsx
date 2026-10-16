'use client';

import React from 'react';

interface ContestAnalyticsBannerProps {
  platform: 'leetcode' | 'codechef';
  title: string;
}

export function ContestBannerIllustration({ platform }: { platform: 'leetcode' | 'codechef' }) {
  return (
    <div className="relative w-52 h-20 hidden md:flex items-center justify-end select-none pointer-events-none">
      {/* Background Soft Glow */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-40 h-20 bg-blue-200/40 rounded-full blur-lg pointer-events-none" />

      <svg
        viewBox="0 0 280 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs overflow-visible"
      >
        <defs>
          <linearGradient id="laptopScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="laptopBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
          <linearGradient id="barGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#bfdbfe" />
          </linearGradient>
          <linearGradient id="barGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>
          <linearGradient id="barGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <linearGradient id="barGrad4" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        {/* Sparkle Stars */}
        <path
          d="M 68 32 Q 68 38 62 38 Q 68 38 68 44 Q 68 38 74 38 Q 68 38 68 32 Z"
          fill="#93c5fd"
        />
        <path
          d="M 264 42 Q 264 47 259 47 Q 264 47 264 52 Q 264 47 269 47 Q 264 47 264 42 Z"
          fill="#60a5fa"
        />
        <path
          d="M 172 16 Q 172 19 169 19 Q 172 19 172 22 Q 172 19 175 19 Q 172 19 172 16 Z"
          fill="#bfdbfe"
        />

        {/* Small Floating Pill on Left of Laptop */}
        <g transform="translate(85, 20)">
          <rect width="38" height="15" rx="7.5" fill="#ffffff" fillOpacity="0.9" stroke="#bfdbfe" strokeWidth="1" />
          <text x="19" y="10.5" textAnchor="middle" fill="#3b82f6" fontSize="7.5" fontWeight="bold" fontFamily="system-ui">
            {platform === 'leetcode' ? 'LeetCode' : 'CodeChef'}
          </text>
        </g>

        {/* Laptop Shadow */}
        <ellipse cx="138" cy="102" rx="55" ry="6" fill="#1e3a8a" fillOpacity="0.12" />

        {/* Laptop Screen */}
        <g transform="translate(98, 22)">
          <rect x="0" y="0" width="76" height="52" rx="4" fill="#1d4ed8" />
          <rect x="3" y="3" width="70" height="46" rx="2" fill="url(#laptopScreenGrad)" />
          <text
            x="38"
            y="31"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="18"
            fontWeight="bold"
            fontFamily="monospace"
            letterSpacing="-1"
          >
            &lt;/&gt;
          </text>
        </g>

        {/* Laptop Base / Keyboard */}
        <path
          d="M 88 74 L 184 74 L 196 94 L 76 94 Z"
          fill="url(#laptopBaseGrad)"
        />
        <rect x="122" y="83" width="28" height="6" rx="2" fill="#1d4ed8" fillOpacity="0.4" />
        <path
          d="M 76 94 L 196 94 L 193 98 L 79 98 Z"
          fill="#1e3a8a"
        />

        {/* Analytics 4-Bar Chart */}
        <rect x="198" y="70" width="8.5" height="24" rx="3.5" fill="url(#barGrad1)" />
        <rect x="211" y="56" width="8.5" height="38" rx="3.5" fill="url(#barGrad2)" />
        <rect x="224" y="40" width="8.5" height="54" rx="3.5" fill="url(#barGrad3)" />
        <rect x="237" y="22" width="8.5" height="72" rx="3.5" fill="url(#barGrad4)" />

        {/* Upward Trending Curved Arrow */}
        <path
          d="M 194 62 C 205 48, 222 32, 246 18"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 238 16 L 247 17 L 245 26"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Floating Percentage Tag */}
        <g transform="translate(225, 3)">
          <rect width="36" height="15" rx="7.5" fill="#ffffff" fillOpacity="0.9" stroke="#93c5fd" strokeWidth="1" />
          <text x="18" y="10.5" textAnchor="middle" fill="#1d4ed8" fontSize="7.5" fontWeight="bold" fontFamily="system-ui">
            📈 +24%
          </text>
        </g>
      </svg>
    </div>
  );
}

export function ContestAnalyticsBanner({
  platform,
  title,
}: ContestAnalyticsBannerProps) {
  return (
    <div className="rounded-2xl border border-[#dce8f6] bg-gradient-to-r from-[#edf4fc] via-[#f2f7fd] to-[#e4eefb] shadow-xs py-3.5 px-5 sm:py-4 sm:px-7 flex items-center justify-between relative overflow-hidden">
      {/* Left side: Logo Box + Heading (No refresh/loading icon) */}
      <div className="flex items-center gap-3.5 sm:gap-4 z-10">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-slate-100/90 shadow-[0_4px_16px_rgba(30,64,175,0.06)] flex items-center justify-center p-2.5 sm:p-3 shrink-0">
          {platform === 'leetcode' ? (
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 sm:w-8 sm:h-8">
              <path
                d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 4.792 3.635 6.002 6.002 0 0 0 2.457-.184 5.922 5.922 0 0 0 2.158-1.144l4.24-4.24a1.374 1.374 0 1 0-1.943-1.944l-4.24 4.24a3.175 3.175 0 0 1-1.156.612 3.255 3.255 0 0 1-1.334.1 3.208 3.208 0 0 1-2.585-1.961 2.977 2.977 0 0 1-.189-.55 2.984 2.984 0 0 1-.033-1.275 2.844 2.844 0 0 1 .653-1.137l3.854-4.126 5.406-5.788A1.374 1.374 0 0 0 13.483 0z"
                fill="#262626"
              />
              <path
                d="M9.832 10.903a1.4 1.4 0 0 0-.99.41l-2.073 2.073a1.4 1.4 0 1 0 1.98 1.98l2.073-2.073a1.4 1.4 0 0 0-.99-2.39z"
                fill="#FFA116"
              />
              <path
                d="M20.311 17.09a1.374 1.374 0 0 0-1.374-1.374h-8.032a1.374 1.374 0 1 0 0 2.748h8.032a1.374 1.374 0 0 0 1.374-1.374z"
                fill="#262626"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 48 48" fill="none" className="w-8 h-8 sm:w-9 sm:h-9">
              <path
                d="M12 28 C9.5 28 7 26 7 22.5 C7 19.5 9 17.5 12 17.5 C12 17 12.1 16.5 12.3 16 C13.5 11.5 17.5 8 22.5 8 C27.5 8 31.5 11.5 32.7 16 C32.9 16.5 33 17 33 17.5 C36 17.5 38 19.5 38 22.5 C38 26 35.5 28 33 28"
                stroke="#f97316"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M13 28 L14 36 L31 36 L32 28"
                stroke="#f97316"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <rect
                x="11"
                y="36"
                width="23"
                height="5"
                rx="2.5"
                stroke="#f97316"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          )}
        </div>
        <h1 className="text-lg sm:text-xl lg:text-[22px] font-extrabold text-[#0f1b35] tracking-tight">
          {title}
        </h1>
      </div>

      {/* Right side: Coding Illustration */}
      <ContestBannerIllustration platform={platform} />
    </div>
  );
}
