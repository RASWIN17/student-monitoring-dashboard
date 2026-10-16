'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallbackHref?: string;
  className?: string;
}

export function BackButton({ fallbackHref = '/students', className = '' }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      const stateIdx = window.history.state?.idx;
      const hasInAppHistory =
        (typeof stateIdx === 'number' && stateIdx > 0) ||
        (Boolean(document.referrer) && document.referrer.includes(window.location.host));

      if (hasInAppHistory) {
        router.back();
        return;
      }
    }
    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors group cursor-pointer ${className}`}
      aria-label="Back"
    >
      <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
      <span>Back</span>
    </button>
  );
}
