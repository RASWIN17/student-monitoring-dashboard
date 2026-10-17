'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';

interface LoadingContextType {
  /** True when the global loader is currently active and visible */
  isLoading: boolean;
  /** Registers a loading task key (auto-clears after timeoutMs to avoid being trapped) */
  startLoading: (key?: string, options?: { timeoutMs?: number }) => void;
  /** Deregisters a loading task key */
  stopLoading: (key?: string) => void;
  /** Executes an async action with the global loader active and error-safe cleanup */
  withLoading: <T>(action: () => Promise<T>, key?: string, options?: { timeoutMs?: number }) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: true,
  startLoading: () => {},
  stopLoading: () => {},
  withLoading: async (action) => action(),
});

// Default safety timeout: auto-clear a loading state after 10s so user is never trapped
const DEFAULT_SAFETY_TIMEOUT = 10000;
// Anti-flash debounce: short background operations (<100ms) will not flash full screen
const ANTI_FLASH_DELAY = 100;

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const { loading: authLoading } = useAuth();
  
  // Track whether initial app boot/hydration is underway
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  
  // Active in-flight async operations
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  
  // Ref for managing individual timeouts
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Debounced visibility state for async operations to prevent rapid flashing
  const [isDebouncedActive, setIsDebouncedActive] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Safety fallback for initial application initialization:
  // If auth check hangs or fails, unblock loader after 8s maximum
  useEffect(() => {
    const safetyInitTimer = setTimeout(() => {
      setIsAppInitializing(false);
    }, 8000);

    return () => clearTimeout(safetyInitTimer);
  }, []);

  // When auth finishes loading, dismiss initial boot blocker
  useEffect(() => {
    if (!authLoading) {
      setIsAppInitializing(false);
    }
  }, [authLoading]);

  // Handle anti-flash debouncing for dynamic activeKeys
  useEffect(() => {
    if (activeKeys.size > 0) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      // Wait ANTI_FLASH_DELAY before displaying overlay for dynamic operations
      debounceTimerRef.current = setTimeout(() => {
        setIsDebouncedActive(true);
      }, ANTI_FLASH_DELAY);
    } else {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setIsDebouncedActive(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [activeKeys.size]);

  const stopLoading = useCallback((key = 'default') => {
    // Clear safety timeout
    const existingTimeout = timeoutsRef.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutsRef.current.delete(key);
    }

    setActiveKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const startLoading = useCallback(
    (key = 'default', options?: { timeoutMs?: number }) => {
      const timeoutMs = options?.timeoutMs ?? DEFAULT_SAFETY_TIMEOUT;

      // Clear any prior timeout on same key
      const existingTimeout = timeoutsRef.current.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set emergency fallback timeout so loader can never remain stuck indefinitely
      const timer = setTimeout(() => {
        console.warn(`[GlobalLoader] Safety timeout reached for task "${key}". Releasing overlay.`);
        stopLoading(key);
      }, timeoutMs);

      timeoutsRef.current.set(key, timer);

      setActiveKeys((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    },
    [stopLoading]
  );

  const withLoading = useCallback(
    async <T,>(
      action: () => Promise<T>,
      key = 'async-action',
      options?: { timeoutMs?: number }
    ): Promise<T> => {
      startLoading(key, options);
      try {
        return await action();
      } finally {
        // Guaranteed cleanup even on rejected promises or thrown errors
        stopLoading(key);
      }
    },
    [startLoading, stopLoading]
  );

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Show immediately for initial app boot; use debounced visibility for dynamic requests
  const isLoading = isAppInitializing || isDebouncedActive;

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        startLoading,
        stopLoading,
        withLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}

/**
 * Convenient hook for page components:
 * Displays global loader when isWaiting is true (e.g. while initial uncached data is fetching).
 * Automatically unregisters when isWaiting becomes false or when navigating away / unmounting.
 */
export function usePageLoading(isWaiting: boolean, key = 'page-data') {
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    if (isWaiting) {
      startLoading(key);
    } else {
      stopLoading(key);
    }

    return () => {
      stopLoading(key);
    };
  }, [isWaiting, key, startLoading, stopLoading]);
}
