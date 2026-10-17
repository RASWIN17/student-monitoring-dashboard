'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, Classroom } from '@/lib/types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  selectedClassroom: Classroom | null;
  classrooms: Classroom[];
  setSelectedClassroom: (c: Classroom | null) => void;
  refreshUser: () => Promise<void>;
  refreshClassrooms: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  selectedClassroom: null,
  classrooms: [],
  setSelectedClassroom: () => {},
  refreshUser: async () => {},
  refreshClassrooms: async () => {},
  logout: async () => {},
});

const SESSION_CACHE_KEY = 'codetrack_session_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user) {
          try {
            sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(data.user));
          } catch {}
        } else {
          try {
            sessionStorage.removeItem(SESSION_CACHE_KEY);
          } catch {}
        }
      } else {
        setUser(null);
        try {
          sessionStorage.removeItem(SESSION_CACHE_KEY);
        } catch {}
      }
    } catch {
      setUser(null);
    }
  };

  const refreshClassrooms = async () => {
    try {
      const res = await fetch('/api/classrooms');
      if (res.ok) {
        const data = await res.json();
        setClassrooms(data.classrooms || []);
        if (data.classrooms?.length > 0 && !selectedClassroom) {
          setSelectedClassroom(data.classrooms[0]);
        }
      }
    } catch {}
  };

  useEffect(() => {
    // 1. Optimistic hydration from session storage
    try {
      const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id) {
          setUser(parsed);
          setLoading(false);
        }
      }
    } catch {}

    // 2. Validate/refresh session in background
    (async () => {
      await refreshUser();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (user) {
      refreshClassrooms();
    }
  }, [user]);

  const logout = async () => {
    try {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    } catch {}
    try {
      const { dataCache } = await import('@/components/DataCacheContext');
      dataCache.invalidate();
    } catch {}
    await fetch('/api/auth/me', { method: 'DELETE' });
    setUser(null);
    setClassrooms([]);
    setSelectedClassroom(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        selectedClassroom,
        classrooms,
        setSelectedClassroom,
        refreshUser,
        refreshClassrooms,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
