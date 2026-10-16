'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { ScanModal } from './ScanModal';
import {
  RefreshCw,
  Plus,
  Clock,
  ChevronDown,
  Sparkles,
  Link2,
} from 'lucide-react';
import Link from 'next/link';

export function Navbar({ onDataRefreshed }: { onDataRefreshed?: () => void }) {
  const { user, selectedClassroom, classrooms, setSelectedClassroom } = useAuth();
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const handleJoinClassroom = async (e: React.FormEvent) => {
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
      setIsJoinModalOpen(false);
      setJoinCode('');
      window.location.reload();
    } catch {
      setJoinError('Network error joining classroom');
      setJoining(false);
    }
  };

  return (
    <>
      <header className="h-[88px] bg-white border-b border-[#e1eaf5] px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_12px_rgba(30,64,175,0.03)] shrink-0">
        {/* Left Section: Classroom Selector & Timezone */}
        <div className="flex items-center gap-4">
          {classrooms.length > 0 ? (
            <div className="relative flex items-center">
              <div className="absolute left-3.5 pointer-events-none text-[#1769ff]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <select
                aria-label="Select Classroom"
                value={selectedClassroom?.id || ''}
                onChange={(e) => {
                  const target = classrooms.find((c) => c.id === e.target.value);
                  if (target) setSelectedClassroom(target);
                }}
                className="appearance-none bg-white border border-[#dce6f5] hover:border-blue-400 text-[#0f1b35] text-xs font-bold rounded-xl pl-9 pr-9 py-2.5 shadow-[0_2px_8px_rgba(30,64,175,0.04)] focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition cursor-pointer"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Sec {c.section})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#8297b8] absolute right-3 pointer-events-none" />
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">No classrooms available</div>
          )}

          {/* Timezone badge */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f0f5ff] text-[#2563eb] border border-blue-100/70 text-xs font-semibold">
            <Clock className="w-4 h-4 text-[#2563eb]" />
            <span>Timezone: Asia/Kolkata</span>
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-3.5">
          {/* Join Classroom button for students */}
          {user?.role === 'student' && (
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Join Classroom</span>
            </button>
          )}

          {/* Manage Accounts shortcut for students */}
          {user?.role === 'student' && (
            <Link
              href="/settings"
              className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Link2 className="w-4 h-4" />
              <span>Link Profiles</span>
            </Link>
          )}

          {/* Notification Bell with red dot */}
          <button
            type="button"
            className="relative p-2.5 text-[#667a9e] hover:text-[#0f1b35] hover:bg-slate-50 rounded-xl transition cursor-pointer"
            title="Notifications"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className="w-2 h-2 bg-[#ef4444] rounded-full absolute top-2 right-2 ring-2 ring-white" />
          </button>

          {/* Prominent Scan Now Button for teachers */}
          {isTeacher && (
            <button
              onClick={() => setIsScanModalOpen(true)}
              className="px-5 py-2.5 bg-[#1769ff] hover:bg-blue-600 active:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-[0_4px_16px_rgba(23,105,255,0.35)] flex items-center gap-2.5 transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <polyline points="7 12 12 7 17 12" />
                <polyline points="7 17 12 12 17 17" />
              </svg>
              <span>Scan Now</span>
            </button>
          )}
        </div>
      </header>

      {/* Scan Modal */}
      <ScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onScanCompleted={() => {
          if (onDataRefreshed) onDataRefreshed();
        }}
      />

      {/* Join Classroom Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Join Classroom</h3>
            <p className="text-xs text-slate-500 mb-4">Enter the 6-character code provided by your teacher.</p>

            {joinError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-md mb-3">{joinError}</div>
            )}

            <form onSubmit={handleJoinClassroom} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="e.g. CT-ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {joining ? 'Joining...' : 'Join Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
