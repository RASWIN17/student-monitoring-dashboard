'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import {
  GraduationCap,
  Plus,
  Users,
  Building2,
  Calendar,
  Link2,
  Copy,
  Check,
  Trash2,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClassroomsPage() {
  const router = useRouter();
  const { classrooms, user, refreshClassrooms, setSelectedClassroom } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [batch, setBatch] = useState('');
  const [department, setDepartment] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [section, setSection] = useState('A');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  // Student Join Modal State
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch('/api/classrooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || 'Failed to join classroom');
        setJoining(false);
        return;
      }
      await refreshClassrooms();
      setIsJoinOpen(false);
      setJoinCode('');
      if (data.classroom?.id) {
        router.push(`/classrooms/${data.classroom.id}`);
      }
    } catch {
      setJoinError('Network error joining classroom');
    } finally {
      setJoining(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError(null);

    try {
      const res = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          course: course.trim() || 'N/A',
          batch: batch.trim(),
          department: department.trim(),
          academic_year: academicYear.trim(),
          section: section.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to create classroom');
        setCreating(false);
        return;
      }

      await refreshClassrooms();
      setIsCreateOpen(false);
      setName('');
      setCourse('');
      setBatch('');
      setDepartment('');
    } catch {
      setFormError('Network error');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleArchive = async (id: string, cName: string) => {
    if (!confirm(`Are you sure you want to delete classroom "${cName}"? Historical scan records will be preserved.`)) {
      return;
    }
    try {
      await fetch(`/api/classrooms/${id}`, { method: 'DELETE' });
      await refreshClassrooms();
    } catch {}
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header matching reference image */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#e6f0ff] border border-[#d4e4fe] flex items-center justify-center shadow-xs shrink-0">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-[#1769ff]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0f172a] tracking-tight truncate">
            Classroom
          </h1>
        </div>

        {isTeacher ? (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="min-h-[44px] px-5 py-2.5 bg-[#1769ff] hover:bg-[#0052cc] text-white text-sm font-bold rounded-xl shadow-[0_2px_10px_rgba(23,105,255,0.25)] flex items-center justify-center gap-2 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Classroom</span>
          </button>
        ) : (
          <button
            onClick={() => setIsJoinOpen(true)}
            className="min-h-[44px] px-5 py-2.5 bg-[#1769ff] hover:bg-[#0052cc] text-white text-sm font-bold rounded-xl shadow-[0_2px_10px_rgba(23,105,255,0.25)] flex items-center justify-center gap-2 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Join Classroom</span>
          </button>
        )}
      </div>

      {/* Classrooms Grid matching reference image (2 columns on desktop) */}
      {classrooms.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-[#dce6f5] p-12 text-center shadow-[0_2px_16px_rgba(30,64,175,0.04)]">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No classrooms created yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {isTeacher
              ? 'Click "New Classroom" to create a section and invite your students.'
              : 'You are not enrolled in any classrooms yet. Use a join code from your instructor.'}
          </p>
          {!isTeacher && (
            <button
              onClick={() => setIsJoinOpen(true)}
              className="mt-4 px-5 py-2.5 bg-[#1769ff] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Join a Classroom</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {classrooms.map((c) => {
            const count = c.enrolled_count ?? 0;
            return (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedClassroom(c);
                  router.push(`/classrooms/${c.id}`);
                }}
                className="clickable-card relative bg-white rounded-[22px] sm:rounded-[24px] border border-[#dce6f5] p-5 sm:p-7 shadow-[0_2px_16px_rgba(30,64,175,0.04)] overflow-hidden flex flex-col justify-between cursor-pointer group"
              >
                {/* Decorative curved shapes in the upper-right corner */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-[#edf4ff] via-[#f4f8fe]/60 to-transparent rounded-bl-[100px] pointer-events-none" />

                <div>
                  {/* Card Top Row: Section Badge & Red Delete Button */}
                  <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
                    <span className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#eaf2ff] text-[#1769ff] border border-[#d6e6fe]">
                      SECTION {c.section}
                    </span>

                    {isTeacher && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(c.id, c.name);
                        }}
                        className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 hover:text-red-600 border border-red-200/70 flex items-center justify-center transition cursor-pointer"
                        title="Delete Classroom"
                        aria-label="Delete Classroom"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>

                  {/* Classroom Title */}
                  <h3 className="text-2xl font-black text-[#0f172a] group-hover:text-[#1769ff] leading-tight tracking-tight transition-colors mb-2.5">
                    {c.name}
                  </h3>

                  {/* Metadata Row: Dept | Batch | Academic Year */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-[#64748b] font-medium mb-5">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#64748b] shrink-0" />
                      <span>
                        Dept: <span className="font-semibold text-[#334155]">{c.department || 'General'}</span>
                      </span>
                    </div>

                    <span className="text-[#cbd5e1] font-light">|</span>

                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#64748b] shrink-0" />
                      <span>
                        Batch: <span className="font-semibold text-[#334155]">{c.batch || 'N/A'}</span>
                      </span>
                    </div>

                    <span className="text-[#cbd5e1] font-light">|</span>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#64748b] shrink-0" />
                      <span className="font-semibold text-[#334155]">{c.academic_year || '2026-2027'}</span>
                    </div>
                  </div>

                  {/* Inset Join Code Box */}
                  <div
                    className="p-3.5 sm:p-4 rounded-2xl bg-[#f4f8fe] border border-[#dce8f8] flex items-center justify-between transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#e3efff] text-[#1769ff] flex items-center justify-center shrink-0">
                        <Link2 className="w-5 h-5 text-[#1769ff] stroke-[2.2]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">
                          JOIN CODE
                        </div>
                        <div className="text-base sm:text-lg font-black text-[#0f172a] font-mono tracking-wider truncate mt-0.5">
                          {c.join_code}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(c.join_code);
                      }}
                      className="w-9 h-9 rounded-xl bg-[#e3efff] hover:bg-[#d5e7fe] active:bg-[#c2dcfe] text-[#1769ff] flex items-center justify-center transition border border-[#cbe1fc] cursor-pointer shrink-0"
                      title="Copy Join Code"
                      aria-label="Copy Join Code"
                    >
                      {copiedCode === c.join_code ? (
                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                      ) : (
                        <Copy className="w-4 h-4 text-[#1769ff]" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  {/* Horizontal Divider */}
                  <div className="my-5 border-t border-[#eaf0fa]" />

                  {/* Bottom Action Area: Student Count & Open Classroom Button */}
                  <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 font-bold text-[#334155]">
                      <Users className="w-4 h-4 text-[#1769ff] stroke-[2.2]" />
                      <span>
                        {count} {count === 1 ? 'student' : 'students'}
                      </span>
                    </div>

                    <div
                      className="px-5 py-2.5 bg-[#1769ff] hover:bg-[#0052cc] text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_2px_10px_rgba(23,105,255,0.25)] flex items-center gap-2 transition"
                    >
                      <span>Open Classroom</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Classroom Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 sm:px-6 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
              <h3 className="text-base font-bold text-slate-900">Create New Classroom</h3>
              <p className="text-xs text-slate-500">
                Setup a classroom section to track student coding progress.
              </p>
            </div>

            <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Classroom Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Data Structures & Algorithms Lab"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2024-2028"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-2027"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer flex items-center justify-center rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="min-h-[44px] px-4 py-2 bg-[#1769ff] hover:bg-[#0052cc] text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center"
                >
                  {creating ? 'Creating...' : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Classroom Modal for Students */}
      {isJoinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 sm:px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Join Classroom</h3>
              <p className="text-xs text-slate-500">
                Enter the classroom join code provided by your instructor.
              </p>
            </div>

            <form onSubmit={handleJoin} className="p-5 sm:p-6 space-y-4">
              {joinError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                  {joinError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Classroom Join Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. CT-ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsJoinOpen(false)}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer flex items-center justify-center rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="min-h-[44px] px-4 py-2 bg-[#1769ff] hover:bg-[#0052cc] text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center"
                >
                  {joining ? 'Joining...' : 'Join Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
