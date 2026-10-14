'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { Classroom } from '@/lib/types';
import { LeetCodeIcon, CodeChefIcon } from '@/components/PlatformIcons';
import {
  GraduationCap,
  Users,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Clock,
  Sparkles,
  Layers,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  platform: 'leetcode' | 'codechef';
}

export function ClassroomSelectionView({ platform }: Props) {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const platformDisplayName = platform === 'leetcode' ? 'LeetCode' : 'CodeChef';
  const platformColor = platform === 'leetcode' ? 'amber' : 'orange';

  const fetchClassrooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/classrooms');
      if (res.ok) {
        const data = await res.json();
        setClassrooms(data.classrooms || []);
      } else {
        throw new Error('Failed to load classrooms.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching classroom list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/students" className="hover:text-blue-600 transition">
          Students
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-800">{platformDisplayName}</span>
      </nav>

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                platform === 'leetcode'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                  : 'bg-orange-500/10 border-orange-500/20 text-orange-600'
              }`}
            >
              {platform === 'leetcode' ? (
                <LeetCodeIcon className="w-8 h-8" />
              ) : (
                <CodeChefIcon className="w-8 h-8" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                    platform === 'leetcode'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-orange-100 text-orange-800 border border-orange-300'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{platformDisplayName} Analytics</span>
                </span>
                <span className="text-xs text-slate-400 font-medium">Step 2 of 3</span>
              </div>

              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Select a Classroom
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Choose a classroom section below to view all enrolled students, their verified {platformDisplayName}{' '}
                profile metrics, problem counts, contest ratings, and leaderboard rankings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <Link
              href="/students"
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Platforms</span>
            </Link>

            <Link
              href="/classrooms"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Classroom</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm font-semibold text-slate-700">Loading available classrooms...</p>
          <p className="text-xs text-slate-400">Fetching existing courses and enrolled roster counts</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md mx-auto shadow-xs">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">Failed to Load Classrooms</h3>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <button
            onClick={fetchClassrooms}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && classrooms.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Classrooms Available</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              You haven&apos;t created any classroom sections yet. Create your first classroom to generate a student
              join code and start monitoring {platformDisplayName} coding performance.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/students"
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
            >
              Back to Platforms
            </Link>
            <Link
              href="/classrooms"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Create First Classroom
            </Link>
          </div>
        </div>
      )}

      {/* Classroom Cards Grid */}
      {!loading && !error && classrooms.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Available Classrooms ({classrooms.length})
            </span>
            <span className="text-xs text-slate-400">Click a classroom to view {platformDisplayName} details</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classrooms.map((c) => {
              const enrolled = c.enrolled_count ?? 0;
              const targetUrl = `/students/${platform}/${c.id}`;

              return (
                <Link
                  key={c.id}
                  href={targetUrl}
                  className={`group bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 relative overflow-hidden ${
                    platform === 'leetcode'
                      ? 'hover:border-amber-400 hover:ring-2 hover:ring-amber-400/20'
                      : 'hover:border-orange-500 hover:ring-2 hover:ring-orange-500/20'
                  }`}
                >
                  {/* Subtle top accent bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 ${
                      platform === 'leetcode'
                        ? 'bg-amber-400 group-hover:h-2'
                        : 'bg-orange-500 group-hover:h-2'
                    }`}
                  />

                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {enrolled} {enrolled === 1 ? 'Student' : 'Students'}
                        </span>
                      </span>

                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                        {c.join_code}
                      </span>
                    </div>

                    {/* Classroom Title */}
                    <h2 className="text-xl font-extrabold text-slate-900 group-hover:text-blue-600 transition tracking-tight">
                      {c.name}
                    </h2>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">
                      {c.course} • Section {c.section}
                    </p>

                    {/* Metadata list */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Department:</span>
                        <span className="font-medium text-slate-700 truncate max-w-[180px]" title={c.department}>
                          {c.department}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Batch / Year:</span>
                        <span className="font-medium text-slate-700">
                          {c.batch} ({c.academic_year})
                        </span>
                      </div>
                      {c.last_scan_at && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Last sync:</span>
                          </span>
                          <span className="font-medium text-slate-600">
                            {new Date(c.last_scan_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer CTA */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span
                      className={`text-xs font-bold transition flex items-center gap-1 ${
                        platform === 'leetcode'
                          ? 'text-amber-700 group-hover:text-amber-800'
                          : 'text-orange-700 group-hover:text-orange-800'
                      }`}
                    >
                      <span>View {platformDisplayName} Students</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>

                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                        platform === 'leetcode'
                          ? 'bg-amber-50 group-hover:bg-amber-500 text-amber-600 group-hover:text-white'
                          : 'bg-orange-50 group-hover:bg-orange-500 text-orange-600 group-hover:text-white'
                      }`}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
