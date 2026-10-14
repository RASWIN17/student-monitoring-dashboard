'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { Classroom, StudentPerformanceOverview } from '@/lib/types';
import {
  GraduationCap,
  ArrowLeft,
  Users,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Mail,
  Hash,
  Layers,
  User,
  AlertCircle,
  X,
} from 'lucide-react';

function parseRegParts(val: string): { prefix: string; num: number; numStr: string } | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    return { prefix: '', num: parseInt(trimmed, 10), numStr: trimmed };
  }
  const match = trimmed.match(/^(.*?)(\d+)$/);
  if (match) {
    return { prefix: match[1].toUpperCase(), num: parseInt(match[2], 10), numStr: match[2] };
  }
  return null;
}

function validateRegRange(start: string, end: string): string | null {
  const s = start.trim();
  const e = end.trim();
  if (!s || !e) return null;

  const pStart = parseRegParts(s);
  const pEnd = parseRegParts(e);

  if (pStart && pEnd && pStart.prefix === pEnd.prefix) {
    if (pStart.num > pEnd.num) {
      return 'Starting Register Number cannot be greater than Ending Register Number.';
    }
  } else if (s.toUpperCase() > e.toUpperCase()) {
    return 'Starting Register Number cannot be greater than Ending Register Number.';
  }
  return null;
}

function checkRegInRange(regNo: string | undefined | null, start: string, end: string): boolean {
  if (!regNo) return false;
  const s = start.trim();
  const e = end.trim();
  if (!s && !e) return true;

  const reg = regNo.trim();
  const pReg = parseRegParts(reg);
  const pStart = s ? parseRegParts(s) : null;
  const pEnd = e ? parseRegParts(e) : null;

  if (pReg && pStart && pEnd && pStart.prefix === pEnd.prefix && pReg.prefix === pStart.prefix) {
    return pReg.num >= pStart.num && pReg.num <= pEnd.num;
  }
  if (pReg && pStart && !pEnd && pReg.prefix === pStart.prefix) {
    return pReg.num >= pStart.num;
  }
  if (pReg && !pStart && pEnd && pReg.prefix === pEnd.prefix) {
    return pReg.num <= pEnd.num;
  }

  const rUp = reg.toUpperCase();
  const sUp = s.toUpperCase();
  const eUp = e.toUpperCase();

  if (sUp && eUp) {
    return rUp >= sUp && rUp <= eUp;
  }
  if (sUp) {
    return rUp >= sUp;
  }
  if (eUp) {
    return rUp <= eUp;
  }
  return true;
}

export default function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const classroomId = resolvedParams.id;
  const router = useRouter();
  const { user, loading: authLoading, refreshClassrooms } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<StudentPerformanceOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [startRegRange, setStartRegRange] = useState('');
  const [endRegRange, setEndRegRange] = useState('');
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Delete modal state
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string; registerNumber: string; email: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchClassroomData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch classroom info
      const cRes = await fetch(`/api/classrooms/${classroomId}`);
      if (!cRes.ok) {
        if (cRes.status === 404) {
          setError('Classroom not found.');
        } else if (cRes.status === 403 || cRes.status === 401) {
          setError('You are not authorized to view this classroom.');
        } else {
          setError('Failed to load classroom details.');
        }
        setLoading(false);
        return;
      }
      const cData = await cRes.json();
      setClassroom(cData.classroom);

      // 2. Fetch enrolled students roster
      const sRes = await fetch(`/api/classrooms/${classroomId}/students`);
      if (sRes.ok) {
        const sData = await sRes.json();
        setStudents(sData.students || []);
      } else {
        const sErr = await sRes.json();
        setError(sErr.error || 'Failed to load classroom student roster.');
      }
    } catch {
      setError('Network error loading classroom details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchClassroomData();
    }
  }, [classroomId, authLoading, user]);

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    setDeleteSuccess(null);

    try {
      const res = await fetch(`/api/classrooms/${classroomId}/students/${studentToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setDeleteError(data.error || 'Failed to remove student from classroom.');
        setDeleting(false);
        return;
      }

      setDeleteSuccess(`Student "${studentToDelete.name}" was successfully removed from this classroom.`);
      setStudentToDelete(null);
      // Refresh list and count
      await fetchClassroomData();
      await refreshClassrooms();
    } catch {
      setDeleteError('Network error while removing student.');
    } finally {
      setDeleting(false);
    }
  };

  const handleRangeChange = (start: string, end: string) => {
    setStartRegRange(start);
    setEndRegRange(end);
    const err = validateRegRange(start, end);
    setRangeError(err);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStartRegRange('');
    setEndRegRange('');
    setRangeError(null);
  };

  const isFilterActive = Boolean(searchQuery.trim() || startRegRange.trim() || endRegRange.trim());

  const filteredStudents = students.filter((row) => {
    const s = row.student;
    const regNo = s.register_number || '';

    // 1. Search Query: matches registration number (complete or partial) as well as name, email, section
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchReg = regNo.toLowerCase().includes(q);
      const matchName = s.display_name?.toLowerCase().includes(q);
      const matchEmail = s.email?.toLowerCase().includes(q);
      const matchSec = s.section?.toLowerCase().includes(q);
      if (!matchReg && !matchName && !matchEmail && !matchSec) {
        return false;
      }
    }

    // 2. Registration Number Range Filter
    if ((startRegRange.trim() || endRegRange.trim()) && !rangeError) {
      if (!checkRegInRange(regNo, startRegRange, endRegRange)) {
        return false;
      }
    }

    return true;
  });

  if (authLoading || (loading && !classroom)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Loading classroom details...</span>
      </div>
    );
  }

  if (error && !classroom) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link
          href="/classrooms"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Classrooms</span>
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-red-900">Error Loading Classroom</h3>
          <p className="text-xs text-red-700 mt-1">{error}</p>
          <button
            onClick={fetchClassroomData}
            className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Navigation & Header */}
      <div>
        <Link
          href="/classrooms"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 mb-3 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Classrooms</span>
        </Link>

        {classroom && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0 mt-0.5">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {classroom.course} • Section {classroom.section}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {classroom.academic_year}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-slate-900">{classroom.name}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Department of {classroom.department} • Batch {classroom.batch}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Enrolled Students Pill */}
              <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <div className="text-xs">
                  <span className="text-slate-500 font-medium">Total Students: </span>
                  <span className="font-bold text-slate-900">{students.length}</span>
                </div>
              </div>

              {/* Join Code Capsule */}
              <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2.5">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold leading-none">Join Code</div>
                  <div className="font-mono text-xs font-bold text-slate-800 tracking-wider mt-0.5">
                    {classroom.join_code}
                  </div>
                </div>
                <button
                  onClick={() => copyJoinCode(classroom.join_code)}
                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded transition cursor-pointer"
                  title="Copy Join Code"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {deleteSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{deleteSuccess}</span>
          </div>
          <button
            onClick={() => setDeleteSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {deleteError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{deleteError}</span>
          </div>
          <button
            onClick={() => setDeleteError(null)}
            className="text-red-600 hover:text-red-800 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Roster Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Header Bar & Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Enrolled Students</span>
                <span className="text-xs text-slate-500 font-normal">
                  ({filteredStudents.length} of {students.length})
                </span>
                {isFilterActive && (
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    Filtered
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Verified student profiles enrolled in {classroom?.name} ({classroom?.course} - Sec {classroom?.section}).
              </p>
            </div>

            {isFilterActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="self-start sm:self-auto px-2.5 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg font-medium transition cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>

          {/* Registration Number Search & Range Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
            {/* Search by Registration Number */}
            <div className="sm:col-span-5 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Registration Number, Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Starting Register Number */}
            <div className="sm:col-span-3 relative">
              <input
                type="text"
                placeholder="Starting Reg No."
                value={startRegRange}
                onChange={(e) => handleRangeChange(e.target.value, endRegRange)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
              />
            </div>

            {/* Ending Register Number */}
            <div className="sm:col-span-3 relative">
              <input
                type="text"
                placeholder="Ending Reg No."
                value={endRegRange}
                onChange={(e) => handleRangeChange(startRegRange, e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
              />
            </div>

            {/* Clear Button */}
            <div className="sm:col-span-1 flex items-center">
              {isFilterActive ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg text-center transition cursor-pointer"
                  title="Reset filters"
                >
                  Reset
                </button>
              ) : (
                <div className="text-[11px] text-slate-400 text-center w-full hidden sm:block">
                  Filter
                </div>
              )}
            </div>
          </div>

          {/* Invalid Range Warning */}
          {rangeError && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{rangeError}</span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Fetching enrolled students...</span>
          </div>
        ) : students.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No students enrolled yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Students can join this classroom by entering join code{' '}
              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                {classroom?.join_code}
              </span>{' '}
              on their Student Dashboard, or by registering with Class &quot;{classroom?.course}&quot; and Section &quot;{classroom?.section}&quot;.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <p className="font-semibold text-slate-700">No students match the current filter.</p>
            <p className="text-slate-400 mt-1">Try adjusting your search query or registration number range.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          /* Student Details Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Register Number</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Gmail ID</th>
                  {isTeacher && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((row) => {
                  const s = row.student;
                  const studentSection = s.section || classroom?.section || '—';
                  const regNo = s.register_number || 'N/A';

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Column 1: Student Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                            {s.display_name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{s.display_name}</div>
                            {s.class_name && (
                              <div className="text-[10px] text-slate-400">
                                Class: {s.class_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Register Number */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {regNo}
                      </td>

                      {/* Column 3: Section */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[11px] uppercase">
                          {studentSection}
                        </span>
                      </td>

                      {/* Column 4: Gmail ID */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        <a
                          href={`mailto:${s.email}`}
                          className="hover:text-blue-600 hover:underline inline-flex items-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{s.email}</span>
                        </a>
                      </td>

                      {/* Column 5: Action (Teacher / Admin Only) */}
                      {isTeacher && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setStudentToDelete({
                                id: s.id,
                                name: s.display_name,
                                registerNumber: regNo,
                                email: s.email,
                              });
                            }}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                            title="Delete Student from Classroom"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Student</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Student Confirmation Modal (Teachers / Admins Only) */}
      {isTeacher && studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-start gap-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Student Removal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove this student from the classroom?
                </p>
              </div>
              <button
                onClick={() => setStudentToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900">{studentToDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Register Number:</span>
                  <span className="font-mono font-semibold text-slate-800">{studentToDelete.registerNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gmail ID:</span>
                  <span className="font-mono text-slate-700">{studentToDelete.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Classroom:</span>
                  <span className="font-semibold text-slate-900">{classroom?.name} ({classroom?.course})</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                <strong className="text-slate-700">Data Protection Note:</strong> This will remove the student&apos;s membership from this classroom only. The student&apos;s user account, coding platform connections, and profile will not be deleted.
              </p>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
