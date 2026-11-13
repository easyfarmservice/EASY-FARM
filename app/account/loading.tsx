import React from 'react';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

export default function AccountLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-6">
          <EasyFarmLoader size="md" text="Loading your account profile & orders..." />
        </div>

        <div className="flex gap-2 border-b border-slate-200 pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-24 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4 animate-pulse">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-10 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}

