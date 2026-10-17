'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { dataCache } from '@/components/DataCacheContext';
import { getCodeChefStars } from '@/components/ClassroomStudentDetailsView';
import { LeetCodeIcon, CodeChefIcon } from '@/components/PlatformIcons';
import { BackButton } from '@/components/BackButton';
import {
  Users,
  Code2,
  ChefHat,
  Trophy,
  Calendar,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Sparkles,
  Award,
} from 'lucide-react';

function StudentDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const studentId = params?.id as string;
  const platformParam = searchParams.get('platform') as 'leetcode' | 'codechef' | null;
  const classroomId = searchParams.get('classroomId');

  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const cacheKey = studentId ? `student:profile:${studentId}` : null;
  const [data, setData] = useState<any>(() => (cacheKey ? dataCache.get(cacheKey) : null));
  const [loading, setLoading] = useState(() => (cacheKey ? !dataCache.get(cacheKey) : true));

  // Individual Student Scan states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<{
    type: 'idle' | 'running' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  const fetchStudentData = async (force = false) => {
    if (!force && cacheKey && dataCache.get(cacheKey)) return;
    if (!cacheKey || !dataCache.get(cacheKey)) setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (cacheKey) dataCache.set(cacheKey, json);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (studentId && cacheKey) {
      const cached = dataCache.get(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
      } else {
        fetchStudentData();
      }
    }
  }, [studentId, cacheKey]);

  // Handle single student scan for specific platform or all
  const handleSingleScan = async (targetPlatform: 'all' | 'leetcode' | 'codechef') => {
    if (isScanning || !data?.student) return;
    setIsScanning(true);
    const platformLabel =
      targetPlatform === 'leetcode'
        ? 'LeetCode'
        : targetPlatform === 'codechef'
        ? 'CodeChef'
        : 'All Platforms';

    setScanStatus({
      type: 'running',
      message: `Initiating ${platformLabel} scan for ${data.student.display_name}...`,
    });

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStudentId: data.student.id,
          platform: targetPlatform,
          classroomId: classroomId || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setScanStatus({
          type: 'error',
          message: json.error || `Failed to start ${platformLabel} scan.`,
        });
        setIsScanning(false);
        return;
      }

      const jobId = json.job?.id;
      if (!jobId) {
        setScanStatus({
          type: 'success',
          message: `${platformLabel} scan completed.`,
        });
        await fetchStudentData(true);
        setIsScanning(false);
        return;
      }

      setScanStatus({
        type: 'running',
        message: `Scanning ${platformLabel} data from official sources...`,
      });

      // Poll scan job progress until finished
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/scan/${jobId}`);
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            const status = pollData.job?.status;

            if (status === 'succeeded' || status === 'partial') {
              clearInterval(pollInterval);
              setScanStatus({
                type: 'success',
                message: `${platformLabel} analytics refreshed successfully for ${data.student.display_name}!`,
              });
              await fetchStudentData(true);
              setIsScanning(false);
            } else if (status === 'failed') {
              clearInterval(pollInterval);
              setScanStatus({
                type: 'error',
                message: pollData.job?.error_summary || `${platformLabel} scan failed.`,
              });
              setIsScanning(false);
            }
          }
        } catch {
          clearInterval(pollInterval);
          setScanStatus({
            type: 'error',
            message: 'Network error occurred while waiting for scan results.',
          });
          setIsScanning(false);
        }
      }, 1500);
    } catch (err: any) {
      setScanStatus({
        type: 'error',
        message: err?.message || 'Error occurred while contacting scan service.',
      });
      setIsScanning(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        <span className="text-xs font-semibold">Loading verified student metrics...</span>
      </div>
    );
  }

  const { student, classrooms, leetcode, codechef } = data;
  const lcSnap = leetcode?.snapshot;
  const ccSnap = codechef?.snapshot;

  // Determine back navigation link based on context
  const filterParam = searchParams.get('filter');
  const backHref =
    classroomId && platformParam
      ? `/students/${platformParam}/progress?classroomId=${classroomId}${filterParam ? `&filter=${filterParam}` : ''}`
      : platformParam
      ? `/students/${platformParam}/progress${filterParam ? `&filter=${filterParam}` : ''}`
      : '/students';

  const backLabel =
    classroomId && platformParam
      ? `Back to ${platformParam === 'leetcode' ? 'LeetCode' : 'CodeChef'} Progress`
      : platformParam
      ? `Back to ${platformParam === 'leetcode' ? 'LeetCode' : 'CodeChef'} Classrooms`
      : 'Back to Students Roster';

  // Target platform for top Scan Now button
  const activeScanPlatform: 'leetcode' | 'codechef' | 'all' = platformParam || 'all';

  // Render LeetCode section JSX
  const renderLeetCodeSection = () => (
    <div key="leetcode-section" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-white border border-amber-200/80 rounded-lg shadow-2xs flex items-center justify-center">
            <LeetCodeIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">LeetCode Verified Performance</h2>
            <p className="text-xs text-slate-400">
              {lcSnap
                ? `Source: ${lcSnap.source} • Synced: ${new Date(lcSnap.observed_at).toLocaleString()}`
                : 'No LeetCode snapshot available'}
            </p>
          </div>
        </div>

        {isTeacher && (
          <button
            onClick={() => handleSingleScan('leetcode')}
            disabled={isScanning}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            title="Scan LeetCode only for this student"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Scan LeetCode</span>
          </button>
        )}
      </div>

      {!lcSnap ? (
        <div className="p-10 text-center text-slate-400 text-xs">
          No verified LeetCode data available for this student. Click &quot;Scan Now&quot; above to fetch stats.
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase">Total Solved</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{lcSnap.total_solved}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Easy: {lcSnap.easy_solved || 0} • Med: {lcSnap.medium_solved || 0} • Hard: {lcSnap.hard_solved || 0}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase">Contest Rating</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {lcSnap.contest_rating ? Number(lcSnap.contest_rating).toFixed(1) : 'Unrated'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Attended: {lcSnap.contests_attended || 0} contests
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase">Global Ranking</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {lcSnap.global_rank ? `#${lcSnap.global_rank.toLocaleString()}` : 'N/A'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Profile ranking</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase">Acceptance Rate</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {lcSnap.acceptance_rate ? `${lcSnap.acceptance_rate}%` : 'N/A'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {lcSnap.accepted_submissions || 0} / {lcSnap.total_submissions || 0} submissions
              </div>
            </div>
          </div>

          {/* Difficulty Breakdown Badges */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Problem Difficulty Breakdown
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                <span className="text-xs font-bold text-emerald-800">Easy</span>
                <span className="text-sm font-extrabold text-emerald-900">{lcSnap.easy_solved ?? 0}</span>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                <span className="text-xs font-bold text-amber-800">Medium</span>
                <span className="text-sm font-extrabold text-amber-900">{lcSnap.medium_solved ?? 0}</span>
              </div>
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                <span className="text-xs font-bold text-rose-800">Hard</span>
                <span className="text-sm font-extrabold text-rose-900">{lcSnap.hard_solved ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Contest History Table */}
          {leetcode.contests && leetcode.contests.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Recent Verified Contest History
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-black font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Contest Title</th>
                      <th className="py-2.5 px-3 text-center">Rank</th>
                      <th className="py-2.5 px-3 text-center">Solved</th>
                      <th className="py-2.5 px-3 text-center">Rating</th>
                      <th className="py-2.5 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leetcode.contests.map((c: any) => (
                      <tr key={c.id}>
                        <td className="py-2 px-3 font-medium text-slate-800">{c.contest_name}</td>
                        <td className="py-2 px-3 text-center font-mono">{c.rank ? `#${c.rank}` : '—'}</td>
                        <td className="py-2 px-3 text-center">
                          {c.problems_solved !== null ? `${c.problems_solved} / ${c.total_problems || 4}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">
                          {c.rating_after ? Math.round(c.rating_after) : '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          {new Date(c.contest_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Render CodeChef section JSX
  const renderCodeChefSection = () => (
    <div key="codechef-section" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-white border border-orange-200/80 rounded-lg shadow-2xs flex items-center justify-center">
            <CodeChefIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">CodeChef Verified Performance</h2>
            <p className="text-xs text-slate-400">
              {ccSnap
                ? `Source: ${ccSnap.source} • Synced: ${new Date(ccSnap.observed_at).toLocaleString()}`
                : 'No CodeChef snapshot available'}
            </p>
          </div>
        </div>

        {isTeacher && (
          <button
            onClick={() => handleSingleScan('codechef')}
            disabled={isScanning}
            className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            title="Scan CodeChef only for this student"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Scan CodeChef</span>
          </button>
        )}
      </div>

      {!ccSnap ? (
        <div className="p-10 text-center text-slate-400 text-xs">
          No verified CodeChef data available for this student. Click &quot;Scan Now&quot; above to fetch stats.
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase">Star Tier</div>
              <div className="text-2xl font-bold text-amber-900 mt-1">
                {getCodeChefStars(ccSnap.contest_rating ?? ccSnap.highest_rating)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Rating Tier</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase">Current Rating</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {ccSnap.contest_rating ? Math.round(ccSnap.contest_rating) : 'Unrated'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Highest: {ccSnap.highest_rating ? Math.round(ccSnap.highest_rating) : '—'}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase">Total Solved</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{ccSnap.total_solved}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Problems solved count</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 font-semibold uppercase">Global & Country Rank</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {ccSnap.global_rank ? `#${ccSnap.global_rank.toLocaleString()}` : 'Inactive'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Country: {ccSnap.country_rank ? `#${ccSnap.country_rank.toLocaleString()}` : 'Inactive'}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 col-span-2 md:col-span-1">
              <div className="text-xs text-slate-500 font-semibold uppercase">Contests Attended</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{ccSnap.contests_attended || 0}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Retrieved history</div>
            </div>
          </div>

          {/* Difficulty breakdown if available */}
          {(ccSnap.easy_solved != null || ccSnap.medium_solved != null || ccSnap.hard_solved != null) && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Problem Difficulty Breakdown
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                  <span className="text-xs font-bold text-emerald-800">Easy</span>
                  <span className="text-sm font-extrabold text-emerald-900">{ccSnap.easy_solved ?? 0}</span>
                </div>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                  <span className="text-xs font-bold text-amber-800">Medium</span>
                  <span className="text-sm font-extrabold text-amber-900">{ccSnap.medium_solved ?? 0}</span>
                </div>
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                  <span className="text-xs font-bold text-rose-800">Hard</span>
                  <span className="text-sm font-extrabold text-rose-900">{ccSnap.hard_solved ?? 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Contest History Table */}
          {codechef.contests && codechef.contests.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Recent Verified CodeChef Contests
              </h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-black font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Contest Name</th>
                      <th className="py-2.5 px-3 text-center">Rank</th>
                      <th className="py-2.5 px-3 text-center">Rating</th>
                      <th className="py-2.5 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {codechef.contests.map((c: any) => (
                      <tr key={c.id}>
                        <td className="py-2 px-3 font-medium text-slate-800">{c.contest_name}</td>
                        <td className="py-2 px-3 text-center font-mono">{c.rank ? `#${c.rank}` : '—'}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">
                          {c.rating_after ? Math.round(c.rating_after) : '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          {new Date(c.contest_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Bar with Context-Aware Back Link & Individual Scan Now Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <BackButton fallbackHref={backHref} />

        {isTeacher && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSingleScan(activeScanPlatform)}
              disabled={isScanning}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs flex items-center gap-2 transition disabled:opacity-50 ${
                activeScanPlatform === 'codechef'
                  ? 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800'
                  : activeScanPlatform === 'leetcode'
                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>
                {isScanning
                  ? `Scanning ${activeScanPlatform === 'codechef' ? 'CodeChef' : activeScanPlatform === 'leetcode' ? 'LeetCode' : ''}...`
                  : 'Scan Now'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Real-time Scan Status Banner */}
      {scanStatus.type !== 'idle' && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition ${
            scanStatus.type === 'running'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : scanStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {scanStatus.type === 'running' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
            {scanStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {scanStatus.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span className="font-semibold">{scanStatus.message}</span>
          </div>

          {scanStatus.type !== 'running' && (
            <button
              onClick={() => setScanStatus({ type: 'idle', message: '' })}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Student Identity Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xl">
              {student.display_name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{student.display_name}</h1>
                {student.register_number && (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Reg No: {student.register_number}
                  </span>
                )}
                {student.section && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Section {student.section}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-500 font-mono mt-0.5">{student.email}</div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {classrooms?.map((c: any) => (
                  <span
                    key={c.id}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    {c.name} (Sec {c.section})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 text-xs">
            {/* LeetCode Account Status */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[10px] uppercase font-bold text-slate-400">LeetCode Profile</div>
              {leetcode?.account ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-slate-800">{leetcode.account.username}</span>
                  <a
                    href={leetcode.account.public_profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-blue-600"
                    title="Open public profile"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="text-slate-400 italic mt-0.5">Not connected</div>
              )}
            </div>

            {/* CodeChef Account Status */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[10px] uppercase font-bold text-slate-400">CodeChef Profile</div>
              {codechef?.account ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-slate-800">{codechef.account.username}</span>
                  <a
                    href={codechef.account.public_profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-blue-600"
                    title="Open public profile"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="text-slate-400 italic mt-0.5">Not connected</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Sections: prioritize selected platform if user arrived from CodeChef/LeetCode */}
      {platformParam === 'codechef' ? (
        <>
          {renderCodeChefSection()}
          {renderLeetCodeSection()}
        </>
      ) : (
        <>
          {renderLeetCodeSection()}
          {renderCodeChefSection()}
        </>
      )}
    </div>
  );
}

export default function StudentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <span className="text-xs font-semibold">Loading student analytics...</span>
        </div>
      }
    >
      <StudentDetailContent />
    </Suspense>
  );
}
