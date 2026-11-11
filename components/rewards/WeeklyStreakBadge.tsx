'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function WeeklyStreakBadge() {
  const [streak, setStreak] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStreak = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let customerId: string | undefined = undefined;

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        if (profile?.id) customerId = profile.id;
        else customerId = user.id;
      }

      // Check localStorage easyfarm_user session fallback
      if (!customerId && typeof window !== 'undefined') {
        const demoUserStr = localStorage.getItem('easyfarm_user');
        if (demoUserStr) {
          try {
            const demoUser = JSON.parse(demoUserStr);
            if (demoUser.id && demoUser.id.length === 36) {
              customerId = demoUser.id;
            } else if (demoUser.email) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .ilike('email', demoUser.email)
                .maybeSingle();
              if (profile?.id) customerId = profile.id;
            }
          } catch {}
        }
      }

      const url = customerId
        ? `/api/weekly-streak/status?customerId=${encodeURIComponent(customerId)}`
        : '/api/weekly-streak/status';

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.streak && typeof data.streak.current_streak === 'number') {
        setStreak(data.streak.current_streak);
      } else {
        setStreak(0);
      }
    } catch {
      setStreak(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStreak();

    if (typeof window !== 'undefined') {
      const handleUpdate = () => loadStreak();
      window.addEventListener('storage', handleUpdate);
      window.addEventListener('weekly-streak-updated', handleUpdate);
      return () => {
        window.removeEventListener('storage', handleUpdate);
        window.removeEventListener('weekly-streak-updated', handleUpdate);
      };
    }
  }, [loadStreak]);

  if (streak === null && !loading) return null;

  const hasStreak = typeof streak === 'number' && streak > 0;

  return (
    <Link
      href="/weekly-streak"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 via-emerald-600/15 to-emerald-700/10 border border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/20 transition shadow-xs text-xs group shrink-0"
      title="View your Weekly Streak & Milestone Discounts"
    >
      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-[10px] text-white shadow-inner group-hover:scale-110 transition-transform">
        <Flame className="w-3 h-3 text-emerald-100 fill-emerald-200" />
      </span>
      <span className="font-extrabold text-emerald-900 tracking-tight">
        {loading ? (
          '...'
        ) : hasStreak ? (
          `${streak} ${streak === 1 ? 'Week' : 'Weeks'}`
        ) : (
          'Start Streak'
        )}
      </span>
    </Link>
  );
}
