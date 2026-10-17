'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import searchAnimationData from '@/public/Search.json';
import { useLoading } from './LoadingContext';

// Dynamically import Lottie with ssr: false to guarantee clean client-only hydration
const Lottie = dynamic(() => import('lottie-react').then((mod) => mod.Lottie), {
  ssr: false,
});

export function GlobalLoader() {
  const { isLoading } = useLoading();
  const [shouldRender, setShouldRender] = useState(isLoading);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect and respect prefers-reduced-motion accessibility preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };

      mediaQuery.addEventListener?.('change', handleChange);
      return () => mediaQuery.removeEventListener?.('change', handleChange);
    }
  }, []);

  // Handle subtle 300ms fade-out transition and conditional unmounting
  useEffect(() => {
    if (isLoading) {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      setShouldRender(true);
      setIsFadingOut(false);
    } else {
      // Trigger smooth fade-out
      setIsFadingOut(true);
      const transitionDuration = prefersReducedMotion ? 0 : 300;
      fadeTimeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        setIsFadingOut(false);
      }, transitionDuration);
    }

    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, [isLoading, prefersReducedMotion]);

  if (!shouldRender) {
    return null;
  }

  const isVisible = isLoading && !isFadingOut;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={isVisible}
      id="global-page-loader"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white overflow-hidden select-none ${
        prefersReducedMotion
          ? isVisible
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
          : `transition-opacity duration-300 ease-out ${
              isVisible
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none'
            }`
      }`}
      style={{ backgroundColor: '#ffffff' }}
    >
      <span className="sr-only">Loading application...</span>

      {/* Responsive container matching requested specs: ~140-180px on mobile, ~180-240px on desktop */}
      <div className="relative w-[150px] h-[150px] sm:w-[180px] sm:h-[180px] md:w-[220px] md:h-[220px] flex items-center justify-center max-w-[85vw] max-h-[85vh] aspect-square overflow-hidden">
        <Lottie
          src={searchAnimationData}
          loop={!prefersReducedMotion}
          autoplay={!prefersReducedMotion}
          renderer="svg"
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid meet',
          }}
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>
    </div>
  );
}
