'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Flame,
  Award,
  CheckCircle,
  Clock,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  HelpCircle,
  Tag,
  Lock,
  Gift,
  History,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';
import { createClient } from '@/lib/supabase/client';
import {
  CustomerWeeklyStreak,
  WeeklyStreakStamp,
  WeeklyStreakReward,
  WeeklyStreakMilestone,
} from '@/types/weekly-streak';

export default function WeeklyStreakPage() {
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [streak, setStreak] = useState<CustomerWeeklyStreak | null>(null);
  const [stamps, setStamps] = useState<WeeklyStreakStamp[]>([]);
  const [milestones, setMilestones] = useState<WeeklyStreakMilestone[]>([]);
  const [activeRewards, setActiveRewards] = useState<WeeklyStreakReward[]>([]);
  const [allRewards, setAllRewards] = useState<WeeklyStreakReward[]>([]);
  const [rewardTab, setRewardTab] = useState<'available' | 'all'>('available');
  const [currentCycle, setCurrentCycle] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
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

        if (data.success) {
          setIsGuest(!!data.isGuest);
          setStreak(data.streak || null);
          setStamps(data.recentStamps || []);
          setMilestones(data.milestones || []);
          setActiveRewards(data.activeRewards || []);
          setAllRewards(data.allRewards || []);
          setCurrentCycle(data.currentCycle || null);
        }
      } catch (err) {
        console.error('Error loading weekly streak data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    if (typeof window !== 'undefined') {
      const handleUpdate = () => loadData();
      window.addEventListener('storage', handleUpdate);
      window.addEventListener('weekly-streak-updated', handleUpdate);
      return () => {
        window.removeEventListener('storage', handleUpdate);
        window.removeEventListener('weekly-streak-updated', handleUpdate);
      };
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <EasyFarmLoader
            size="md"
            text="Loading Weekly Streak"
            subtitle="Fetching your consecutive harvest stamps & rewards"
          />
        </main>
        <Footer />
        <BottomNav />
      </div>
    );
  }

  const currentCount = streak?.current_streak || 0;
  const bestCount = streak?.best_streak || 0;
  const totalStampsCount = streak?.total_stamps || 0;
  const nextMilestone = streak?.next_milestone || null;
  const weeksRemaining = streak?.weeks_to_next_milestone || 0;
  const progressPct = streak?.progress_percentage || 0;

  // Generate 8-week visual grid for stamp timeline
  const displayStamps = [...stamps];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 w-full">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-700/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 text-xs font-bold tracking-wide uppercase">
                <Flame className="w-4 h-4 fill-emerald-400 text-emerald-400 animate-pulse" />
                Easy Farm Weekly Streak Loyalty
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Fresh Telangana Harvest, <br className="hidden sm:inline" />
                Rewarding Every Single Week.
              </h1>
              <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
                Order your fresh weekly vegetable basket direct from Ghatkesar farmers each week. Complete consecutive deliveries to earn weekly stamps and unlock automatic percentage discounts on your orders!
              </p>
            </div>

            {/* QUICK STATS CARD */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 sm:p-6 text-center shrink-0 min-w-[260px] space-y-3 shadow-inner">
              <div className="flex items-center justify-center gap-2">
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-md">
                  <Flame className="w-7 h-7 fill-white" />
                </span>
                <div className="text-left">
                  <p className="text-xs uppercase tracking-wider font-extrabold text-emerald-200">
                    Active Streak
                  </p>
                  <p className="text-3xl font-black text-white leading-none">
                    {currentCount} {currentCount === 1 ? 'Week' : 'Weeks'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                <div className="p-2 bg-black/20 rounded-xl">
                  <p className="text-emerald-200 text-[10px] font-bold uppercase">Best Streak</p>
                  <p className="font-black text-white text-base">{bestCount} Wks</p>
                </div>
                <div className="p-2 bg-black/20 rounded-xl">
                  <p className="text-emerald-200 text-[10px] font-bold uppercase">Total Stamps</p>
                  <p className="font-black text-white text-base">{totalStampsCount}</p>
                </div>
              </div>

              {isGuest ? (
                <Link
                  href="/login?next=/weekly-streak"
                  className="block w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs transition shadow"
                >
                  Sign In to Track Your Streak →
                </Link>
              ) : currentCount === 0 ? (
                <Link
                  href="/baskets/staple-basket"
                  className="block w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs transition shadow"
                >
                  Start Your First Streak Order →
                </Link>
              ) : (
                <div className="text-[11px] font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Streak Active for {currentCycle?.cycle_id || 'Current Cycle'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION A: CURRENT STREAK SUMMARY & NEXT MILESTONE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* STREAK SUMMARY CARD */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                  Consecutive Streak Progress
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Delivered orders in each weekly cycle keep your streak burning bright.
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  currentCount > 0
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {currentCount > 0 ? '🔥 Active' : 'Start Fresh'}
              </span>
            </div>

            {/* MILESTONE PROGRESS BAR */}
            {nextMilestone ? (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="p-1 bg-emerald-200 text-emerald-900 rounded-lg">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <span className="font-extrabold text-slate-900">
                      Next: {nextMilestone.title} ({nextMilestone.required_weeks} Weeks)
                    </span>
                  </div>
                  <span className="font-bold text-emerald-800">
                    {weeksRemaining} {weeksRemaining === 1 ? 'week' : 'weeks'} away!
                  </span>
                </div>

                {/* Progress bar track */}
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-700 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, progressPct)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Current: {currentCount} weeks</span>
                  <span className="font-bold text-emerald-900">
                    Reward: {nextMilestone.discount_value}% Discount
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-100/70 border border-emerald-300 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 font-bold">
                <Award className="w-6 h-6 text-emerald-700 shrink-0" />
                <span>
                  Incredible! You have conquered all major streak milestones. Keep your consecutive streak alive for maximum priority harvests!
                </span>
              </div>
            )}

            {/* QUALIFYING DETAILS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Order</p>
                <p className="font-bold text-slate-800 mt-1">
                  {streak?.last_qualifying_date
                    ? new Date(streak.last_qualifying_date).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'None yet'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Weekly Cutoff</p>
                <p className="font-bold text-slate-800 mt-1">Saturdays 11:00 PM</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Delivery Sunday</p>
                <p className="font-bold text-slate-800 mt-1">
                  {currentCycle?.delivery_date
                    ? new Date(currentCycle.delivery_date).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Sundays'}
                </p>
              </div>
            </div>
          </div>

          {/* ACTIVE VOUCHERS WALLET */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-emerald-700" />
                  Your Unlocked Discounts
                </h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full">
                  {activeRewards.length} Active
                </span>
              </div>

              {activeRewards.length > 0 ? (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {activeRewards.map((reward) => (
                    <div
                      key={reward.id}
                      className="p-3 bg-gradient-to-r from-emerald-50 to-emerald-100/60 border border-emerald-300/80 rounded-2xl space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-emerald-950 text-xs">
                          {reward.milestone_title}
                        </span>
                        <span className="font-black text-emerald-800 bg-white px-2 py-0.5 rounded-md text-[11px] shadow-xs">
                          {reward.discount_type === 'percentage'
                            ? `${reward.discount_value}% OFF`
                            : `₹${reward.discount_value} OFF`}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-800">
                        Min Order: ₹{reward.min_order_amount}
                        {reward.max_discount_cap && ` • Max Cap: ₹${reward.max_discount_cap}`}
                      </p>
                      {reward.expires_at && (
                        <p className="text-[10px] text-slate-500">
                          Expires: {new Date(reward.expires_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <Lock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-700">No active discounts right now</p>
                  <p className="text-[11px]">
                    Complete 2 consecutive weekly orders to unlock your first 2% discount!
                  </p>
                </div>
              )}
            </div>

            <Link
              href="/cart"
              className="block w-full py-3 text-center rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-md"
            >
              Order This Week's Basket →
            </Link>
          </div>
        </div>

        {/* SECTION B: WEEKLY STAMP TIMELINE & GRID */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-700" />
              Weekly Stamp History &amp; Timeline
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Every Sunday harvest delivery earns one certified weekly stamp. Missed cycles reset the active streak.
            </p>
          </div>

          {displayStamps.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {displayStamps.map((stamp, idx) => (
                <div
                  key={stamp.id}
                  className={`p-4 rounded-2xl border text-center relative space-y-2 transition shadow-xs ${
                    stamp.is_reversed
                      ? 'border-red-200 bg-red-50/50 opacity-60'
                      : 'border-emerald-300/80 bg-gradient-to-b from-emerald-50/80 to-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow">
                    {stamp.is_reversed ? (
                      <AlertCircle className="w-5 h-5 text-red-200" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">
                      {stamp.cycle_id}
                    </span>
                    <p className="text-xs font-black text-slate-900 mt-0.5">
                      Streak: {stamp.streak_count_after} {stamp.streak_count_after === 1 ? 'Wk' : 'Wks'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(stamp.order_delivery_date).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {stamp.is_reversed ? 'Reversed' : 'Delivered'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400 space-y-3 border border-dashed border-slate-200 rounded-2xl">
              <span className="text-3xl">🌱</span>
              <p className="font-bold text-slate-700">No weekly stamps yet</p>
              <p className="text-[11px] max-w-sm mx-auto text-slate-400">
                Place an order for this Sunday's harvest delivery to receive your first green stamp and ignite your streak!
              </p>
              <Link
                href="/baskets/staple-basket"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition shadow"
              >
                Explore Weekly Boxes →
              </Link>
            </div>
          )}
        </div>

        {/* SECTION C: MILESTONE REWARDS TIERS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-700" />
                Configured Streak Milestones &amp; Tiers
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Maintain your weekly orders to continuously unlock higher discounts direct from the farm.
              </p>
            </div>
            <span className="text-xs text-slate-400 italic">Managed dynamically by Admin</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {milestones.map((m) => {
              const isUnlocked = currentCount >= m.required_weeks;
              return (
                <div
                  key={m.id}
                  className={`p-5 rounded-3xl border transition relative space-y-3 ${
                    isUnlocked
                      ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-xs ${
                        isUnlocked
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isUnlocked ? '✓' : `${m.required_weeks}w`}
                    </span>

                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        isUnlocked
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isUnlocked ? 'Unlocked' : `${Math.max(0, m.required_weeks - currentCount)} wks left`}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{m.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {m.description || `Complete ${m.required_weeks} consecutive weeks`}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black">
                    <span className="text-emerald-800 text-sm">
                      {m.discount_type === 'percentage' ? `${m.discount_value}% OFF` : `₹${m.discount_value} OFF`}
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">
                      Min: ₹{m.min_order_amount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION D: REWARD HISTORY */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-700" />
                Reward &amp; Redemption History
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Complete audit trail of earned, redeemed, expired, and reversed milestone discounts.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setRewardTab('available')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  rewardTab === 'available'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Available ({activeRewards.length})
              </button>
              <button
                type="button"
                onClick={() => setRewardTab('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  rewardTab === 'all'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All History ({allRewards.length})
              </button>
            </div>
          </div>

          {(rewardTab === 'available' ? activeRewards : allRewards).length > 0 ? (
            <div className="divide-y divide-slate-100 overflow-hidden border border-slate-100 rounded-2xl text-xs">
              {(rewardTab === 'available' ? activeRewards : allRewards).map((r) => (
                <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {r.milestone_title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          r.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'redeemed'
                            ? 'bg-blue-100 text-blue-800'
                            : r.status === 'reversed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Earned in cycle {r.earned_cycle_id} • Min order ₹{r.min_order_amount}
                      {r.max_discount_cap && ` • Max ₹${r.max_discount_cap}`}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <p className="font-black text-emerald-800 text-sm">
                      {r.discount_type === 'percentage' ? `${r.discount_value}% OFF` : `₹${r.discount_value} OFF`}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {r.redeemed_at
                        ? `Redeemed on ${new Date(r.redeemed_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
                        : `Earned on ${new Date(r.earned_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              No rewards found in this view.
            </div>
          )}
        </div>

        {/* SECTION E: HOW IT WORKS FAQ ACCORDION */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 sm:p-8 space-y-4">
          <h2 className="text-base font-extrabold text-emerald-950 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-700" />
            Frequently Asked Questions about Weekly Streak
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
            <div className="p-4 bg-white rounded-2xl border border-emerald-100 space-y-1.5 shadow-xs">
              <h4 className="font-extrabold text-slate-900">How do I earn a weekly stamp?</h4>
              <p className="text-slate-600 leading-relaxed">
                Place any qualifying vegetable box order for our Sunday delivery. Once the order is successfully marked delivered, your green stamp is automatically credited for that week's cycle!
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-emerald-100 space-y-1.5 shadow-xs">
              <h4 className="font-extrabold text-slate-900">What happens if I miss a week?</h4>
              <p className="text-slate-600 leading-relaxed">
                If an entire weekly cycle closes without an order, your active consecutive streak resets to zero. However, your previous stamps and previously unlocked vouchers remain safely stored in your account!
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-emerald-100 space-y-1.5 shadow-xs">
              <h4 className="font-extrabold text-slate-900">How do I redeem my discounts?</h4>
              <p className="text-slate-600 leading-relaxed">
                During checkout on your next order, your unlocked milestone discount vouchers will appear in the checkout discount selector. Select your preferred voucher to instantly deduct the savings before payment.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-emerald-100 space-y-1.5 shadow-xs">
              <h4 className="font-extrabold text-slate-900">Is this separate from Easy Coins?</h4>
              <p className="text-slate-600 leading-relaxed">
                Yes! Weekly Streak and Easy Coins are two distinct loyalty rewards. You earn Easy Coins on every purchase to redeem physical pantry items, and your weekly streak earns automatic basket discounts.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}

