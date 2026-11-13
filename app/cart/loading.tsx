import React from 'react';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

export default function CartLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse" />

        <div className="flex flex-col items-center justify-center py-6">
          <EasyFarmLoader size="md" text="Loading your shopping cart..." />
        </div>

        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4 animate-pulse"
            >
              <div className="w-16 h-16 bg-slate-200 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/4" />
              </div>
              <div className="h-8 w-24 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

