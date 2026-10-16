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
    <aside className="w-64 bg-white text-slate-600 flex flex-col h-screen border-r border-slate-200 shrink-0 select-none sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm tracking-tight">
          CT
        </div>
        <div>
          <div className="text-slate-900 font-semibold text-sm tracking-tight leading-none">CodeTrack</div>
          <div className="text-[11px] text-slate-500 mt-1">Activity Monitor</div>
        </div>
      </div>

      {/* User Info Capsule */}
      {user && (
        <div className="px-3.5 py-2.5 mx-3 my-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
          <div className="overflow-hidden pr-2">
            <div className="text-xs text-slate-900 font-medium truncate">{user.display_name}</div>
            <div className="text-[11px] text-slate-500 capitalize">{user.role}</div>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border capitalize shrink-0 ${
              isTeacher
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-slate-200">
        {user ? (
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center py-2 px-3 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
