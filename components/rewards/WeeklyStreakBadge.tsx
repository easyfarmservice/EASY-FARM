'use client';

import React from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { useUserSession } from '@/components/auth/UserSessionProvider';

export function WeeklyStreakBadge() {
  const { streakCount, streakLoading } = useUserSession();

  const hasStreak = typeof streakCount === 'number' && streakCount > 0;

  return (
    <Link
      href="/weekly-streak"
      prefetch={true}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 via-emerald-600/15 to-emerald-700/10 border border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/20 transition shadow-xs text-xs group shrink-0"
      title="View your Weekly Streak & Milestone Discounts"
    >
      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-[10px] text-white shadow-inner group-hover:scale-110 transition-transform">
        <Flame className="w-3 h-3 text-emerald-100 fill-emerald-200" />
      </span>
      <span className="font-extrabold text-emerald-900 tracking-tight">
        {streakLoading && streakCount === 0 ? (
          '...'
        ) : hasStreak ? (
          `${streakCount} ${streakCount === 1 ? 'Week' : 'Weeks'}`
        ) : (
          'Start Streak'
        )}
      </span>
    </Link>
  );
}
