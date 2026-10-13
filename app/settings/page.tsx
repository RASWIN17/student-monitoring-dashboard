'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
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
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Link forms
  const [lcUsername, setLcUsername] = useState('');
  const [ccUsername, setCcUsername] = useState('');
  const [linkingLc, setLinkingLc] = useState(false);
  const [linkingCc, setLinkingCc] = useState(false);
  const [errorLc, setErrorLc] = useState<string | null>(null);
  const [errorCc, setErrorCc] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAccounts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${user.id}/platforms`);
      if (res.ok) {
        const json = await res.json();
        setAccounts(json.accounts || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, [user]);

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
      await fetchAccounts();
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
      await fetchAccounts();
    } catch {}
  };

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

      {/* Account Info */}
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
