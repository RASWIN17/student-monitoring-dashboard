'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import {
  GraduationCap,
  Users,
  History,
  FileSpreadsheet,
  Settings,
  Scan,
  LogOut,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const navItems = [
    { label: 'Classrooms', href: '/classrooms', icon: GraduationCap, roles: ['teacher', 'admin', 'student'] },
    { label: 'Students', href: '/students', icon: Users, roles: ['teacher', 'admin'] },
    { label: 'Scan History', href: '/scans', icon: History, roles: ['teacher', 'admin'] },
    { label: 'Reports & Export', href: '/reports', icon: FileSpreadsheet, roles: ['teacher', 'admin'] },
    { label: 'Connector Test', href: '/admin/test-connectors', icon: Scan, roles: ['teacher', 'admin'] },
    { label: 'Settings', href: '/settings', icon: Settings, roles: ['teacher', 'admin', 'student'] },
  ];

  const visibleItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : item.roles.includes('teacher')
  );

  const userInitial = user?.display_name ? user.display_name.charAt(0).toUpperCase() : 'T';

  return (
    <aside className="w-[228px] min-w-[228px] bg-gradient-to-b from-[#081226] via-[#0b1736] to-[#081226] text-white flex flex-col h-screen border-r border-[#152549] shrink-0 select-none sticky top-0 z-40">
      {/* Brand Header */}
      <div className="pt-7 pb-5 px-7 flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#1d68ff] to-[#0a4ed8] flex items-center justify-center text-white font-extrabold text-lg shadow-[0_4px_14px_rgba(29,104,255,0.45)] shrink-0">
          CT
        </div>
        <div>
          <div className="text-white font-bold text-lg tracking-tight leading-tight">CodeTrack</div>
          <div className="text-xs text-[#8ea4c8] font-normal mt-0.5">Activity Monitor</div>
        </div>
      </div>

      {/* Teacher Profile Card */}
      {user && (
        <div className="mx-6 my-2 p-3 bg-[#0d1e40]/75 rounded-2xl border border-[#1b2f5b]/60 flex items-center justify-between gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-[#1769ff] text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
              {userInitial}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm text-white font-semibold truncate leading-tight">{user.display_name}</div>
              <div className="text-xs text-[#8ea4c8] capitalize mt-0.5">{user.role}</div>
            </div>
          </div>
          <span
            className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border shrink-0 ${
              isTeacher
                ? 'bg-[#132347] text-[#3b82f6] border-[#1d3d75]'
                : 'bg-[#0d2e2b] text-[#10b981] border-[#14534a]'
            }`}
          >
            {user.role}
          </span>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-5 py-4 space-y-2 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#1769ff] text-white font-semibold shadow-[0_4px_16px_rgba(23,105,255,0.4)]'
                  : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-[#8297b8]'}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-5 pt-3 border-t border-[#152549]">
        {user ? (
          <button
            onClick={logout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl bg-[#1769ff] text-white text-sm font-semibold hover:bg-blue-600 shadow-[0_4px_14px_rgba(23,105,255,0.35)] transition"
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
