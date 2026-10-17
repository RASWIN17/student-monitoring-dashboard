'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from './AuthContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Close navigation drawer whenever route/path changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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
    return <div className="min-h-screen bg-white" />;
  }

  // If unauthenticated, prevent dashboard elements from flashing while redirect is processing
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F8FD]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar
          isSidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onToggleMobileNav={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-8 overflow-y-auto bg-[#F5F8FD] scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
