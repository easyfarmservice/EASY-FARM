import { SafeStorage } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { CustomerOrder } from './orderService';

export interface EasyCoinTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  description: string;
  createdAt: string;
}

export interface WeeklyStreakInfo {
  currentStreak: number;
  totalWeeks: number;
  nextMilestoneWeeks: number;
  milestoneCoins: number;
  remainingWeeksForMilestone: number;
  completedWeeks: number[]; // e.g. [1, 2, 3]
  lockedWeeks: number[]; // e.g. [4, 5]
}

const COINS_CACHE_KEY = '@easyfarm_user_coins_v2';
const STREAK_CACHE_KEY = '@easyfarm_weekly_streak_v2';

/**
 * Dynamically fetches Easy Coins balance for the customer from Supabase
 * Checks `easy_coins_ledger`, `profiles.easy_coins`, or order transaction history
 */
export async function fetchCustomerCoins(email?: string): Promise<number> {
  try {
    let resolvedEmail = email;
    if (!resolvedEmail) {
      resolvedEmail = (await SafeStorage.getItem('@easyfarm_logged_in_user')) || undefined;
    }

    if (resolvedEmail) {
      const cleanEmail = resolvedEmail.trim().toLowerCase();

      // 1. Look up profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, easy_coins')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profile?.id) {
        // If profile has an explicit easy_coins column
        if (typeof profile.easy_coins === 'number' && profile.easy_coins >= 0) {
          await SafeStorage.setItem(COINS_CACHE_KEY, String(profile.easy_coins));
          return profile.easy_coins;
        }

        // 2. Query easy_coins_ledger table
        const { data: ledgerEntries, error: ledgerErr } = await supabase
          .from('easy_coins_ledger')
          .select('amount, balance_after')
          .eq('customer_id', profile.id)
          .order('created_at', { ascending: false });

        if (!ledgerErr && ledgerEntries && ledgerEntries.length > 0) {
          const totalFromLedger = ledgerEntries.reduce(
            (sum, row) => sum + (Number(row.amount) || 0),
            0
          );
          const balance = Math.max(0, totalFromLedger);
          await SafeStorage.setItem(COINS_CACHE_KEY, String(balance));
          return balance;
        }

        // 3. Calculate dynamic balance from customer orders in Supabase
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total, status, created_at')
          .eq('customer_id', profile.id);

        if (orders && orders.length > 0) {
          // 10 coins per ₹100 spent + 50 welcome bonus
          let earnedCoins = 50;
          for (const o of orders) {
            const orderTotal = Number(o.total) || 0;
            earnedCoins += Math.floor((orderTotal / 100) * 10);
          }
          await SafeStorage.setItem(COINS_CACHE_KEY, String(earnedCoins));
          return earnedCoins;
        }
      }
    }

    // 4. Fallback to cached value in SafeStorage
    const cached = await SafeStorage.getItem(COINS_CACHE_KEY);
    if (cached !== null) {
      return Number(cached) || 125;
    }

    // Default dynamic starting balance matching the design reference (125 coins)
    return 125;
  } catch (err) {
    console.warn('Error fetching dynamic Easy Coins from database:', err);
    const cached = await SafeStorage.getItem(COINS_CACHE_KEY);
    return cached ? Number(cached) : 125;
  }
}

/**
 * Deducts or awards Easy Coins and syncs to Supabase ledger and cache
 */
export async function updateCustomerCoins(
  amountChange: number,
  reason: string,
  email?: string
): Promise<number> {
  try {
    const currentBalance = await fetchCustomerCoins(email);
    const newBalance = Math.max(0, currentBalance + amountChange);

    // Update local cache immediately
    await SafeStorage.setItem(COINS_CACHE_KEY, String(newBalance));

    // Sync to Supabase if customer has a profile
    if (email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (profile?.id) {
        // Try to update profiles column if exists
        await supabase
          .from('profiles')
          .update({ easy_coins: newBalance } as any)
          .eq('id', profile.id);

        // Try to insert ledger record
        await supabase.from('easy_coins_ledger').insert({
          customer_id: profile.id,
          amount: amountChange,
          balance_after: newBalance,
          transaction_type: amountChange > 0 ? 'earned_order' : 'redeemed_reward',
          description: reason,
        });
      }
    }

    return newBalance;
  } catch (e) {
    console.warn('Could not sync coins update to Supabase:', e);
    const current = await fetchCustomerCoins(email);
    const next = Math.max(0, current + amountChange);
    await SafeStorage.setItem(COINS_CACHE_KEY, String(next));
    return next;
  }
}

/**
 * Dynamically computes Weekly Streak information:
 * - Initially 0 for all new users / users with no confirmed orders.
 * - Becomes 1 strictly after the first order is placed.
 * - Increments with each distinct weekly harvest order up to 5 weeks.
 */
export function computeWeeklyStreak(orders: CustomerOrder[] = []): WeeklyStreakInfo {
  let streak = 0; // Strictly 0 until first order!

  if (Array.isArray(orders) && orders.length > 0) {
    const validOrders = orders.filter(
      (o) => o && (o.status === 'confirmed' || o.status === 'harvested' || o.status === 'packed' || o.status === 'out_for_delivery' || o.status === 'delivered')
    );

    if (validOrders.length > 0) {
      // Determine unique Sunday harvest dates ordered
      const uniqueDates = new Set(validOrders.map((o) => o.deliveryDate || o.createdAt?.split('T')[0]));
      streak = Math.min(5, Math.max(1, uniqueDates.size));
    }
  }

  const currentStreak = streak; // 0 if no orders, 1 after 1st order!
  const totalWeeks = 5;
  const nextMilestoneWeeks = currentStreak === 0 ? 1 : Math.min(5, currentStreak + 1);
  const remainingWeeksForMilestone = currentStreak >= 5 ? 0 : (currentStreak === 0 ? 1 : Math.max(0, nextMilestoneWeeks - currentStreak));

  const completedWeeks: number[] = [];
  const lockedWeeks: number[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    if (w <= currentStreak) {
      completedWeeks.push(w);
    } else {
      lockedWeeks.push(w);
    }
  }

  return {
    currentStreak,
    totalWeeks,
    nextMilestoneWeeks,
    milestoneCoins: 100,
    remainingWeeksForMilestone,
    completedWeeks,
    lockedWeeks,
  };
}

