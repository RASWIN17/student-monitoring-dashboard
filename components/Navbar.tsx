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
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
        {/* Left Section: Classroom Selector */}
        <div className="flex items-center gap-4">
          {classrooms.length > 0 ? (
            <div className="relative flex items-center">
              <select
                aria-label="Select Classroom"
                value={selectedClassroom?.id || ''}
                onChange={(e) => {
                  const target = classrooms.find((c) => c.id === e.target.value);
                  if (target) setSelectedClassroom(target);
                }}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer transition-colors"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.course} - Sec {c.section})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">No classrooms available</div>
          )}

          {/* Timezone badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-[11px] text-slate-600 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Timezone: Asia/Kolkata</span>
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-3">
          {/* Join Classroom button for students */}
          {user?.role === 'student' && (
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Join Classroom</span>
            </button>
          )}

          {/* Manage Accounts shortcut for students */}
          {user?.role === 'student' && (
            <Link
              href="/settings"
              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Link Profiles</span>
            </Link>
          )}

          {/* Prominent Scan Now Button for teachers */}
          {isTeacher && (
            <button
              onClick={() => setIsScanModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Join Classroom</h3>
            <p className="text-xs text-slate-500 mb-4">Enter the 6-character code provided by your teacher.</p>

            {joinError && (
              <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 mb-3">{joinError}</div>
            )}

            <form onSubmit={handleJoinClassroom} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="e.g. CT-ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
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
