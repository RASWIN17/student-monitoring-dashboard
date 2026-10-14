'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from './AuthContext';
import { RefreshCw } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isRootPage = pathname === '/';

  // Auth pages (/login, /register) and entry redirector (/) render cleanly without sidebar/navbar
  if (isAuthPage || isRootPage) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  // Client-side route guard: if user is not authenticated on a protected page, redirect to /login
  useEffect(() => {
    if (!loading && !user && !isAuthPage && !isRootPage) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, isAuthPage, isRootPage, pathname, router]);

  // While checking auth on protected routes, do not display internal dashboard layout or sidebar
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Checking authentication status...</span>
      </div>
    );
  }

  // If unauthenticated, prevent dashboard elements from flashing while redirect is processing
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
