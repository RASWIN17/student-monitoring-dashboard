'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { usePageLoading } from '@/components/LoadingContext';
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
  AlertCircle,
  X,
  Eye,
  Code2,
} from 'lucide-react';

export default function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const classroomId = resolvedParams.id;
  const router = useRouter();
  const { user, loading: authLoading, refreshClassrooms } = useAuth();

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<StudentPerformanceOverview[]>([]);
  const [loading, setLoading] = useState(true);

  // Connect genuine initial classroom loading to GlobalLoader
  usePageLoading(loading && !classroom, 'classroom-details');
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Delete modal state (Teachers only)
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
      setLoading(false);

      // 2. Fetch enrolled students roster
      await fetchStudentsData();
    } catch {
      setError('Network error loading classroom details.');
      setLoading(false);
    }
  };

  const fetchStudentsData = async () => {
    setStudentsLoading(true);
    setStudentsError(null);
    try {
      const sRes = await fetch(`/api/classrooms/${classroomId}/students`);
      if (sRes.ok) {
        const sData = await sRes.json();
        setStudents(sData.students || []);
      } else {
        const sErr = await sRes.json();
        setStudentsError(sErr.error || 'Failed to load classroom student roster.');
      }
    } catch {
      setStudentsError('Network error loading classroom student roster.');
    } finally {
      setStudentsLoading(false);
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
    if (!isTeacher || !studentToDelete) return;
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

  const filteredStudents = students.filter((row) => {
    const s = row.student;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = s.display_name?.toLowerCase().includes(q);
    const regMatch = s.register_number?.toLowerCase().includes(q);
    const emailMatch = s.email?.toLowerCase().includes(q);
    const secMatch = s.section?.toLowerCase().includes(q);
    return nameMatch || regMatch || emailMatch || secMatch;
  });

  const enrolledStudentCount = students.length > 0 ? students.length : (classroom?.enrolled_count ?? 0);

  if (authLoading || (loading && !classroom)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#1769ff]" />
        <span className="text-sm font-medium">Loading classroom details...</span>
      </div>
    );
  }

  if (error && !classroom) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link
          href="/classrooms"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#0f1b35] hover:text-[#1769ff] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Classrooms</span>
        </Link>
        <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-red-900">Error Loading Classroom</h3>
          <p className="text-xs text-red-700 mt-1">{error}</p>
          <button
            onClick={fetchClassroomData}
            className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Navigation */}
      <div>
        <Link
          href="/classrooms"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#0f1b35] hover:text-[#1769ff] mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4 text-[#0f1b35]" />
          <span>Back to Classrooms</span>
        </Link>

        {/* Large Classroom Summary Card */}
        {classroom && (
          <div className="bg-white rounded-2xl border border-[#e1eaf5] p-4 sm:p-6 lg:p-7 shadow-[0_8px_30px_rgba(30,64,175,0.06)] flex flex-col xl:flex-row xl:items-center justify-between gap-5 sm:gap-6">
            {/* Left & Center Information */}
            <div className="flex items-start sm:items-center gap-3.5 sm:gap-5">
              <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-[76px] lg:h-[76px] rounded-2xl bg-[#eef4ff] text-[#1769ff] flex items-center justify-center shrink-0 shadow-2xs">
                <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9 text-[#1769ff]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 sm:px-3 py-0.5 rounded-full bg-[#eef4ff] text-[#1769ff] border border-blue-200/50">
                    SECTION {classroom.section}
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold text-[#667a9e]">
                    {classroom.academic_year}
                  </span>
                  {!isTeacher && (
                    <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Eye className="w-3 h-3 text-emerald-600" />
                      <span>View-Only</span>
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0f1b35] tracking-tight mt-1.5 mb-1 break-words">
                  {classroom.name}
                </h1>
                <p className="text-xs text-[#667a9e] font-normal">
                  Department of {classroom.department} • Batch {classroom.batch}
                </p>
              </div>
            </div>

            {/* Right Mini-Cards: Total Students & Join Code */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 w-full xl:w-auto">
              {/* Elevated Mini-Card 1: Total Students */}
              <div className="bg-white border border-[#e8f0fe] rounded-2xl p-3.5 sm:p-4 sm:px-5 shadow-[0_4px_16px_rgba(30,64,175,0.04)] flex items-center gap-3.5 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#eef4ff] text-[#1769ff] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-[#1769ff]" />
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs text-[#667a9e] font-medium leading-none">Total Students</div>
                  <div className="text-xl sm:text-2xl font-bold text-[#0f1b35] leading-tight mt-1">
                    {enrolledStudentCount}
                  </div>
                </div>
              </div>

              {/* Elevated Mini-Card 2: Join Code */}
              <div className="bg-white border border-[#e8f0fe] rounded-2xl p-3.5 sm:p-4 sm:px-5 shadow-[0_4px_16px_rgba(30,64,175,0.04)] flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#eef4ff] text-[#1769ff] flex items-center justify-center shrink-0">
                    <Code2 className="w-5 h-5 text-[#1769ff]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-[11px] text-[#667a9e] font-medium leading-none">Join Code</div>
                    <div className="font-mono text-xs sm:text-sm font-extrabold text-[#0f1b35] tracking-wider mt-1 truncate">
                      {classroom.join_code}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => copyJoinCode(classroom.join_code)}
                  className="p-2 min-h-[36px] min-w-[36px] text-[#8297b8] hover:text-[#1769ff] hover:bg-[#eef4ff] rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Copy Join Code"
                  aria-label="Copy Join Code"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {deleteSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{deleteSuccess}</span>
          </div>
          <button
            onClick={() => setDeleteSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {deleteError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{deleteError}</span>
          </div>
          <button
            onClick={() => setDeleteError(null)}
            className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Enrolled Students Card */}
      <div className="bg-white rounded-2xl border border-[#e1eaf5] shadow-[0_8px_30px_rgba(30,64,175,0.06)] overflow-hidden">
        {/* Section Header */}
        <div className="p-4 sm:p-6 pb-4 sm:pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="text-[#1769ff]">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-[#0f1b35]">
              Enrolled Students
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#eef4ff] text-[#1769ff] text-xs font-semibold">
              {filteredStudents.length} of {enrolledStudentCount}
            </span>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72 lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, reg no, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 min-h-[40px] bg-white border border-[#dce6f5] rounded-xl text-xs text-[#0f1b35] placeholder-[#94a3b8] shadow-[0_2px_8px_rgba(30,64,175,0.04)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1769ff] transition"
            />
          </div>
        </div>

        {/* Loading State */}
        {studentsLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#1769ff]" />
            <span className="text-xs font-medium">Fetching enrolled students...</span>
          </div>
        ) : studentsError ? (
          /* Error State for Roster */
          <div className="p-8 text-center bg-red-50/40">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <div className="text-xs font-semibold text-red-900">{studentsError}</div>
            <p className="text-[11px] text-red-600 mt-1">Please try fetching the roster again.</p>
            <button
              onClick={fetchStudentsData}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition cursor-pointer min-h-[40px]"
            >
              Retry
            </button>
          </div>
        ) : students.length === 0 ? (
          /* Empty State - Only when genuinely 0 students */
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No students enrolled yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {isTeacher ? (
                <>
                  Students can join this classroom by entering join code{' '}
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {classroom?.join_code}
                  </span>{' '}
                  on their Student Dashboard, or by registering with Class &quot;{classroom?.name}&quot; and Section &quot;{classroom?.section}&quot;.
                </>
              ) : (
                'No students are currently enrolled in this classroom.'
              )}
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs space-y-2">
            <p>No students matching &quot;{searchQuery}&quot;.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer min-h-[36px]"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <>
            {/* 1. Desktop Student Details Table (Hidden on mobile < md) */}
            <div className="hidden md:block overflow-x-auto responsive-table-wrapper">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8faff] border-y border-[#edf2f9] text-black font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 px-6">STUDENT NAME</th>
                    <th className="py-3.5 px-6">REGISTER NUMBER</th>
                    <th className="py-3.5 px-6">SECTION</th>
                    <th className="py-3.5 px-6">GMAIL ID</th>
                    {isTeacher && <th className="py-3.5 px-6 text-right">ACTION</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {filteredStudents.map((row) => {
                    const s = row.student;
                    const studentSection = s.section || classroom?.section || '—';
                    const regNo = s.register_number || 'N/A';

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-[#fbfdff] transition-colors group"
                      >
                        {/* Column 1: Student Name */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-full bg-[#eef4ff] text-[#1769ff] font-bold flex items-center justify-center shrink-0 text-sm shadow-2xs">
                              {s.display_name?.charAt(0)?.toUpperCase() || 'S'}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-[#0f1b35]">{s.display_name}</div>
                              {s.class_name && (
                                <div className="text-xs text-[#8c9eb9] mt-0.5">
                                  Class: {s.class_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Register Number */}
                        <td className="py-4 px-6 font-bold text-sm text-[#0f1b35]">
                          {regNo}
                        </td>

                        {/* Column 3: Section */}
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 bg-[#eef4ff] text-[#1769ff] font-bold rounded-md text-xs uppercase inline-block">
                            {studentSection}
                          </span>
                        </td>

                        {/* Column 4: Gmail ID */}
                        <td className="py-4 px-6 text-[#4b5563] text-xs">
                          <a
                            href={`mailto:${s.email}`}
                            className="hover:text-[#1769ff] hover:underline inline-flex items-center gap-2"
                          >
                            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{s.email}</span>
                          </a>
                        </td>

                        {/* Column 5: Action (Teachers Only) */}
                        {isTeacher && (
                          <td className="py-4 px-6 text-right">
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
                              className="px-3.5 py-2 bg-[#feecee] hover:bg-[#fedddf] text-[#ef4444] rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer min-h-[38px]"
                              title="Delete Student from Classroom"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-[#ef4444]" />
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

            {/* 2. Mobile Student Cards (Visible on < md) */}
            <div className="md:hidden divide-y divide-[#f1f5f9] p-3 sm:p-4 space-y-3">
              {filteredStudents.map((row) => {
                const s = row.student;
                const studentSection = s.section || classroom?.section || '—';
                const regNo = s.register_number || 'N/A';

                return (
                  <div
                    key={s.id}
                    className="bg-[#fafcff] rounded-xl border border-[#e1eaf5] p-3.5 sm:p-4 space-y-3 shadow-[0_1px_4px_rgba(0,0,0,0.02)]"
                  >
                    {/* Header: Avatar, Name, Section */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#eef4ff] text-[#1769ff] font-bold flex items-center justify-center shrink-0 text-sm shadow-2xs">
                          {s.display_name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-[#0f1b35] truncate">{s.display_name}</div>
                          {s.class_name && (
                            <div className="text-[11px] text-[#8c9eb9] truncate">
                              Class: {s.class_name}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-[#eef4ff] text-[#1769ff] font-bold rounded-md text-[11px] uppercase shrink-0">
                        Sec {studentSection}
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs pt-2 border-t border-[#f1f5f9]">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          Register Number
                        </div>
                        <div className="font-bold text-[#0f1b35] mt-0.5 truncate">{regNo}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          Gmail ID
                        </div>
                        <a
                          href={`mailto:${s.email}`}
                          className="text-[#1769ff] hover:underline inline-flex items-center gap-1.5 mt-0.5 truncate w-full"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{s.email}</span>
                        </a>
                      </div>
                    </div>

                    {/* Teacher Action */}
                    {isTeacher && (
                      <div className="pt-2 border-t border-[#f1f5f9]">
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
                          className="w-full min-h-[44px] px-3.5 py-2 bg-[#feecee] hover:bg-[#fedddf] text-[#ef4444] rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99]"
                        >
                          <Trash2 className="w-4 h-4 text-[#ef4444]" />
                          <span>Delete Student from Classroom</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Delete Student Confirmation Modal (Teachers Only) */}
      {isTeacher && studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-start gap-3.5">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#0f1b35]">
                  Confirm Student Removal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove this student from the classroom?
                </p>
              </div>
              <button
                onClick={() => setStudentToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-[#0f1b35]">{studentToDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Register Number:</span>
                  <span className="font-bold text-[#0f1b35]">{studentToDelete.registerNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gmail ID:</span>
                  <span className="font-mono text-slate-700">{studentToDelete.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Classroom:</span>
                  <span className="font-semibold text-[#0f1b35]">{classroom?.name} (Section {classroom?.section})</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                <strong className="text-slate-700">Data Protection Note:</strong> This will remove the student&apos;s membership from this classroom only. The student&apos;s user account, coding platform connections, and profile will not be deleted.
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                disabled={deleting}
                className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50 shadow-xs cursor-pointer"
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
