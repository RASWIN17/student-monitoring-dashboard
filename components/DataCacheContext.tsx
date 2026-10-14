'use client';

import React, { createContext, useContext, useCallback } from 'react';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface DataCacheContextType {
  getCache: <T = any>(key: string) => T | null;
  setCache: <T = any>(key: string, data: T, ttlMs?: number) => void;
  invalidateCache: (keyOrPrefix?: string) => void;
  getUIState: <T = any>(key: string) => T | null;
  setUIState: <T = any>(key: string, state: T) => void;
}

// Module-level in-memory storage that survives component unmounts and client-side page navigation
const globalDataCache = new Map<string, CacheEntry>();
const globalUIState = new Map<string, any>();

// Default cache TTL: 15 minutes
export const DEFAULT_CACHE_TTL = 15 * 60 * 1000;

export const dataCache = {
  get<T = any>(key: string): T | null {
    const entry = globalDataCache.get(key);
    if (!entry) return null;
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      globalDataCache.delete(key);
      return null;
    }
    return entry.data as T;
  },

  set<T = any>(key: string, data: T, ttlMs: number = DEFAULT_CACHE_TTL): void {
    globalDataCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  },

  invalidate(keyOrPrefix?: string): void {
    if (!keyOrPrefix) {
      globalDataCache.clear();
      return;
    }
    for (const key of Array.from(globalDataCache.keys())) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        globalDataCache.delete(key);
      }
    }
  },

  getUI<T = any>(key: string): T | null {
    return (globalUIState.get(key) as T) ?? null;
  },

  setUI<T = any>(key: string, state: T): void {
    globalUIState.set(key, state);
  },
};

const DataCacheContext = createContext<DataCacheContextType>({
  getCache: (key) => dataCache.get(key),
  setCache: (key, data, ttl) => dataCache.set(key, data, ttl),
  invalidateCache: (prefix) => dataCache.invalidate(prefix),
  getUIState: (key) => dataCache.getUI(key),
  setUIState: (key, state) => dataCache.setUI(key, state),
});

export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const getCache = useCallback(<T,>(key: string): T | null => {
    return dataCache.get<T>(key);
  }, []);

  const setCache = useCallback(<T,>(key: string, data: T, ttlMs?: number): void => {
    dataCache.set(key, data, ttlMs);
  }, []);

  const invalidateCache = useCallback((keyOrPrefix?: string): void => {
    dataCache.invalidate(keyOrPrefix);
  }, []);

  const getUIState = useCallback(<T,>(key: string): T | null => {
    return dataCache.getUI<T>(key);
  }, []);

  const setUIState = useCallback(<T,>(key: string, state: T): void => {
    dataCache.setUI(key, state);
  }, []);

  return (
    <DataCacheContext.Provider
      value={{
        getCache,
        setCache,
        invalidateCache,
        getUIState,
        setUIState,
      }}
    >
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  return useContext(DataCacheContext);
}
