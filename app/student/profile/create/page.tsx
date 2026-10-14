'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import {
  User,
  GraduationCap,
  Hash,
  BookOpen,
  Layers,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function CreateStudentProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();

  const [name, setName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-populate initial values from authenticated user
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }
      if (user.role === 'teacher' || user.role === 'admin') {
        router.replace('/students');
        return;
      }
      // If student already completed their profile, redirect directly to dashboard
      if (user.profile_completed) {
        router.replace('/student/dashboard');
        return;
      }

      if (user.display_name && !name) {
        setName(user.display_name);
      }
    }
  }, [user, authLoading, router, name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    const trimmedName = name.trim();
    const trimmedReg = registerNumber.trim();
    const trimmedClass = className.trim();
    const trimmedSection = section.trim();

    if (!trimmedName) {
      setError('Student Name is required.');
      return;
    }
    if (!trimmedReg) {
      setError('Register Number is required.');
      return;
    }
    if (!trimmedClass) {
      setError('Class is required.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/students/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          register_number: trimmedReg,
          class_name: trimmedClass,
          section: trimmedSection || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create student profile.');
        setSubmitting(false);
        return;
      }

      setSuccess('Profile created successfully! Redirecting to your dashboard...');
      await refreshUser();

      setTimeout(() => {
        router.replace('/student/dashboard');
      }, 1000);
    } catch {
      setError('A network error occurred. Please check your connection and try again.');
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm font-medium text-slate-500">Loading your account...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-100">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-sidebar-bg p-6 sm:p-8 text-center text-white">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600 font-bold text-xl mb-3 shadow-md">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Complete Your Student Profile</h1>
          <p className="text-xs text-slate-400 mt-1">
            Please provide your academic registration details to access your Student Dashboard.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Student Name */}
            <div>
              <label htmlFor="student-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Student Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="student-name"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              </div>
            </div>

            {/* Register Number */}
            <div>
              <label htmlFor="student-reg" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Register Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="student-reg"
                  type="text"
                  placeholder="e.g. 2026CS1042"
                  value={registerNumber}
                  onChange={(e) => setRegisterNumber(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono uppercase"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Your unique institutional registration or roll number. Must be unique.
              </p>
            </div>

            {/* Class & Section Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Class */}
              <div>
                <label htmlFor="student-class" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Class <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="student-class"
                    type="text"
                    placeholder="e.g. CS301 or B.Tech CSE"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    disabled={submitting}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                  />
                </div>
              </div>

              {/* Section */}
              <div>
                <label htmlFor="student-section" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Section <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="student-section"
                    type="text"
                    placeholder="e.g. A"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    disabled={submitting}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Gmail ID (Read-Only) */}
            <div>
              <label htmlFor="student-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Gmail ID <span className="text-slate-400 font-normal">(Authenticated Google Account)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="student-email"
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  disabled
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-mono select-all cursor-not-allowed"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Linked automatically to your authenticated Google account. Cannot be modified.
              </p>
            </div>

            {/* Create Profile Button */}
            <div className="pt-3">
              <button
                type="submit"
                id="create-profile-button"
                disabled={submitting}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Create Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              You will be able to edit your profile information anytime later from your Settings page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
