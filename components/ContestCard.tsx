'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
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

  // Format duration into "90 mins" or "3.0 hrs" matching reference screenshots
  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins >= 120 && mins % 60 === 0) {
      return `${(mins / 60).toFixed(1)} hrs`;
    }
    return `${mins} mins`;
  };

  const isLeetCode = contest.platform === 'leetcode';
  const isBiweekly = contest.contest_code.toLowerCase().includes('biweekly');

  const statusBadge = () => {
    if (timeLeft.hasEnded || contest.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Completed
        </span>
      );
    }
    if (timeLeft.hasStarted || contest.status === 'live') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Live Now
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#eef4ff] text-[#1769ff]">
        <span className="w-2 h-2 rounded-full bg-[#1769ff]" />
        Upcoming
      </span>
    );
  };

  const formatCountdown = () => {
    const dStr = timeLeft.days > 0 ? `${timeLeft.days}d ` : '';
    const hStr = `${String(timeLeft.hours).padStart(2, '0')}h`;
    const mStr = `${String(timeLeft.minutes).padStart(2, '0')}m`;
    const sStr = `${String(timeLeft.seconds).padStart(2, '0')}s`;
    return `${dStr}${hStr} : ${mStr} : ${sStr}`;
  };

  return (
    <Link
      href={href}
      className="group relative bg-white rounded-2xl border border-[#e2eaf5] border-t-[3.5px] border-t-[#1769ff] p-6 shadow-[0_4px_20px_rgba(30,64,175,0.04)] hover:shadow-[0_8px_28px_rgba(30,64,175,0.08)] transition-all duration-200 flex flex-col justify-between overflow-hidden"
    >
      <div>
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-[#eef4ff] text-[#1769ff]">
            {isLeetCode
              ? isBiweekly
                ? 'LEETCODE BIWEEKLY'
                : 'LEETCODE WEEKLY'
              : 'CODECHEF STARTERS / RATED'}
          </span>
          {statusBadge()}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-[#0f1b35] group-hover:text-[#1769ff] transition-colors line-clamp-1 mt-3 mb-2.5">
          {contest.title}
        </h3>

        {/* Schedule & Duration */}
        <div className="space-y-1.5 text-xs text-[#64748b]">
          <div className="flex items-center gap-2 font-medium">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{formatKolkataDateTime(contest.start_time)}</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Duration: {formatDuration(contest.duration_seconds)}</span>
          </div>
        </div>

        {/* Horizontal Divider */}
        <div className="border-t border-[#edf2f9] my-4" />

        {/* Dynamic Starts-in Countdown */}
        {timeLeft.hasEnded || contest.status === 'completed' ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Contest Ended</span>
          </div>
        ) : timeLeft.hasStarted || contest.status === 'live' ? (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">ENDS IN:</span>
            <div className="bg-emerald-50 text-emerald-700 font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
              {formatCountdown()}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">STARTS IN:</span>
            <div className="bg-[#eef4ff] text-[#1769ff] font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
              {formatCountdown()}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Row */}
      <div className="flex items-center justify-between pt-1">
        {contest.status === 'completed' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748b] font-medium">
              {contest.attended_count !== undefined
                ? `${contest.attended_count} Attended`
                : contest.linked_accounts_count !== undefined
                ? `${contest.linked_accounts_count} linked students`
                : 'Completed'}
            </span>
            {contest.scan_status === 'scanning' && (
              <span className="text-[10px] text-[#1769ff] flex items-center gap-1 animate-pulse">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Scanning
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-[#64748b] font-medium">
            {contest.linked_accounts_count !== undefined
              ? `${contest.linked_accounts_count} linked students`
              : '1 linked students'}
          </span>
        )}

        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1769ff] group-hover:text-[#0052cc] group-hover:translate-x-0.5 transition-all">
          <span>Analytics</span>
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </span>
      </div>
    </Link>
  );
}
