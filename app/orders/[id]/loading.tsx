import React from 'react';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

export default function OrderTrackingLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-7 w-24 bg-emerald-100 rounded-full animate-pulse" />
        </div>

        <div className="flex flex-col items-center justify-center py-6">
          <EasyFarmLoader size="md" text="Loading live order status..." />
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6 animate-pulse">
          <div className="h-6 w-36 bg-slate-200 rounded" />
          <div className="flex justify-between items-center py-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="h-3 w-16 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

