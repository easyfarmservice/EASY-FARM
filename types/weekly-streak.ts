export type StreakDiscountType = 'percentage' | 'fixed';
export type StreakStatus = 'active' | 'inactive' | 'broken';
export type StampStatus = 'completed' | 'pending' | 'missed';
export type RewardStatus = 'active' | 'redeemed' | 'expired' | 'reversed';

export interface WeeklyStreakSettings {
  id: string;
  is_enabled: boolean;
  cycle_start_day: string; // e.g. 'Monday'
  cycle_end_day: string;   // e.g. 'Sunday'
  order_cutoff_day: string; // e.g. 'Saturday'
  order_cutoff_time: string; // e.g. '23:00'
  timezone: string; // e.g. 'Asia/Kolkata'
  min_order_value: number; // e.g. 0.00
  qualifying_statuses: string[]; // ['delivered']
  auto_reset_missed: boolean;
  allow_coupon_stacking: boolean;
  notifications_enabled: boolean;
  updated_at?: string;
}

export interface WeeklyStreakMilestone {
  id: string;
  title: string;
  required_weeks: number;
  discount_type: StreakDiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount_cap?: number | null;
  applicable_baskets: string[]; // ['all'] or ['staple-basket', 'custom-basket']
  reward_expiry_days?: number | null;
  is_active: boolean;
  description?: string;
  badge_icon?: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerWeeklyStreak {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  current_streak: number;
  best_streak: number;
  total_stamps: number;
  last_qualifying_cycle?: string | null;
  last_qualifying_date?: string | null;
  last_qualifying_order_id?: string | null;
  status: StreakStatus;
  streak_started_at?: string;
  updated_at?: string;
  next_milestone?: WeeklyStreakMilestone | null;
  weeks_to_next_milestone?: number;
  progress_percentage?: number;
}

export interface WeeklyStreakStamp {
  id: string;
  customer_id: string;
  order_id: string;
  cycle_id: string; // e.g. '2026-W44'
  cycle_start_date: string; // 'YYYY-MM-DD'
  cycle_end_date: string;   // 'YYYY-MM-DD'
  order_delivery_date: string;
  order_total: number;
  streak_count_after: number;
  contributed_to_streak: boolean;
  is_reversed: boolean;
  reversed_at?: string | null;
  reversal_reason?: string | null;
  created_at: string;
}

export interface WeeklyStreakReward {
  id: string;
  customer_id: string;
  milestone_id: string;
  milestone_title: string;
  required_weeks_snapshot: number;
  discount_type: StreakDiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount_cap?: number | null;
  applicable_baskets: string[];
  status: RewardStatus;
  earned_cycle_id: string;
  earned_at: string;
  expires_at?: string | null;
  redeemed_at?: string | null;
  redeemed_order_id?: string | null;
  discount_amount_applied?: number | null;
  reversal_reason?: string | null;
  created_at: string;
}

export interface WeeklyStreakAuditLog {
  id: string;
  customer_id?: string | null;
  admin_id?: string | null;
  admin_email?: string | null;
  action_type: string;
  details?: Record<string, any>;
  reason?: string | null;
  created_at: string;
}

export interface WeeklyStreakOverview {
  streak: CustomerWeeklyStreak;
  recentStamps: WeeklyStreakStamp[];
  activeRewards: WeeklyStreakReward[];
  allRewards: WeeklyStreakReward[];
  milestones: WeeklyStreakMilestone[];
  currentCycle: {
    cycle_id: string;
    start_date: string;
    end_date: string;
    delivery_date: string;
    cutoff_time: string;
    has_qualifying_order: boolean;
    order_status?: string;
  };
}

