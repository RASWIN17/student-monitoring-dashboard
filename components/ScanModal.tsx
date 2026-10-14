'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { ScanJob, ScanJobItem } from '@/lib/types';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, Play, X } from 'lucide-react';

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanCompleted?: () => void;
  classroomId?: string;
  initialPlatform?: 'all' | 'leetcode' | 'codechef';
  targetStudentId?: string;
  targetStudentName?: string;
}

export function ScanModal({
  isOpen,
  onClose,
  onScanCompleted,
  classroomId,
  initialPlatform,
  targetStudentId,
  targetStudentName,
}: ScanModalProps) {
  const { selectedClassroom, user } = useAuth();
  const [platform, setPlatform] = useState<'all' | 'leetcode' | 'codechef'>(initialPlatform || 'all');
  const [activeJob, setActiveJob] = useState<ScanJob | null>(null);
  const [jobItems, setJobItems] = useState<(ScanJobItem & { username: string; studentName: string })[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const reloadTriggeredRef = useRef(false);
  const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerPageRefresh = () => {
    if (reloadTriggeredRef.current) return;
    reloadTriggeredRef.current = true;
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    window.location.reload();
  };

  const handleClose = () => {
    if (activeJob?.status === 'running') return;
    if (isCompleted) {
      triggerPageRefresh();
      return;
    }
    onClose();
  };

  // Reset states when modal is opened or closed
  useEffect(() => {
    if (!isOpen) {
      setActiveJob(null);
      setJobItems([]);
      setErrorMessage(null);
      setIsCompleted(false);
      reloadTriggeredRef.current = false;
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    }
  }, [isOpen]);

  // Poll scan progress if activeJob is running or queued
  useEffect(() => {
    let interval: any = null;
    if (activeJob && (activeJob.status === 'queued' || activeJob.status === 'running')) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/scan/${activeJob.id}`);
          if (res.ok) {
            const data = await res.json();
            setActiveJob(data.job);
            setJobItems(data.items || []);
            if (data.job.status === 'succeeded' || data.job.status === 'partial' || data.job.status === 'failed') {
              clearInterval(interval);
              setIsCompleted(true);
              if (onScanCompleted) onScanCompleted();

              // Automatically refresh the website once to show updated data
              if (!reloadTriggeredRef.current) {
                reloadTimerRef.current = setTimeout(() => {
                  triggerPageRefresh();
                }, 1500);
              }
            }
          }
        } catch {}
      }, 1500);
    }
    return () => {
      clearInterval(interval);
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, [activeJob, onScanCompleted]);

  if (!isOpen) return null;

  const handleStartScan = async () => {
    setIsStarting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: classroomId || selectedClassroom?.id,
          targetStudentId: targetStudentId || undefined,
          platform,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to start scan');
        setIsStarting(false);
        return;
      }

      setActiveJob(data.job);
      setIsStarting(false);
    } catch (e: any) {
      setErrorMessage(e?.message || 'Network error');
      setIsStarting(false);
    }
  };

  const progressPercent = activeJob && activeJob.total_accounts > 0
    ? Math.round((activeJob.processed_accounts / activeJob.total_accounts) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg transition-colors ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <RefreshCw
                  className={`w-5 h-5 ${
                    activeJob?.status === 'running' ? 'animate-spin' : ''
                  }`}
                />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                {isCompleted
                  ? 'Scan Completed'
                  : activeJob
                  ? 'Scanning In Progress'
                  : 'Initiate Platform Scan'}
              </h3>
              <p className="text-xs text-slate-500">
                {targetStudentName
                  ? `Scanning single student: ${targetStudentName}`
                  : `Classroom: ${selectedClassroom?.name || 'All Enrolled'}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={activeJob?.status === 'running'}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-40 p-1 rounded-md"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Automatic Refresh Banner when scan completes */}
          {isCompleted && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  Scan complete! Automatically refreshing the website to show the updated data...
                </span>
              </div>
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin shrink-0" />
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {!activeJob ? (
            /* Configure Scan Scope */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Platform Scope
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlatform('all')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-medium border text-center transition ${
                      platform === 'all'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Both Platforms
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform('leetcode')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-medium border text-center transition ${
                      platform === 'leetcode'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    LeetCode Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform('codechef')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-medium border text-center transition ${
                      platform === 'codechef'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    CodeChef Only
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1.5 leading-relaxed">
                <div className="font-semibold text-slate-800">Verification & Extraction Protocol:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Real API requests are made server-side to public LeetCode GraphQL & CodeChef endpoints.</li>
                  <li>No fake data or synthetic numbers are generated.</li>
                  <li>Rate-limits are respected with sequential delays for CodeChef.</li>
                  <li>Previous successful snapshots are preserved if a platform request temporarily fails.</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Live Progress Tracker */
            <div className="space-y-4">
              {/* Status Header */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Job ID: <code className="text-slate-800 font-mono">{activeJob.id.substring(0, 8)}</code></span>
                <span className="font-semibold capitalize px-2 py-0.5 rounded text-[11px] bg-blue-100 text-blue-700">
                  {activeJob.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>Progress ({activeJob.processed_accounts} / {activeJob.total_accounts} accounts)</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
                  <div className="text-lg font-bold text-emerald-700">{activeJob.successful_accounts}</div>
                  <div className="text-[11px] text-emerald-600 font-medium">Succeeded</div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-center">
                  <div className="text-lg font-bold text-amber-700">{activeJob.partial_accounts}</div>
                  <div className="text-[11px] text-amber-600 font-medium">Partial</div>
                </div>
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-center">
                  <div className="text-lg font-bold text-red-700">{activeJob.failed_accounts}</div>
                  <div className="text-[11px] text-red-600 font-medium">Failed</div>
                </div>
              </div>

              {/* Real-time items log */}
              <div>
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Account Processing Log
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                  {jobItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-100 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-semibold text-slate-700 uppercase text-[10px] w-14 shrink-0">
                          {item.platform}
                        </span>
                        <span className="text-slate-900 font-medium truncate">{item.username}</span>
                        <span className="text-slate-400 text-[11px] truncate">({item.studentName})</span>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {item.status === 'succeeded' && (
                          <span className="text-emerald-600 flex items-center gap-1 text-[11px] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Done
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-red-600 flex items-center gap-1 text-[11px] font-medium" title={item.error_message || ''}>
                            <XCircle className="w-3.5 h-3.5" /> Error
                          </span>
                        )}
                        {item.status === 'running' && (
                          <span className="text-blue-600 flex items-center gap-1 text-[11px] font-medium">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scraping
                          </span>
                        )}
                        {item.status === 'queued' && (
                          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                            <Clock className="w-3.5 h-3.5" /> Queued
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          {!activeJob ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isStarting}
                onClick={handleStartScan}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isStarting ? 'Queuing...' : 'Start Scan Now'}
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between">
              {isCompleted ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Automatically refreshing page...</span>
                </div>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={handleClose}
                disabled={activeJob.status === 'running'}
                className="px-5 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition disabled:opacity-50 flex items-center gap-2"
              >
                {activeJob.status === 'running' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : isCompleted ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Refresh Now</span>
                  </>
                ) : (
                  <span>Done</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
