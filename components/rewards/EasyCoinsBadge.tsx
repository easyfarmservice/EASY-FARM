'use client';

import React from 'react';
import Link from 'next/link';
import { useUserSession } from '@/components/auth/UserSessionProvider';

export function EasyCoinsBadge() {
  const { coinsBalance, coinsLoading } = useUserSession();

  return (
    <Link
      href="/account?tab=coins"
      prefetch={true}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400/10 via-amber-400/20 to-amber-500/10 border border-amber-400/40 hover:border-amber-400 hover:bg-amber-400/25 transition shadow-sm text-xs group"
      title="View your Easy Coins & Rewards Balance"
    >
      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-[10px] font-black text-emerald-950 shadow-inner group-hover:rotate-12 transition-transform">
        🪙
      </span>
      <span className="font-extrabold text-amber-300 tracking-tight">
        {coinsLoading && coinsBalance === null ? '...' : `${coinsBalance} Coins`}
      </span>
    </Link>
  );
}
