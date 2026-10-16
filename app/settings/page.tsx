'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { dataCache } from '@/components/DataCacheContext';
import {
  Settings,
  Code2,
  ChefHat,
  Link2,
  Unlink,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ExternalLink,
  RefreshCw,
  User,
  Hash,
  BookOpen,
  Layers,
  Mail,
  Lock,
  AlertCircle,
  Save,
  X,
  GraduationCap,
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

  const fetchAccounts = async (force = false) => {
    if (!user) return;
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
    if (user && cacheKey) {
      const cached = dataCache.get<any[]>(cacheKey);
      if (cached) {
        setAccounts(cached);
        setLoading(false);
      } else {
        fetchAccounts();
      }
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

  const isStudent = user?.role === 'student';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <span>Profile & Platform Settings</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your account profile and connect your public coding handles.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {profileSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{profileSuccess}</span>
        </div>
      )}

      {profileError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{profileError}</span>
        </div>
      )}

      {/* Student Profile Management Section */}
      {isStudent ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Student Profile & Academic Details</h2>
              <p className="text-xs text-slate-500">
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
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
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
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
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
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-mono select-all cursor-not-allowed"
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingProfile ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>

              <button
                type="button"
                onClick={handleCancelProfile}
                disabled={savingProfile}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Teacher / Admin Account Info */
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Account Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-slate-400">Full Name</div>
              <div className="font-semibold text-slate-800 mt-0.5">{user?.display_name}</div>
            </div>
            <div>
              <div className="text-slate-400">Email Address</div>
              <div className="font-semibold text-slate-800 mt-0.5 font-mono">{user?.email}</div>
            </div>
            <div>
              <div className="text-slate-400">System Role</div>
              <div className="font-semibold text-slate-800 capitalize mt-0.5">{user?.role}</div>
            </div>
          </div>
        </div>
      )}

      {/* Connected Handles Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Connected Coding Handles</h2>

        {/* LeetCode Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                <Code2 className="w-5 h-5" />
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
                className="px-3 py-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            )}
          </div>

          {lcAccount ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
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
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>View Profile</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {errorLc && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorLc}</span>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="LeetCode username (e.g. neal_wu, lee215)"
                  value={lcUsername}
                  onChange={(e) => setLcUsername(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleLink('leetcode', lcUsername)}
                  disabled={linkingLc || !lcUsername.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>{linkingLc ? 'Validating...' : 'Connect Handle'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CodeChef Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg">
                <ChefHat className="w-5 h-5" />
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
                className="px-3 py-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            )}
          </div>

          {ccAccount ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
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
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>View Profile</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {errorCc && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorCc}</span>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="CodeChef username (e.g. tourist, kostka)"
                  value={ccUsername}
                  onChange={(e) => setCcUsername(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleLink('codechef', ccUsername)}
                  disabled={linkingCc || !ccUsername.trim()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>{linkingCc ? 'Validating...' : 'Connect Handle'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Notice */}
      <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800">Public Profile Privacy Notice:</span>
          <p className="mt-0.5">
            CodeTrack only extracts publicly available profile metrics and contest records via public platform endpoints. We never request passwords, private tokens, or platform login credentials. Linking a public handle associates public stats with your classroom profile.
          </p>
        </div>
      </div>
    </div>
  );
}
