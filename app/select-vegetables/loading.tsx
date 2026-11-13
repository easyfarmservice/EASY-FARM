import React from 'react';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

export default function SelectVegetablesLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Banner Skeleton */}
      <div className="bg-emerald-950 text-white py-8 sm:py-10 px-4 border-b border-emerald-900/50">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="h-6 w-32 bg-emerald-800/60 rounded-full animate-pulse" />
          <div className="h-8 sm:h-10 w-72 sm:w-96 bg-emerald-800/40 rounded-xl animate-pulse" />
          <div className="h-4 w-60 bg-emerald-800/30 rounded-lg animate-pulse" />
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col items-center justify-center py-4 mb-4">
          <EasyFarmLoader size="md" text="Loading 24-crop harvest catalogue..." />
        </div>

        {/* Category Filter Pills Shimmer */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-24 sm:w-28 bg-slate-200 rounded-full shrink-0 animate-pulse" />
          ))}
        </div>

        {/* Product Cards Grid Shimmer */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs space-y-3 animate-pulse"
            >
              <div className="w-full aspect-square bg-slate-100 rounded-xl" />
              <div className="space-y-1.5">
                <div className="h-4 bg-slate-200 rounded w-4/5" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-7 w-16 bg-emerald-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

