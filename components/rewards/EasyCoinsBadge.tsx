'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Coins, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function EasyCoinsBadge() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBalance() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let customerId = user?.id;
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle();
          if (profile?.id) customerId = profile.id;
        }

        const url = customerId
          ? `/api/easy-coins/balance?customerId=${customerId}`
          : '/api/easy-coins/balance';

        const res = await fetch(url);
        const data = await res.json();
        if (data.success && typeof data.available_balance === 'number') {
          setBalance(data.available_balance);
        } else {
          setBalance(150); // Fallback starter balance
        }
      } catch (e) {
        setBalance(150);
      } finally {
        setLoading(false);
      }
    }

    loadBalance();
  }, []);

  if (balance === null && !loading) return null;

  return (
    <Link
      href="/account?tab=coins"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400/10 via-amber-400/20 to-amber-500/10 border border-amber-400/40 hover:border-amber-400 hover:bg-amber-400/25 transition shadow-sm text-xs group"
      title="View your Easy Coins & Rewards Balance"
    >
      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-[10px] font-black text-emerald-950 shadow-inner group-hover:rotate-12 transition-transform">
        🪙
      </span>
      <span className="font-extrabold text-amber-300 tracking-tight">
        {loading ? '...' : `${balance} Coins`}
      </span>
    </Link>
  );
}
