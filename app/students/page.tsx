'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { StudentPerformanceOverview } from '@/lib/types';
import { ScanModal } from '@/components/ScanModal';
import {
  Users,
  Code2,
  ChefHat,
  ArrowRight,
  RefreshCw,
  Play,
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Layers,
  TrendingUp,
} from 'lucide-react';

export default function StudentsHubPage() {
  const { selectedClassroom, user } = useAuth();
  const [students, setStudents] = useState<StudentPerformanceOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const fetchStudents = async () => {
    if (!selectedClassroom) {
      setStudents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${selectedClassroom.id}/students`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClassroom]);

  if (user && !isTeacher) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-xl border border-red-200 p-8 text-center shadow-xs">
        <div className="h-12 w-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-500 mb-6">
          The student performance portals are only accessible to verified teachers and instructors.
        </p>
        <Link
          href="/student/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
        >
          Go to Student Dashboard
        </Link>
      </div>
    );
  }

  // Calculated metrics
  const totalStudents = students.length;

  const leetcodeLinked = students.filter((s) => !!s.leetcodeAccount).length;
  const leetcodeTotalSolved = students.reduce(
    (acc, s) => acc + (s.leetcodeSnapshot?.total_solved || 0),
    0
  );
  const leetcodeActiveToday = students.filter(
    (s) => s.leetcodeTodayActivity?.activity_status === 'active'
  ).length;

  const codechefLinked = students.filter((s) => !!s.codechefAccount).length;
  const codechefTotalSolved = students.reduce(
    (acc, s) => acc + (s.codechefSnapshot?.total_solved || 0),
    0
  );
  const codechefActiveToday = students.filter(
    (s) => s.codechefTodayActivity?.activity_status === 'active'
  ).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Students Monitoring Portals
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedClassroom
                  ? `Select a platform below to view enrolled students for ${selectedClassroom.name} (${selectedClassroom.course} - Sec ${selectedClassroom.section})`
                  : 'Select a classroom to view enrolled students'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={fetchStudents}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition disabled:opacity-50"
            title="Refresh Student Counts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsScanModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Scan Now</span>
          </button>
        </div>
      </div>

      {/* Classroom Context Banner */}
      {selectedClassroom && (
        <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-200/70 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>{selectedClassroom.name}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-medium">
              Section {selectedClassroom.section}
            </span>
            <span className="text-slate-300">•</span>
            <span className="bg-white border border-blue-200 font-mono text-blue-700 px-2 py-0.5 rounded font-semibold">
              Join Code: {selectedClassroom.join_code}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-800">{totalStudents}</span>
            <span>Total Enrolled</span>
          </div>
        </div>
      )}

      {/* TWO SEPARATE BOXES: CodeChef and LeetCode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box 1: CodeChef */}
        <Link
          href="/students/codechef"
          className="group relative bg-white hover:bg-orange-50/20 border-2 border-slate-200/90 hover:border-orange-500 rounded-2xl p-6 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <ChefHat className="w-8 h-8" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100/70 text-orange-800 border border-orange-200">
                CodeChef Page
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
              CodeChef
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Display the complete list of students with all verified CodeChef details, global & country rankings, division ratings, and problem solved counts.
            </p>

            {/* Quick Metrics Inside CodeChef Box */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-100">
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <div className="text-[11px] font-medium text-slate-500">Total Students</div>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {totalStudents}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {codechefLinked} accounts linked
                </div>
              </div>

              <div className="bg-orange-50/50 rounded-xl p-3 border border-orange-100">
                <div className="text-[11px] font-medium text-orange-700">Problems Solved</div>
                <div className="text-xl font-extrabold text-orange-950 mt-0.5">
                  {codechefTotalSolved}
                </div>
                <div className="text-[10px] text-orange-700 mt-0.5">
                  Across all students
                </div>
              </div>
            </div>

            {/* Features badge */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                Problems Solved Sorting
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                Global & Country Rank
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                Star Ratings
              </span>
            </div>
          </div>

          <div className="pt-6">
            <div className="w-full py-2.5 px-4 bg-orange-600 group-hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs">
              <span>View CodeChef Students</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Box 2: LeetCode */}
        <Link
          href="/students/leetcode"
          className="group relative bg-white hover:bg-amber-50/20 border-2 border-slate-200/90 hover:border-amber-500 rounded-2xl p-6 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Code2 className="w-8 h-8" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100/70 text-amber-800 border border-amber-200">
                LeetCode Page
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
              LeetCode
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Display the complete list of students with all verified LeetCode details, easy/medium/hard breakdown, contest ratings, and global rankings.
            </p>

            {/* Quick Metrics Inside LeetCode Box */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-100">
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <div className="text-[11px] font-medium text-slate-500">Total Students</div>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {totalStudents}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {leetcodeLinked} accounts linked
                </div>
              </div>

              <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100">
                <div className="text-[11px] font-medium text-amber-700">Problems Solved</div>
                <div className="text-xl font-extrabold text-amber-950 mt-0.5">
                  {leetcodeTotalSolved}
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5">
                  Across all students
                </div>
              </div>
            </div>

            {/* Features badge */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                Problems Solved Sorting
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                Global Ranking
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                Difficulty Breakdown
              </span>
            </div>
          </div>

          <div className="pt-6">
            <div className="w-full py-2.5 px-4 bg-amber-600 group-hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs">
              <span>View LeetCode Students</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Classroom Scan Modal */}
      {isScanModalOpen && (
        <ScanModal
          isOpen={true}
          onClose={() => setIsScanModalOpen(false)}
          onScanCompleted={() => {
            fetchStudents();
            setIsScanModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
