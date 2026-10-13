'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import {
  Terminal,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Code2,
  ChefHat,
  Search,
} from 'lucide-react';

export default function TestConnectorsPage() {
  const { user } = useAuth();
  const [platform, setPlatform] = useState<'leetcode' | 'codechef'>('leetcode');
  const [username, setUsername] = useState('neal_wu');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  if (user && !isTeacher) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-xl border border-red-200 p-8 text-center shadow-xs">
        <div className="h-12 w-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-500 mb-6">
          Diagnostic connector verification consoles are restricted to teachers and administrators.
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

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/test-connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          username: username.trim(),
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e?.message || 'Network request failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-600" />
          <span>Connector Live Verification Console (Phase 1)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Execute isolated live scraper tests against real public LeetCode and CodeChef handles to inspect raw schemas and available vs missing fields.
        </p>
      </div>

      {/* Input Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <form onSubmit={handleTest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Platform
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlatform('leetcode');
                    if (username === 'tourist') setUsername('neal_wu');
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition flex items-center justify-center gap-1.5 ${
                    platform === 'leetcode'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>LeetCode</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlatform('codechef');
                    if (username === 'neal_wu') setUsername('tourist');
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition flex items-center justify-center gap-1.5 ${
                    platform === 'codechef'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>CodeChef</span>
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Public Username Handle
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. tourist, neal_wu, lee215"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{loading ? 'Testing...' : 'Test Connector'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Output Results */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {result.extraction?.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span>Live Test Outcome for @{result.username}</span>
            </h3>

            <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded">
              Status: {result.extraction?.success ? 'HTTP 200 OK' : result.extraction?.errorCode || 'FAILED'}
            </span>
          </div>

          {result.error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{result.error}</span>
            </div>
          )}

          {result.extraction && (
            <div className="space-y-4">
              {/* Field Availability Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                    Available Verified Fields ({result.extraction.availableFields?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.extraction.availableFields?.map((f: string) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 bg-white text-emerald-700 border border-emerald-300 rounded text-[11px] font-mono"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg">
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                    Unavailable / Unsupported Fields ({result.extraction.unavailableFields?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.extraction.unavailableFields?.map((f: string) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 bg-white text-amber-700 border border-amber-300 rounded text-[11px] font-mono"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* JSON Inspector */}
              <div>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Extracted Normalized Payload
                </div>
                <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto max-h-96">
                  {JSON.stringify(result.extraction.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
