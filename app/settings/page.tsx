'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { dataCache } from '@/components/DataCacheContext';
import { LeetCodeIcon, CodeChefIcon } from '@/components/PlatformIcons';
import {
  Settings,
  Shield,
  Trash2,
  User,
  Mail,
  GraduationCap,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Save,
  X,
  Link2,
  Unlink,
  ExternalLink,
  BookOpen,
  Hash,
  Layers,
  Lock,
  RefreshCw,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const cacheKey = user ? `settings:accounts:${user.id}` : null;
  const [accounts, setAccounts] = useState<any[]>(() => cacheKey ? dataCache.get<any[]>(cacheKey) || [] : []);
  const [loading, setLoading] = useState(() => cacheKey ? !dataCache.get<any[]>(cacheKey) : true);

  // Student Profile Edit State
  const [profileName, setProfileName] = useState(user?.display_name || '');
  const [profileReg, setProfileReg] = useState(user?.register_number || '');
  const [profileClass, setProfileClass] = useState(user?.class_name || '');
  const [profileSection, setProfileSection] = useState(user?.section || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileName(user.display_name || '');
      setProfileReg(user.register_number || '');
      setProfileClass(user.class_name || '');
      setProfileSection(user.section || '');
    }
  }, [user]);

  // Link forms
  const [lcUsername, setLcUsername] = useState('');
  const [ccUsername, setCcUsername] = useState('');
  const [linkingLc, setLinkingLc] = useState(false);
  const [linkingCc, setLinkingCc] = useState(false);
  const [errorLc, setErrorLc] = useState<string | null>(null);
  const [errorCc, setErrorCc] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Delete Account State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchAccounts = async (force = false) => {
    if (!user || user.role !== 'student') return;
    if (!force && cacheKey && dataCache.get(cacheKey)) return;
    if (!cacheKey || !dataCache.get(cacheKey)) setLoading(true);
    try {
      const res = await fetch(`/api/students/${user.id}/platforms`);
      if (res.ok) {
        const json = await res.json();
        const loaded = json.accounts || [];
        setAccounts(loaded);
        if (cacheKey) dataCache.set(cacheKey, loaded);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (user && user.role === 'student' && cacheKey) {
      const cached = dataCache.get<any[]>(cacheKey);
      if (cached) {
        setAccounts(cached);
        setLoading(false);
      } else {
        fetchAccounts();
      }
    } else {
      setLoading(false);
    }
  }, [user, cacheKey]);

  const lcAccount = accounts.find((a) => a.platform === 'leetcode');
  const ccAccount = accounts.find((a) => a.platform === 'codechef');

  const handleLink = async (platform: 'leetcode' | 'codechef', username: string) => {
    if (!user) return;
    if (platform === 'leetcode') {
      setLinkingLc(true);
      setErrorLc(null);
    } else {
      setLinkingCc(true);
      setErrorCc(null);
    }
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/students/${user.id}/platforms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, username: username.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (platform === 'leetcode') setErrorLc(json.error || 'Validation failed');
        else setErrorCc(json.error || 'Validation failed');
        return;
      }

      setSuccessMsg(`Successfully linked ${platform === 'leetcode' ? 'LeetCode' : 'CodeChef'} handle @${json.account.username}`);
      dataCache.invalidate(`student:dashboard:${user.id}`);
      await fetchAccounts(true);
      if (platform === 'leetcode') setLcUsername('');
      else setCcUsername('');
    } catch {
      if (platform === 'leetcode') setErrorLc('Network error validating handle');
      else setErrorCc('Network error validating handle');
    } finally {
      if (platform === 'leetcode') setLinkingLc(false);
      else setLinkingCc(false);
    }
  };

  const handleUnlink = async (platform: 'leetcode' | 'codechef') => {
    if (!user) return;
    if (!confirm(`Are you sure you want to disconnect your ${platform} handle?`)) return;

    try {
      await fetch(`/api/students/${user.id}/platforms`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      dataCache.invalidate(`student:dashboard:${user.id}`);
      await fetchAccounts(true);
    } catch {}
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setProfileError('Student Name is required');
      return;
    }
    if (!profileReg.trim()) {
      setProfileError('Register Number is required');
      return;
    }
    if (!profileClass.trim()) {
      setProfileError('Class is required');
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await fetch('/api/students/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName.trim(),
          register_number: profileReg.trim(),
          class_name: profileClass.trim(),
          section: profileSection.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || 'Failed to update profile');
        setSavingProfile(false);
        return;
      }

      setProfileSuccess('Profile updated successfully!');
      if (user) {
        dataCache.invalidate(`student:dashboard:${user.id}`);
        dataCache.invalidate(`student:leetcode:${user.id}`);
        dataCache.invalidate(`student:codechef:${user.id}`);
      }
      await refreshUser();
    } catch {
      setProfileError('Network error updating profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelProfile = () => {
    if (user) {
      setProfileName(user.display_name || '');
      setProfileReg(user.register_number || '');
      setProfileClass(user.class_name || '');
      setProfileSection(user.section || '');
      setProfileError(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput.trim() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account deletion.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete account');
        setIsDeleting(false);
        return;
      }

      try {
        const { dataCache } = await import('@/components/DataCacheContext');
        dataCache.invalidate();
      } catch {}

      window.location.href = `/login?notice=${encodeURIComponent(
        'Your account and all associated personal data have been permanently deleted.'
      )}`;
    } catch {
      setDeleteError('Network error connecting to deletion service. Please try again.');
      setIsDeleting(false);
    }
  };

  const isStudent = user?.role === 'student';

  const roleDisplay = user?.role
    ? user.role === 'teacher'
      ? 'Teacher'
      : user.role === 'admin'
      ? 'Admin'
      : 'Student'
    : '—';

  return (
    <div className="space-y-6 sm:space-y-7 w-full">
      {/* 1. Page Header */}
      <div className="flex items-center gap-3.5 sm:gap-4">
        <div className="w-12 h-12 rounded-[14px] bg-[#EEF4FF] border border-[#DCE7F9]/80 flex items-center justify-center shrink-0 shadow-2xs">
          <Settings className="w-6 h-6 text-[#1677FF] stroke-[2]" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Profile &amp; Platform Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your account profile and connect your public coding handles.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {profileSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{profileSuccess}</span>
        </div>
      )}

      {profileError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{profileError}</span>
        </div>
      )}

      {/* 2. Account Details Card */}
      <div className="bg-white rounded-2xl border border-[#DCE7F9] p-6 sm:p-7 relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        {/* Soft tinted top-right decorative accent matching reference */}
        <div
          className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-[#EFF5FF] pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10">
          {/* Card Header */}
          <div className="flex items-center gap-3.5 mb-7 sm:mb-8">
            <div className="w-12 h-12 rounded-[14px] bg-[#EEF4FF] flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-[#2563EB] stroke-[2]" />
            </div>
            <h2 className="text-slate-900 font-bold text-base sm:text-[17px] tracking-tight">
              Account Details
            </h2>
          </div>

          {/* Three Evenly Distributed Horizontal Columns */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4 pt-1">
            {/* Column 1: Full Name */}
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-[12px] bg-[#EEF4FF] flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-[#2563EB] stroke-[2]" />
              </div>
              <div className="min-w-0">
                <div className="text-slate-400 text-xs font-normal">Full Name</div>
                <div className="text-slate-900 font-semibold text-sm mt-0.5 truncate">
                  {user?.display_name || '—'}
                </div>
              </div>
            </div>

            {/* Divider 1 */}
            <div className="hidden md:block w-px h-10 bg-slate-200/80 shrink-0" aria-hidden="true" />

            {/* Column 2: Email Address */}
            <div className="flex items-center gap-3.5 flex-1 min-w-0 md:pl-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#EEF4FF] flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-[#2563EB] stroke-[2]" />
              </div>
              <div className="min-w-0">
                <div className="text-slate-400 text-xs font-normal">Email Address</div>
                <div className="text-slate-900 font-semibold text-sm mt-0.5 truncate font-mono">
                  {user?.email || '—'}
                </div>
              </div>
            </div>

            {/* Divider 2 */}
            <div className="hidden md:block w-px h-10 bg-slate-200/80 shrink-0" aria-hidden="true" />

            {/* Column 3: System Role */}
            <div className="flex items-center gap-3.5 flex-1 min-w-0 md:pl-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#EEF4FF] flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-[#2563EB] stroke-[2]" />
              </div>
              <div className="min-w-0">
                <div className="text-slate-400 text-xs font-normal">System Role</div>
                <div className="text-slate-900 font-semibold text-sm capitalize mt-0.5">
                  {roleDisplay}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Student Profile & Academic Details Form (Preserved for Student Role) */}
      {isStudent && (
        <div className="bg-white rounded-2xl border border-[#DCE7F9] p-6 sm:p-7 relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
            <div className="w-11 h-11 rounded-[12px] bg-[#EEF4FF] flex items-center justify-center shrink-0 text-[#2563EB]">
              <GraduationCap className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Student Profile &amp; Academic Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                View and edit your registered student details. Changes are immediately reflected in your classrooms.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Student Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    disabled={savingProfile}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    placeholder="Full Name"
                    required
                  />
                </div>
              </div>

              {/* Register Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Register Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={profileReg}
                    onChange={(e) => setProfileReg(e.target.value)}
                    disabled={savingProfile}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono uppercase transition"
                    placeholder="Registration / Roll No."
                    required
                  />
                </div>
              </div>

              {/* Class */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Class <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={profileClass}
                    onChange={(e) => setProfileClass(e.target.value)}
                    disabled={savingProfile}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    placeholder="e.g. CS301 or B.Tech CSE"
                    required
                  />
                </div>
              </div>

              {/* Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Section <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={profileSection}
                    onChange={(e) => setProfileSection(e.target.value)}
                    disabled={savingProfile}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase transition"
                    placeholder="e.g. A"
                  />
                </div>
              </div>
            </div>

            {/* Gmail ID (Read-Only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Authenticated Gmail ID <span className="text-slate-400 font-normal">(Read-Only)</span>
              </label>
              <div className="relative max-w-md">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  disabled
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono select-all cursor-not-allowed"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Linked to your authenticated Google account and cannot be modified.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingProfile ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>

              <button
                type="button"
                onClick={handleCancelProfile}
                disabled={savingProfile}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Connected Coding Handles Section (Preserved for Student Role) */}
      {isStudent && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Connected Coding Handles</h2>
          </div>

          {/* LeetCode Card */}
          <div className="bg-white rounded-2xl border border-[#DCE7F9] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1.5 shrink-0">
                  <LeetCodeIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">LeetCode Public Profile</h3>
                  <p className="text-xs text-slate-400">
                    Connect your public profile username to enable problem solving and contest tracking.
                  </p>
                </div>
              </div>

              {lcAccount && (
                <button
                  onClick={() => handleUnlink('leetcode')}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>

            {lcAccount ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-mono font-bold text-slate-800">@{lcAccount.username}</span>
                  <span className="text-[11px] text-slate-400">
                    (Linked Public Profile • Status: {lcAccount.account_status})
                  </span>
                </div>
                <a
                  href={lcAccount.public_profile_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>View Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {errorLc && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorLc}</span>
                  </div>
                )}
                <div className="flex flex-col xs:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="LeetCode username (e.g. neal_wu, lee215)"
                    value={lcUsername}
                    onChange={(e) => setLcUsername(e.target.value)}
                    className="flex-1 min-h-[44px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleLink('leetcode', lcUsername)}
                    disabled={linkingLc || !lcUsername.trim()}
                    className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{linkingLc ? 'Validating...' : 'Connect Handle'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CodeChef Card */}
          <div className="bg-white rounded-2xl border border-[#DCE7F9] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1.5 shrink-0">
                  <CodeChefIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">CodeChef Public Profile</h3>
                  <p className="text-xs text-slate-400">
                    Connect your public profile username to track ratings and contest history.
                  </p>
                </div>
              </div>

              {ccAccount && (
                <button
                  onClick={() => handleUnlink('codechef')}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>

            {ccAccount ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-mono font-bold text-slate-800">@{ccAccount.username}</span>
                  <span className="text-[11px] text-slate-400">
                    (Linked Public Profile • Status: {ccAccount.account_status})
                  </span>
                </div>
                <a
                  href={ccAccount.public_profile_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>View Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {errorCc && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorCc}</span>
                  </div>
                )}
                <div className="flex flex-col xs:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="CodeChef username (e.g. tourist, kostka)"
                    value={ccUsername}
                    onChange={(e) => setCcUsername(e.target.value)}
                    className="flex-1 min-h-[44px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleLink('codechef', ccUsername)}
                    disabled={linkingCc || !ccUsername.trim()}
                    className="min-h-[44px] px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{linkingCc ? 'Validating...' : 'Connect Handle'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Public Profile Privacy Notice Card */}
      <div className="p-5 sm:p-6 bg-[#F0F6FF] border border-[#DCE7F9] rounded-2xl relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-[14px] bg-[#E0ECFD] border border-[#C8DCFB]/80 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-[#1677FF] stroke-[2]" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
              Public Profile Privacy Notice:
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-600 mt-1 leading-relaxed">
              CodeTrack only extracts publicly available profile metrics and contest records via public platform endpoints. We never request passwords, private tokens, or platform login credentials. Linking a public handle associates public stats with your classroom profile.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Delete Account Section Card */}
      <div className="p-5 sm:p-6 bg-[#FFF4F4] border border-[#FDD5CD] rounded-2xl relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        {/* Soft warm pink circular accent in bottom-right */}
        <div
          className="absolute -bottom-14 -right-14 w-48 h-48 rounded-full bg-[#FFE6E6]/60 pointer-events-none"
          aria-hidden="true"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-[14px] bg-[#FFE7E7] border border-[#FDC8C8]/80 flex items-center justify-center shrink-0">
              <Trash2 className="w-6 h-6 text-[#DC2626] stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-[#991B1B] text-base tracking-tight">
                Delete Account
              </h3>
              <p className="text-xs sm:text-[13px] text-red-600/90 mt-1 leading-relaxed max-w-2xl">
                Permanently delete your CodeTrack account, personal profile, linked coding platform records, and history.
                <br className="hidden sm:inline" />
                {' '}This action cannot be reversed.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsDeleteModalOpen(true);
              setDeleteConfirmInput('');
              setDeleteError(null);
            }}
            className="py-3 px-5 sm:px-6 bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white rounded-xl text-xs sm:text-sm font-semibold transition duration-150 active:scale-[0.99] shadow-xs cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <Trash2 className="w-4 h-4 stroke-[2.2]" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* 7. Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-200 p-5 sm:p-6 space-y-4 sm:space-y-5 animate-in fade-in duration-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">Permanently Delete Account?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  This action is permanent and immediate. All data associated with your account will be deleted:
                </p>
              </div>
            </div>

            {/* What gets deleted list */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span>User profile, name, email, register number, and settings</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span>LeetCode &amp; CodeChef profile links, cached stats, and daily activity</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 font-bold">•</span>
                <span>Classroom memberships and individual contest attendance history</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400 font-bold">•</span>
                <span className="text-slate-500 text-[11px]">
                  Institutional records and audit logs are retained with personal identifiers removed.
                </span>
              </div>
              {user?.role === 'teacher' && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-amber-700 font-medium text-[11px]">
                  ⚠️ Teachers with active classrooms containing enrolled students cannot delete their account until classroom ownership is transferred.
                </div>
              )}
            </div>

            {/* Error display */}
            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{deleteError}</span>
              </div>
            )}

            {/* Confirmation typing prompt */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                To confirm, type <span className="font-mono font-bold text-red-600">DELETE</span> in the box below:
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="Type DELETE"
                disabled={isDeleting}
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse xs:flex-row items-stretch xs:items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (!isDeleting) {
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmInput('');
                    setDeleteError(null);
                  }
                }}
                disabled={isDeleting}
                className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmInput.trim() !== 'DELETE'}
                className="min-h-[44px] px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete My Account</span>
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
