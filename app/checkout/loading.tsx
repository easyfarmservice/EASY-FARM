import React from 'react';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-emerald-100 rounded-full animate-pulse" />
          <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse" />
        </div>

        <div className="flex flex-col items-center justify-center py-6">
          <EasyFarmLoader size="md" text="Preparing secure checkout..." />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4 animate-pulse">
              <div className="h-5 w-40 bg-slate-200 rounded-lg" />
              <div className="h-28 bg-slate-100 rounded-2xl" />
              <div className="h-12 bg-slate-100 rounded-xl" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-3 animate-pulse">
              <div className="h-5 w-32 bg-slate-200 rounded-lg" />
              <div className="space-y-2 pt-2">
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
              <div className="h-12 bg-emerald-100 rounded-2xl pt-2" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

