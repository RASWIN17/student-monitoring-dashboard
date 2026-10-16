'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Contest } from '@/lib/types';

interface ContestCardProps {
  contest: Contest;
  href: string;
}

export type ContestThemeType = 'weekly' | 'biweekly' | 'placement_prep' | 'monday_munch' | 'starters';

export function getContestTheme(contest: Contest): ContestThemeType {
  const code = (contest.contest_code || contest.id || '').toLowerCase();
  const title = (contest.title || '').toLowerCase();

  if (contest.platform === 'leetcode') {
    if (code.includes('biweekly') || title.includes('biweekly')) {
      return 'biweekly';
    }
    return 'weekly';
  }

  // CodeChef contests
  if (code.includes('prep') || title.includes('placement prep') || title.includes('prep')) {
    return 'placement_prep';
  }
  if (
    code.includes('monday') ||
    code.includes('dsa') ||
    title.includes('monday') ||
    title.includes('dsa challenge')
  ) {
    return 'monday_munch';
  }
  if (code.includes('start') || title.includes('starter')) {
    return 'starters';
  }

  return 'starters';
}

/* -------------------------------------------------------------
 * 1. Weekly Contest Illustration: Blue Calendar with Clock Badge
 * ------------------------------------------------------------- */
function WeeklyIllustration() {
  return (
    <div className="relative w-20 h-16 sm:w-24 sm:h-20 flex items-center justify-center shrink-0 pointer-events-none select-none">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-200/50 to-blue-300/30 rounded-full blur-xs" />
      <svg className="absolute -top-1 right-2 w-3.5 h-3.5 text-blue-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z" />
      </svg>
      <svg className="absolute bottom-2 -left-1 w-2.5 h-2.5 text-blue-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z" />
      </svg>
      <svg className="relative w-14 h-14 sm:w-16 sm:h-16 drop-shadow-sm" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="12" width="44" height="42" rx="8" fill="#ffffff" stroke="#3b82f6" strokeWidth="2.5" />
        <path d="M8 20C8 15.5817 11.5817 12 16 12H44C48.4183 12 52 15.5817 52 20V24H8V20Z" fill="#3b82f6" />
        <rect x="16" y="8" width="4" height="8" rx="2" fill="#1d4ed8" />
        <rect x="40" y="8" width="4" height="8" rx="2" fill="#1d4ed8" />
        <rect x="14" y="30" width="5" height="5" rx="1.5" fill="#93c5fd" />
        <rect x="23" y="30" width="5" height="5" rx="1.5" fill="#93c5fd" />
        <rect x="32" y="30" width="5" height="5" rx="1.5" fill="#93c5fd" />
        <rect x="14" y="39" width="5" height="5" rx="1.5" fill="#93c5fd" />
        <rect x="23" y="39" width="5" height="5" rx="1.5" fill="#93c5fd" />
        <circle cx="44" cy="44" r="12" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />
        <path d="M44 38V44L48 46" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------
 * 2. Biweekly Contest Illustration: Purple Trophy with Star
 * ------------------------------------------------------------- */
function BiweeklyIllustration() {
  return (
    <div className="relative w-20 h-16 sm:w-24 sm:h-20 flex items-center justify-center shrink-0 pointer-events-none select-none">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-200/50 to-purple-300/30 rounded-full blur-xs" />
      <svg className="absolute -top-1 right-2 w-3.5 h-3.5 text-purple-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z" />
      </svg>
      <svg className="absolute bottom-2 -left-1 w-2.5 h-2.5 text-purple-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z" />
      </svg>
      <svg className="relative w-14 h-14 sm:w-16 sm:h-16 drop-shadow-sm" viewBox="0 0 64 64" fill="none">
        <rect x="22" y="52" width="20" height="4" rx="2" fill="#7e22ce" />
        <path d="M28 46H36V52H28V46Z" fill="#9333ea" />
        <path d="M18 20C12 20 12 32 18 34" stroke="#9333ea" strokeWidth="3" strokeLinecap="round" />
        <path d="M46 20C52 20 52 32 46 34" stroke="#9333ea" strokeWidth="3" strokeLinecap="round" />
        <path d="M18 16H46V28C46 36 39 42 32 42C25 42 18 36 18 28V16Z" fill="#a855f7" />
        <path d="M32 22L33.8 26.5L38.5 26.8L34.8 29.8L36 34.5L32 31.8L28 34.5L29.2 29.8L25.5 26.8L30.2 26.5L32 22Z" fill="#ffffff" />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------
 * 3. Placement Prep Illustration: Orange Calendar with Grad Cap Badge
 * ------------------------------------------------------------- */
function PlacementPrepIllustration() {
  return (
    <div className="relative w-20 h-16 sm:w-24 sm:h-20 flex items-center justify-center shrink-0 pointer-events-none select-none">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-200/50 to-orange-300/30 rounded-full blur-xs" />
      <svg className="absolute -top-1 right-2 w-3.5 h-3.5 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z" />
      </svg>
      <svg className="absolute bottom-2 -left-1 w-2.5 h-2.5 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z" />
      </svg>
      <svg className="relative w-14 h-14 sm:w-16 sm:h-16 drop-shadow-sm" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="12" width="44" height="42" rx="8" fill="#ffffff" stroke="#f97316" strokeWidth="2.5" />
        <path d="M8 20C8 15.5817 11.5817 12 16 12H44C48.4183 12 52 15.5817 52 20V24H8V20Z" fill="#f97316" />
        <rect x="16" y="8" width="4" height="8" rx="2" fill="#c2410c" />
        <rect x="40" y="8" width="4" height="8" rx="2" fill="#c2410c" />
        <rect x="14" y="30" width="5" height="5" rx="1.5" fill="#fed7aa" />
        <rect x="23" y="30" width="5" height="5" rx="1.5" fill="#fed7aa" />
        <rect x="32" y="30" width="5" height="5" rx="1.5" fill="#fed7aa" />
        <rect x="14" y="39" width="5" height="5" rx="1.5" fill="#fed7aa" />
        <rect x="23" y="39" width="5" height="5" rx="1.5" fill="#fed7aa" />
        <circle cx="44" cy="44" r="12" fill="#0f172a" stroke="#ffffff" strokeWidth="2.5" />
        <path d="M44 38L37 42L44 46L51 42L44 38Z" fill="#ffffff" />
        <path d="M40 44V47C40 48.5 41.8 50 44 50C46.2 50 48 48.5 48 47V44" stroke="#ffffff" strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------
 * 4. Monday Munch Illustration: Green Analytics Chart + Clock
 * ------------------------------------------------------------- */
function MondayMunchIllustration() {
  return (
    <div className="relative w-20 h-16 sm:w-24 sm:h-20 flex items-center justify-center shrink-0 pointer-events-none select-none">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/50 to-green-300/30 rounded-full blur-xs" />
      <svg className="absolute -top-1 right-2 w-3.5 h-3.5 text-emerald-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z" />
      </svg>
      <svg className="absolute bottom-2 -left-1 w-2.5 h-2.5 text-emerald-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z" />
      </svg>
      <svg className="relative w-14 h-14 sm:w-16 sm:h-16 drop-shadow-sm" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="14" width="46" height="38" rx="8" fill="#10b981" />
        <rect x="14" y="36" width="5" height="10" rx="1.5" fill="#a7f3d0" />
        <rect x="22" y="30" width="5" height="16" rx="1.5" fill="#a7f3d0" />
        <rect x="30" y="24" width="5" height="22" rx="1.5" fill="#a7f3d0" />
        <path d="M14 34L24 26L32 30L44 19" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M38 19H44V25" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="44" cy="44" r="11" fill="#047857" stroke="#ffffff" strokeWidth="2.5" />
        <path d="M44 39V44L47 45.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------
 * 5. Starters Illustration: Cyan Laptop with Code Brackets + Trophy
 * ------------------------------------------------------------- */
function StartersIllustration() {
  return (
    <div className="relative w-20 h-16 sm:w-24 sm:h-20 flex items-center justify-center shrink-0 pointer-events-none select-none">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-200/50 to-cyan-300/30 rounded-full blur-xs" />
      <svg className="absolute -top-1 right-2 w-3.5 h-3.5 text-sky-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z" />
      </svg>
      <svg className="absolute bottom-2 -left-1 w-2.5 h-2.5 text-sky-300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5z" />
      </svg>
      <svg className="relative w-14 h-14 sm:w-16 sm:h-16 drop-shadow-sm" viewBox="0 0 64 64" fill="none">
        <rect x="12" y="16" width="38" height="26" rx="4" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
        <circle cx="16" cy="19" r="1" fill="#bae6fd" />
        <circle cx="19" cy="19" r="1" fill="#bae6fd" />
        <circle cx="22" cy="19" r="1" fill="#bae6fd" />
        <path d="M24 27L20 30L24 33" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M28 34L32 25" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M36 27L40 30L36 33" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 43C8 42.4477 8.44772 42 9 42H53C53.5523 42 54 42.4477 54 43L51 47H11L8 43Z" fill="#38bdf8" />
        <circle cx="45" cy="44" r="11" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
        <path d="M42 39H48V43C48 44.5 46.5 45.5 45 45.5C43.5 45.5 42 44.5 42 43V39Z" fill="#ffffff" />
        <path d="M44 45.5V48H46V45.5" stroke="#ffffff" strokeWidth="1.5" />
        <path d="M43 48H47" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function ContestCard({ contest, href }: ContestCardProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    hasStarted: boolean;
    hasEnded: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    hasStarted: false,
    hasEnded: false,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const startMs = new Date(contest.start_time).getTime();
      const endMs = new Date(contest.end_time).getTime();

      if (now >= endMs) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, hasStarted: true, hasEnded: true });
        return;
      }

      if (now >= startMs) {
        // Live contest: time until end
        const diff = Math.max(0, endMs - now);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds, hasStarted: true, hasEnded: false });
        return;
      }

      // Upcoming contest: time until start
      const diff = Math.max(0, startMs - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds, hasStarted: false, hasEnded: false });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [contest.start_time, contest.end_time]);

  // Format date in Asia/Kolkata
  const formatKolkataDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const datePart = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
      const timePart = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date).toLowerCase();

      const parts = datePart.split(' ');
      const formattedDate =
        parts.length >= 4
          ? `${parts[0]} ${parts[1]} ${parts[2].replace(',', '')}, ${parts[3]}`
          : datePart;

      return `${formattedDate}, ${timePart}`;
    } catch {
      return isoString;
    }
  };

  // Format duration into "90 mins" or "2.0 hrs"
  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins >= 120 && mins % 60 === 0) {
      return `${(mins / 60).toFixed(1)} hrs`;
    }
    return `${mins} mins`;
  };

  const contestTheme = useMemo(() => getContestTheme(contest), [contest]);

  const themeConfig = useMemo(() => {
    switch (contestTheme) {
      case 'weekly':
        return {
          cardBg: 'bg-[#f0f7ff]',
          borderColor: 'border-[#93c5fa]',
          borderHover: 'hover:border-[#3b82f6]',
          categoryBg: 'bg-[#dbeafe]',
          categoryText: 'text-[#1d4ed8]',
          categoryLabel: 'LEETCODE WEEKLY',
          statusBg: 'bg-[#dbeafe]/80',
          statusText: 'text-[#1d4ed8]',
          statusDot: 'bg-[#2563eb]',
          countdownClock: 'text-[#2563eb]',
          countdownLabelText: 'text-[#2563eb]',
          countdownBoxBg: 'bg-[#dbeafe]',
          countdownBoxText: 'text-[#1d4ed8]',
          analyticsText: 'text-[#2563eb]',
          illustration: <WeeklyIllustration />,
        };
      case 'biweekly':
        return {
          cardBg: 'bg-[#faf5ff]',
          borderColor: 'border-[#d8b4fe]',
          borderHover: 'hover:border-[#a855f7]',
          categoryBg: 'bg-[#f3e8ff]',
          categoryText: 'text-[#7e22ce]',
          categoryLabel: 'LEETCODE BIWEEKLY',
          statusBg: 'bg-[#f3e8ff]/80',
          statusText: 'text-[#7e22ce]',
          statusDot: 'bg-[#9333ea]',
          countdownClock: 'text-[#9333ea]',
          countdownLabelText: 'text-[#9333ea]',
          countdownBoxBg: 'bg-[#f3e8ff]',
          countdownBoxText: 'text-[#7e22ce]',
          analyticsText: 'text-[#9333ea]',
          illustration: <BiweeklyIllustration />,
        };
      case 'placement_prep':
        return {
          cardBg: 'bg-[#fff8f2]',
          borderColor: 'border-[#fed7aa]',
          borderHover: 'hover:border-[#f97316]',
          categoryBg: 'bg-[#ffedd5]',
          categoryText: 'text-[#c2410c]',
          categoryLabel: 'CODECHEF STARTERS / RATED',
          statusBg: 'bg-[#ffedd5]/80',
          statusText: 'text-[#c2410c]',
          statusDot: 'bg-[#ea580c]',
          countdownClock: 'text-[#ea580c]',
          countdownLabelText: 'text-[#ea580c]',
          countdownBoxBg: 'bg-[#ffedd5]',
          countdownBoxText: 'text-[#c2410c]',
          analyticsText: 'text-[#ea580c]',
          illustration: <PlacementPrepIllustration />,
        };
      case 'monday_munch':
        return {
          cardBg: 'bg-[#f0fbf4]',
          borderColor: 'border-[#86efac]',
          borderHover: 'hover:border-[#22c55e]',
          categoryBg: 'bg-[#dcfce7]',
          categoryText: 'text-[#15803d]',
          categoryLabel: 'CODECHEF STARTERS / RATED',
          statusBg: 'bg-[#dcfce7]/80',
          statusText: 'text-[#15803d]',
          statusDot: 'bg-[#16a34a]',
          countdownClock: 'text-[#16a34a]',
          countdownLabelText: 'text-[#16a34a]',
          countdownBoxBg: 'bg-[#dcfce7]',
          countdownBoxText: 'text-[#15803d]',
          analyticsText: 'text-[#16a34a]',
          illustration: <MondayMunchIllustration />,
        };
      case 'starters':
      default:
        return {
          cardBg: 'bg-[#effafc]',
          borderColor: 'border-[#7dd3fc]',
          borderHover: 'hover:border-[#0ea5e9]',
          categoryBg: 'bg-[#e0f2fe]',
          categoryText: 'text-[#0369a1]',
          categoryLabel: 'CODECHEF STARTERS / RATED',
          statusBg: 'bg-[#e0f2fe]/80',
          statusText: 'text-[#0369a1]',
          statusDot: 'bg-[#0284c7]',
          countdownClock: 'text-[#0284c7]',
          countdownLabelText: 'text-[#0284c7]',
          countdownBoxBg: 'bg-[#e0f2fe]',
          countdownBoxText: 'text-[#0369a1]',
          analyticsText: 'text-[#0284c7]',
          illustration: <StartersIllustration />,
        };
    }
  }, [contestTheme]);

  const statusBadge = () => {
    if (timeLeft.hasEnded || contest.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          Completed
        </span>
      );
    }
    if (timeLeft.hasStarted || contest.status === 'live') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Live Now
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${themeConfig.statusBg} ${themeConfig.statusText}`}>
        <span className={`w-2 h-2 rounded-full ${themeConfig.statusDot}`} />
        Upcoming
      </span>
    );
  };

  // Separate countdown units matching reference screenshot: [1d] [13h] [20m] [38s]
  const countdownUnits = useMemo(() => {
    const units: string[] = [];
    if (timeLeft.days > 0) {
      units.push(`${timeLeft.days}d`);
    }
    units.push(`${String(timeLeft.hours).padStart(2, '0')}h`);
    units.push(`${String(timeLeft.minutes).padStart(2, '0')}m`);
    units.push(`${String(timeLeft.seconds).padStart(2, '0')}s`);
    return units;
  }, [timeLeft]);

  return (
    <Link
      href={href}
      className={`group relative ${themeConfig.cardBg} rounded-2xl border ${themeConfig.borderColor} ${themeConfig.borderHover} p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-all duration-200 flex flex-col justify-between overflow-hidden`}
    >
      <div>
        {/* Top Area: Badges & Right Illustration */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Category Label Pill */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${themeConfig.categoryBg} ${themeConfig.categoryText}`}>
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{themeConfig.categoryLabel}</span>
              </span>
            </div>

            {/* Title */}
            <h3 className="text-xl sm:text-[22px] font-black text-[#0f1b35] group-hover:text-[#1769ff] transition-colors line-clamp-1 mt-3 mb-2">
              {contest.title}
            </h3>

            {/* Schedule & Duration */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-[#64748b] font-medium">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{formatKolkataDateTime(contest.start_time)}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Duration: {formatDuration(contest.duration_seconds)}</span>
              </div>
            </div>
          </div>

          {/* Right Section: Status Badge on Top, Themed Illustration below */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {statusBadge()}
            <div className="hidden sm:block mt-1">
              {themeConfig.illustration}
            </div>
          </div>
        </div>

        {/* Divider Line */}
        <div className="border-t border-slate-200/50 my-3.5" />

        {/* Bottom Row: Countdown on Left, Linked Students & Analytics on Right */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          {/* Left: Dynamic Countdown Section */}
          {timeLeft.hasEnded || contest.status === 'completed' ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Contest Ended</span>
            </div>
          ) : timeLeft.hasStarted || contest.status === 'live' ? (
            <div className="flex items-center gap-2">
              <Clock className={`w-3.5 h-3.5 ${themeConfig.countdownClock} shrink-0`} />
              <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${themeConfig.countdownLabelText}`}>
                ENDS IN:
              </span>
              <div className="flex items-center gap-1 font-mono font-bold text-xs">
                {countdownUnits.map((u, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded-md ${themeConfig.countdownBoxBg} ${themeConfig.countdownBoxText}`}>
                    {u}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Clock className={`w-3.5 h-3.5 ${themeConfig.countdownClock} shrink-0`} />
              <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${themeConfig.countdownLabelText}`}>
                STARTS IN:
              </span>
              <div className="flex items-center gap-1 font-mono font-bold text-xs">
                {countdownUnits.map((u, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded-md ${themeConfig.countdownBoxBg} ${themeConfig.countdownBoxText}`}>
                    {u}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Right: Linked Students & Analytics Action */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#64748b] font-medium">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {contest.status === 'completed' && contest.attended_count !== undefined
                  ? `${contest.attended_count} Attended`
                  : contest.linked_accounts_count !== undefined
                  ? `${contest.linked_accounts_count} linked students`
                  : '1 linked students'}
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <span className={`inline-flex items-center gap-1 text-xs font-bold ${themeConfig.analyticsText} group-hover:translate-x-0.5 transition-all`}>
              <span>Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
