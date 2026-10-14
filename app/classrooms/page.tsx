'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import {
  GraduationCap,
  Plus,
  Users,
  Clock,
  Layers,
  Copy,
  Check,
  Archive,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
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
          course: course.trim(),
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
    if (!confirm(`Are you sure you want to archive classroom "${cName}"? Historical scan records will be preserved.`)) {
      return;
    }
    try {
      await fetch(`/api/classrooms/${id}`, { method: 'DELETE' });
      await refreshClassrooms();
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <span>Classroom Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, manage sections, and distribute join codes for verified student monitoring.
          </p>
        </div>

        {isTeacher && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Classroom</span>
          </button>
        )}
      </div>

      {/* Classrooms Grid */}
      {classrooms.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No classrooms created yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {isTeacher
              ? 'Click "New Classroom" to create a section and invite your students.'
              : 'You are not enrolled in any classrooms yet. Use a join code from your instructor.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classrooms.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                setSelectedClassroom(c);
                router.push(`/classrooms/${c.id}`);
              }}
              className="bg-white rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md p-5 transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 group-hover:bg-blue-100 group-hover:border-blue-300 transition">
                    {c.course} • Sec {c.section}
                  </span>
                  {isTeacher && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(c.id, c.name);
                      }}
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                      title="Archive Classroom"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 leading-snug transition-colors">
                  {c.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Dept: {c.department} • Batch: {c.batch} • {c.academic_year}
                </p>

                {/* Join Code Box */}
                <div
                  className="mt-4 p-2.5 bg-slate-50 group-hover:bg-blue-50/40 border border-slate-200 group-hover:border-blue-200/80 rounded-lg flex items-center justify-between transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Join Code</div>
                    <div className="font-mono text-sm font-bold text-slate-800 tracking-wider">
                      {c.join_code}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(c.join_code);
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded transition"
                    title="Copy Join Code"
                  >
                    {copiedCode === c.join_code ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Bottom Meta & Action */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                  <Users className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span>{c.enrolled_count ?? 0} students</span>
                </div>

                <div className="px-3 py-1.5 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 rounded-lg font-semibold flex items-center gap-1 transition">
                  <span>Open Classroom</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Classroom Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Create New Classroom</h3>
              <p className="text-xs text-slate-500">
                Setup a course section to track student coding progress.
              </p>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CS301"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
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

              <div className="grid grid-cols-2 gap-3">
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
