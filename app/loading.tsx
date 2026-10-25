import React from 'react';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-6">
      <EasyFarmLoader size="lg" />

      {/* Shimmer Skeleton Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-100 rounded w-full"></div>
          <div className="h-3 bg-slate-100 rounded w-5/6"></div>
        </div>
        <div className="h-10 bg-emerald-100/60 rounded-xl w-full"></div>
      </div>
    </div>
  );
}
