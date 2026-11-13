import React from 'react';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

export default function WeeklyStreakLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-52 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-4 w-36 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-6">
          <EasyFarmLoader size="md" text="Loading Weekly Streak milestones..." />
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4 animate-pulse">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-50 border border-slate-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

