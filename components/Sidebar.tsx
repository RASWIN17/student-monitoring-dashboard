'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import {
  GraduationCap,
  Users,
  Code2,
  ChefHat,
  History,
  FileSpreadsheet,
  Settings,
  Terminal,
  LogOut,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const navItems = [
    { label: 'Classrooms', href: '/classrooms', icon: GraduationCap, roles: ['teacher', 'admin', 'student'] },
    { label: 'Students', href: '/students', icon: Users, roles: ['teacher', 'admin'] },
    { label: 'LeetCode Analytics', href: '/leetcode', icon: Code2, roles: ['teacher', 'admin', 'student'] },
    { label: 'CodeChef Analytics', href: '/codechef', icon: ChefHat, roles: ['teacher', 'admin', 'student'] },
    { label: 'Scan History', href: '/scans', icon: History, roles: ['teacher', 'admin'] },
    { label: 'Reports & Export', href: '/reports', icon: FileSpreadsheet, roles: ['teacher', 'admin'] },
    { label: 'Connector Test', href: '/admin/test-connectors', icon: Terminal, roles: ['teacher', 'admin'] },
    { label: 'Settings', href: '/settings', icon: Settings, roles: ['teacher', 'admin', 'student'] },
  ];

  const visibleItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : item.roles.includes('teacher')
  );

  return (
    <aside className="w-64 bg-sidebar-bg text-sidebar-text flex flex-col min-h-screen border-r border-sidebar-border shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border gap-3">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          CT
        </div>
        <div>
          <div className="text-white font-semibold text-base tracking-tight leading-none">CodeTrack</div>
          <div className="text-xs text-slate-400 mt-1">Activity Monitor</div>
        </div>
      </div>

      {/* User Info Capsule */}
      {user && (
        <div className="px-4 py-3 mx-3 my-3 bg-slate-800/60 rounded-lg border border-slate-700/60 flex items-center justify-between">
          <div className="overflow-hidden">
            <div className="text-xs text-white font-medium truncate">{user.display_name}</div>
            <div className="text-[11px] text-slate-400 capitalize">{user.role}</div>
          </div>
          <span
            className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${
              isTeacher
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {user.role}
          </span>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-sidebar-border">
        {user ? (
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:bg-red-950/40 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center py-2 px-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
