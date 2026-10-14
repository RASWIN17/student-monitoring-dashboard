'use client';

import React from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

interface RefreshModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
}

export function RefreshModal({
  isOpen,
  title = 'Scan Complete',
  message = 'The scan has finished successfully. Please refresh the page to display the latest data.',
}: RefreshModalProps) {
  if (!isOpen) return null;

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
