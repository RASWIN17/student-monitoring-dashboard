'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
          <h2 className="text-xl font-bold mb-2">Application Error</h2>
          <p className="text-sm text-slate-500 mb-6">
            A critical system error occurred. Please refresh or try again later.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
