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

import { dataCache } from '@/components/DataCacheContext';

interface Props {
  platform: 'leetcode' | 'codechef';
}

export function ClassroomSelectionView({ platform }: Props) {
  const { user } = useAuth();
  const cacheKey = 'classrooms:selection:list';
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => dataCache.get<Classroom[]>(cacheKey) || []);
  const [loading, setLoading] = useState(() => !dataCache.get<Classroom[]>(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const platformDisplayName = platform === 'leetcode' ? 'LeetCode' : 'CodeChef';
  const platformColor = platform === 'leetcode' ? 'amber' : 'orange';

  const fetchClassrooms = async (force = false) => {
    if (!force && dataCache.get(cacheKey)) return;
    if (!dataCache.get(cacheKey)) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/classrooms');
      if (res.ok) {
        const data = await res.json();
        const loaded = data.classrooms || [];
        setClassrooms(loaded);
        dataCache.set(cacheKey, loaded);
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
    const cached = dataCache.get<Classroom[]>(cacheKey);
    if (cached) {
      setClassrooms(cached);
      setLoading(false);
    } else {
      fetchClassrooms();
    }
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
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                platform === 'leetcode'
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-orange-50 border-orange-200 text-orange-600'
              }`}
            >
              {platform === 'leetcode' ? (
                <LeetCodeIcon className="w-6 h-6" />
              ) : (
                <CodeChefIcon className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                    platform === 'leetcode'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-orange-50 text-orange-800 border border-orange-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{platformDisplayName} Analytics</span>
                </span>
                <span className="text-[11px] text-slate-400">Step 2 of 3</span>
              </div>

              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Select a Classroom
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                Choose a classroom section below to view enrolled students, verified {platformDisplayName}{' '}
                profile metrics, problem counts, contest ratings, and leaderboards.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <Link
              href="/students"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Platforms</span>
            </Link>

            <Link
              href="/classrooms"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Classroom</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-20 text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
          <p className="text-xs font-medium text-slate-700">Loading available classrooms...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-white rounded-xl border border-rose-200 p-6 text-center max-w-md mx-auto">
          <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Failed to Load Classrooms</h3>
          <p className="text-xs text-slate-500 mb-3">{error}</p>
          <button
            onClick={() => fetchClassrooms(true)}
            className="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && classrooms.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center max-w-lg mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">No Classrooms Available</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              You haven&apos;t created any classroom sections yet. Create your first classroom to generate a student
              join code and start monitoring {platformDisplayName} coding performance.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-2">
            <Link
              href="/students"
              className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Back to Platforms
            </Link>
            <Link
              href="/classrooms"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
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
            <span className="text-xs font-semibold text-slate-700">
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
                  className="group bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between hover:border-slate-300 transition-colors relative overflow-hidden"
                >
                  {/* Subtle top accent bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      platform === 'leetcode'
                        ? 'bg-amber-500'
                        : 'bg-orange-600'
                    }`}
                  />

                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {enrolled} {enrolled === 1 ? 'Student' : 'Students'}
                        </span>
                      </span>

                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                        {c.join_code}
                      </span>
                    </div>

                    {/* Classroom Title */}
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">
                      {c.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
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
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold flex items-center gap-1 ${
                        platform === 'leetcode'
                          ? 'text-amber-700'
                          : 'text-orange-700'
                      }`}
                    >
                      <span>View {platformDisplayName} Students</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
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
