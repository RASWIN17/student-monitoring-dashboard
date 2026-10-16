'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Trophy,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  Timer,
} from 'lucide-react';
import { Contest } from '@/lib/types';

interface ContestCardProps {
  contest: Contest;
  href: string;
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
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const isLeetCode = contest.platform === 'leetcode';
  const isBiweekly = contest.contest_code.toLowerCase().includes('biweekly');

  const statusBadge = () => {
    if (timeLeft.hasEnded || contest.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          Completed
        </span>
      );
    }
    if (timeLeft.hasStarted || contest.status === 'live') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Live Now
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
        Upcoming
      </span>
    );
  };

  const renderCountdown = () => {
    if (timeLeft.hasEnded || contest.status === 'completed') {
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Contest Ended</span>
        </div>
      );
    }

    if (timeLeft.hasStarted || contest.status === 'live') {
      return (
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold font-mono">
          <Timer className="w-4 h-4 text-emerald-600" />
          <span>Ends in: {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Starts in:</span>
        <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-200">
          {timeLeft.days > 0 && <span>{timeLeft.days}d</span>}
          <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
          <span>:</span>
          <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
          <span>:</span>
          <span className="text-indigo-600">{String(timeLeft.seconds).padStart(2, '0')}s</span>
        </div>
      </div>
    );
  };

  return (
    <Link
      href={href}
      className="group relative bg-white rounded-xl border border-slate-200 hover:border-slate-400 transition-colors flex flex-col justify-between overflow-hidden"
    >
      {/* Top Banner Stripe - flat platform accent */}
      <div
        className={`h-1 w-full ${
          isLeetCode
            ? isBiweekly
              ? 'bg-indigo-600'
              : 'bg-amber-500'
            : 'bg-orange-600'
        }`}
      />

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Header / Badges */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                isLeetCode
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-orange-50 text-orange-800 border-orange-200'
              }`}
            >
              {isLeetCode ? (isBiweekly ? 'LeetCode Biweekly' : 'LeetCode Weekly') : 'CodeChef Starters / Rated'}
            </span>
            {statusBadge()}
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {contest.title}
          </h3>

          {/* Schedule Date */}
          <div className="mt-2.5 space-y-1 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{formatKolkataDateTime(contest.start_time)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Duration: {Math.round(contest.duration_seconds / 60)} mins</span>
            </div>
          </div>
        </div>

        {/* Live Countdown Capsule */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          {renderCountdown()}
        </div>

        {/* Bottom Attendance / Scan pill */}
        <div className="pt-2 flex items-center justify-between text-xs">
          {contest.status === 'completed' ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {contest.attended_count !== undefined
                    ? `${contest.attended_count} Attended`
                    : 'View Results'}
                </span>
              </span>
              {contest.scan_status === 'scanning' && (
                <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-semibold">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Scanning
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">
              {contest.linked_accounts_count !== undefined
                ? `${contest.linked_accounts_count} linked students`
                : 'Awaiting contest'}
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
            <span>Analytics</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
