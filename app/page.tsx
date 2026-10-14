'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { RefreshCw } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        if (user.role === 'teacher' || user.role === 'admin') {
          router.replace('/students');
        } else {
          router.replace('/student/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, authLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 gap-2">
      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
      <span className="text-sm font-medium">Checking authentication status...</span>
    </div>
  );
}
