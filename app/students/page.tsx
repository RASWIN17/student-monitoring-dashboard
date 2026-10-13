'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { StudentPerformanceOverview } from '@/lib/types';
import { ScanModal } from '@/components/ScanModal';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Eye,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
} from 'lucide-react';

export default function StudentsPage() {
  const { selectedClassroom, user } = useAuth();
  const [students, setStudents] = useState<StudentPerformanceOverview[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Single student scan modal
  const [scanStudent, setScanStudent] = useState<{ id: string; name: string } | null>(null);

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
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClassroom]);

  // Filter application
  const filteredStudents = students.filter((item) => {
    const s = item.student;
    const lc = item.leetcodeAccount;
    const cc = item.codechefAccount;

    // Search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchName = s.display_name.toLowerCase().includes(term);
      const matchEmail = s.email.toLowerCase().includes(term);
      const matchLc = lc?.username.toLowerCase().includes(term);
      const matchCc = cc?.username.toLowerCase().includes(term);
      if (!matchName && !matchEmail && !matchLc && !matchCc) return false;
    }

    // Activity filter
    if (activityFilter === 'active_today') {
      const lcActive = item.leetcodeTodayActivity?.activity_status === 'active';
      const ccActive = item.codechefTodayActivity?.activity_status === 'active';
      if (!lcActive && !ccActive) return false;
    } else if (activityFilter === 'no_activity_today') {
      const lcNo = item.leetcodeTodayActivity?.activity_status === 'no_activity';
      const ccNo = item.codechefTodayActivity?.activity_status === 'no_activity';
      if (!lcNo && !ccNo) return false;
    } else if (activityFilter === 'active_yesterday') {
      const lcActYest = item.leetcodeYesterdayActivity?.activity_status === 'active';
      const ccActYest = item.codechefYesterdayActivity?.activity_status === 'active';
      if (!lcActYest && !ccActYest) return false;
    }

    // Platform filter
    if (platformFilter === 'leetcode_linked' && !lc) return false;
    if (platformFilter === 'leetcode_unlinked' && lc) return false;
    if (platformFilter === 'codechef_linked' && !cc) return false;
    if (platformFilter === 'codechef_unlinked' && cc) return false;
    if (platformFilter === 'any_unlinked' && lc && cc) return false;

    // Status filter
    if (statusFilter === 'error') {
      const lcErr = lc?.account_status === 'error' || lc?.account_status === 'not_found';
      const ccErr = cc?.account_status === 'error' || cc?.account_status === 'not_found';
      if (!lcErr && !ccErr) return false;
    }

    return true;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setActivityFilter('all');
    setPlatformFilter('all');
    setStatusFilter('all');
  };

  if (user && !isTeacher) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-xl border border-red-200 p-8 text-center shadow-xs">
        <div className="h-12 w-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-500 mb-6">
          The student performance roster is only accessible to verified teachers and instructors.
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

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Student Performance Roster</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedClassroom
              ? `Enrolled students for ${selectedClassroom.name} (${selectedClassroom.course} - Sec ${selectedClassroom.section})`
              : 'Select a classroom to view enrolled students'}
          </p>
        </div>

        <button
          onClick={fetchStudents}
          className="p-2 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition self-start sm:self-auto"
          title="Refresh Roster"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, email, or handle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Activity Filter */}
          <select
            aria-label="Filter by Activity"
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Activity</option>
            <option value="active_today">Active Today (Asia/Kolkata)</option>
            <option value="active_yesterday">Active Yesterday</option>
            <option value="no_activity_today">No Activity Today</option>
          </select>

          {/* Platform Filter */}
          <select
            aria-label="Filter by Platform"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Platforms</option>
            <option value="any_unlinked">Missing Platform Handle</option>
            <option value="leetcode_linked">LeetCode Linked</option>
            <option value="leetcode_unlinked">LeetCode Not Linked</option>
            <option value="codechef_linked">CodeChef Linked</option>
            <option value="codechef_unlinked">CodeChef Not Linked</option>
          </select>

          {/* Status Filter */}
          <select
            aria-label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="error">Failed / Requires Retry</option>
          </select>

          {/* Reset Filters */}
          <button
            onClick={resetFilters}
            className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <span className="text-xs font-semibold">Loading student records...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <div className="text-sm font-semibold text-slate-700">No students match current filters</div>
            <p className="text-xs text-slate-400 mt-1">
              {students.length === 0
                ? 'No students enrolled in this classroom yet. Share your join code.'
                : 'Try adjusting your search query or reset the filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">LeetCode Handle</th>
                  <th className="py-3 px-4 text-center">LC Solved</th>
                  <th className="py-3 px-4 text-center">LC Rating</th>
                  <th className="py-3 px-4">CodeChef Handle</th>
                  <th className="py-3 px-4 text-center">CC Solved</th>
                  <th className="py-3 px-4 text-center">CC Rating</th>
                  <th className="py-3 px-4 text-center">Today Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStudents.map((item) => {
                  const s = item.student;
                  const lc = item.leetcodeAccount;
                  const cc = item.codechefAccount;
                  const lcSnap = item.leetcodeSnapshot;
                  const ccSnap = item.codechefSnapshot;

                  // Today status
                  const lcToday = item.leetcodeTodayActivity;
                  const ccToday = item.codechefTodayActivity;
                  const isActiveToday = (lcToday?.submission_count || 0) > 0 || (ccToday?.submission_count || 0) > 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      {/* Student info */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{s.display_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.email}</div>
                      </td>

                      {/* LeetCode Handle */}
                      <td className="py-3 px-4">
                        {lc ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-800">{lc.username}</span>
                            <a
                              href={lc.public_profile_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-blue-600"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not linked</span>
                        )}
                      </td>

                      {/* LeetCode Solved */}
                      <td className="py-3 px-4 text-center font-semibold">
                        {lcSnap ? lcSnap.total_solved : <span className="text-slate-300">—</span>}
                      </td>

                      {/* LeetCode Rating */}
                      <td className="py-3 px-4 text-center">
                        {lcSnap?.contest_rating ? (
                          <span className="font-mono font-bold text-slate-800">{Math.round(lcSnap.contest_rating)}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* CodeChef Handle */}
                      <td className="py-3 px-4">
                        {cc ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-800">{cc.username}</span>
                            <a
                              href={cc.public_profile_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-blue-600"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not linked</span>
                        )}
                      </td>

                      {/* CodeChef Solved */}
                      <td className="py-3 px-4 text-center font-semibold">
                        {ccSnap?.total_solved !== null && ccSnap?.total_solved !== undefined ? (
                          ccSnap.total_solved
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* CodeChef Rating */}
                      <td className="py-3 px-4 text-center">
                        {ccSnap?.contest_rating ? (
                          <span className="font-mono font-bold text-slate-800">{Math.round(ccSnap.contest_rating)}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Today Status (Asia/Kolkata) */}
                      <td className="py-3 px-4 text-center">
                        {isActiveToday ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : lcSnap || ccSnap ? (
                          <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            No activity
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Pending scan</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isTeacher && (
                            <button
                              onClick={() => setScanStudent({ id: s.id, name: s.display_name })}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Scan Student Accounts"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
                          <Link
                            href={`/students/${s.id}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                            title="View Full History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single student scan modal */}
      {scanStudent && (
        <ScanModal
          isOpen={true}
          onClose={() => setScanStudent(null)}
          onScanCompleted={() => {
            fetchStudents();
            setScanStudent(null);
          }}
          targetStudentId={scanStudent.id}
          targetStudentName={scanStudent.name}
        />
      )}
    </div>
  );
}
