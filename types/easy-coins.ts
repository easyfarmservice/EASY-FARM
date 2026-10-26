export type LedgerTransactionType =
  | 'earned_order'
  | 'redeemed_reward'
  | 'reversed_cancellation'
  | 'admin_adjustment'
  | 'expired'
  | 'bonus_promo';

export type ClaimFulfillmentStatus =
  | 'reserved'
  | 'confirmed'
  | 'packed'
  | 'delivered'
  | 'cancelled'
  | 'released';

export interface EasyCoinsSettings {
  id: string;
  is_enabled: boolean;
  earn_rate_per_100_inr: number;
  min_qualifying_order: number;
  max_rewards_per_order: number;
  coin_expiry_days: number;
  bonus_first_order_coins: number;
  bonus_repeat_order_coins: number;
  allow_promotions: boolean;
  updated_at?: string;
}

export interface RewardCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface RewardProduct {
  id: string;
  name: string;
  brand?: string;
  category_id?: string;
  category_name?: string;
  description?: string;
  package_size: string;
  image_url?: string;
  coin_cost: number;
  stock_quantity: number;
  is_active: boolean;
  max_claims_per_customer?: number | null;
  max_claims_per_order: number;
  min_order_value: number;
  cost_price_inr?: number;
  supplier_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EasyCoinsLedgerEntry {
  id: string;
  customer_id: string;
  order_id?: string | null;
  amount: number; // positive for credits, negative for debits
  balance_after: number;
  transaction_type: LedgerTransactionType;
  description: string;
  reference_id?: string | null;
  created_at: string;
}

export interface RewardClaim {
  id: string;
  order_id: string;
  customer_id: string;
  reward_product_id: string;
  reward_name_snapshot: string;
  package_size_snapshot: string;
  coin_cost_snapshot: number;
  quantity: number;
  claim_status: ClaimFulfillmentStatus;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  // Joins
  reward_product?: RewardProduct;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  delivery_date?: string;
}

export interface CustomerCoinsOverview {
  available_balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  recent_transactions: EasyCoinsLedgerEntry[];
  active_claims: RewardClaim[];
  settings: EasyCoinsSettings;
}
