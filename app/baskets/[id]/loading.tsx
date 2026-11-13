import React from 'react';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

export default function BasketLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner Skeleton */}
      <div className="bg-emerald-950 text-white py-8 sm:py-12 px-4 border-b border-emerald-900/50">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-6 w-36 bg-emerald-800/60 rounded-full animate-pulse" />
          <div className="h-9 sm:h-12 w-64 sm:w-96 bg-emerald-800/40 rounded-2xl animate-pulse" />
          <div className="h-5 w-72 sm:w-80 bg-emerald-800/30 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Main Content Area Skeleton */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center py-6 mb-6">
          <EasyFarmLoader size="md" text="Loading farm-fresh weekly harvest..." />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Items Area (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4 animate-pulse">
              <div className="h-6 w-48 bg-slate-200 rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-14 h-14 rounded-xl bg-slate-200 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar / Summary Area (1 col) */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4 animate-pulse">
              <div className="h-6 w-36 bg-slate-200 rounded-lg" />
              <div className="space-y-2 pt-2">
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-4/5" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="h-12 bg-emerald-100 rounded-2xl w-full" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

