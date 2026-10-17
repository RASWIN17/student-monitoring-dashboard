'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';


export default function RootPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        if (user.role === 'teacher' || user.role === 'admin') {
          router.replace('/students');
        } else {
          router.replace(!user.profile_completed ? '/student/profile/create' : '/classrooms');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, authLoading, router]);

  return <div className="min-h-screen bg-white" />;
}
