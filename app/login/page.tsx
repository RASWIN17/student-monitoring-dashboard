'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  AlertCircle,
  GraduationCap,
  Code2,
  CheckCircle2,
  Info,
} from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
    const noticeParam = searchParams.get('notice');
    if (noticeParam) {
      setNotice(decodeURIComponent(noticeParam));
    }
    const roleParam = searchParams.get('role');
    if (roleParam === 'teacher' || roleParam === 'student') {
      setSelectedRole(roleParam);
    }
  }, [searchParams]);

  // Requirement 3: Automatically redirect already authenticated users directly to their dashboard
  useEffect(() => {
    if (!authLoading && user) {
      const returnTo = searchParams.get('returnTo');
      if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') && returnTo !== '/login' && returnTo !== '/') {
        router.replace(returnTo);
      } else {
        const dest =
          user.role === 'teacher' || user.role === 'admin'
            ? '/students'
            : !user.profile_completed
            ? '/student/profile/create'
            : '/classrooms';
        router.replace(dest);
      }
    }
  }, [user, authLoading, router, searchParams]);

  const handleGoogleSignIn = async () => {
    if (!selectedRole) {
      setError('Please choose a role (Teacher or Student) before continuing.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Store the intended role in a secure cookie as fallback for strict OAuth redirect sanitizers
      document.cookie = `codetrack_intended_role=${selectedRole}; path=/; max-age=600; SameSite=Lax`;

      const supabase = createClient();
      const redirectOrigin = window.location.origin;

      // 2. Initiate Google OAuth with the intended role attached to the callback URL
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectOrigin}/api/auth/callback?intended_role=${selectedRole}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message || 'Failed to initiate Google sign-in');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Network connection failed during authentication');
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-sidebar-bg p-7 sm:p-8 text-center text-white">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600 font-bold text-xl mb-3 shadow-md">
            CT
          </div>
          <h1 className="text-xl font-bold tracking-tight">CodeTrack</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-Time Student Coding Activity Monitor
          </p>
        </div>
        <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
          <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">
            {user ? 'Redirecting to your dashboard...' : 'Checking authentication status...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transition-all">
      {/* Header */}
      <div className="bg-sidebar-bg p-7 sm:p-8 text-center text-white">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600 font-bold text-xl mb-3 shadow-md">
          CT
        </div>
        <h1 className="text-xl font-bold tracking-tight">CodeTrack</h1>
        <p className="text-xs text-slate-400 mt-1">
          Real-Time Student Coding Activity Monitor
        </p>
      </div>

      {/* Form Body */}
      <div className="p-6 sm:p-8">
        <div className="text-center sm:text-left mb-6">
          <h2 className="text-lg font-bold text-slate-900">Sign In to CodeTrack</h2>
          <p className="text-xs text-slate-500 mt-1">
            Select your account role to continue to your verified dashboard.
          </p>
        </div>

            {notice && (
              <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <span>{notice}</span>
              </div>
            )}

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Requirement 1: Role Selection UI Cards */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Your Role <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Teacher Card */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('teacher');
                    setError(null);
                  }}
                  className={`clickable-card relative p-4 rounded-xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedRole === 'teacher'
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 text-slate-700'
                  }`}
                  aria-pressed={selectedRole === 'teacher'}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
                          selectedRole === 'teacher'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <GraduationCap className="w-5 h-5" />
                      </div>

                      {selectedRole === 'teacher' ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Selected</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">Select</span>
                      )}
                    </div>

                    <div className="font-bold text-sm text-slate-900">Teacher</div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Manage classrooms, run scans, monitor student solve metrics & export reports.
                    </p>
                  </div>
                </button>

                {/* Student Card */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('student');
                    setError(null);
                  }}
                  className={`clickable-card relative p-4 rounded-xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedRole === 'student'
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 text-slate-700'
                  }`}
                  aria-pressed={selectedRole === 'student'}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
                          selectedRole === 'student'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Code2 className="w-5 h-5" />
                      </div>

                      {selectedRole === 'student' ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Selected</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">Select</span>
                      )}
                    </div>

                    <div className="font-bold text-sm text-slate-900">Student</div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Track your LeetCode & CodeChef progress, daily activity streak & join classes.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Google Sign-In Action */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || authLoading}
                className={`w-full py-3 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-3 transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selectedRole
                    ? 'bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-blue-500 text-slate-800 shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-400 hover:border-slate-300 cursor-pointer'
                } disabled:opacity-50`}
              >
                {/* Google SVG Logo */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>
                  {loading
                    ? 'Connecting to Google...'
                    : selectedRole === 'teacher'
                    ? 'Continue as Teacher with Google'
                    : selectedRole === 'student'
                    ? 'Continue as Student with Google'
                    : 'Continue with Google'}
                </span>
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Google OAuth authenticates your institutional or verified Google credentials securely.
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                Existing users will be routed to their registered role dashboard without losing access.
              </p>
            </div>
          </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <Suspense
        fallback={
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            Loading sign in...
          </div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
