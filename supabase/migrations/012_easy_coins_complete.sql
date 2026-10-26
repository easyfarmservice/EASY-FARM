-- ==============================================================================
-- 012_EASY_COINS_COMPLETE.SQL
-- Complete Easy Coins Loyalty & Reward Management Schema
-- ==============================================================================

-- 1. REWARD CATEGORIES
CREATE TABLE IF NOT EXISTS reward_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Sparkles',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. REWARD PRODUCTS (Physical Everyday Essentials)
CREATE TABLE IF NOT EXISTS reward_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  category_id TEXT REFERENCES reward_categories(id) ON DELETE SET NULL,
  description TEXT,
  package_size TEXT NOT NULL,
  image_url TEXT,
  coin_cost INTEGER NOT NULL CHECK (coin_cost > 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  cost_price_inr DECIMAL(10,2) DEFAULT 0.00,
  supplier_name TEXT,
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  availability_status TEXT DEFAULT 'available',
  sku TEXT,
  bundle_components TEXT[],
  min_order_value DECIMAL(10,2) DEFAULT 0.00,
  max_claims_per_customer INTEGER DEFAULT NULL,
  max_claims_per_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROGRAM SETTINGS
CREATE TABLE IF NOT EXISTS easy_coins_settings (
  id TEXT PRIMARY KEY DEFAULT 'default-settings',
  is_enabled BOOLEAN DEFAULT true,
  earn_rate_per_100_inr INTEGER DEFAULT 10,
  min_qualifying_order DECIMAL(10,2) DEFAULT 100.00,
  max_rewards_per_order INTEGER DEFAULT 1,
  coin_expiry_days INTEGER DEFAULT 365,
  bonus_first_order_coins INTEGER DEFAULT 20,
  bonus_repeat_order_coins INTEGER DEFAULT 0,
  allow_promotions BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ATOMIC AUDITABLE TRANSACTION LEDGER
CREATE TABLE IF NOT EXISTS easy_coins_ledger (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REWARD CLAIMS TABLE
CREATE TABLE IF NOT EXISTS reward_claims (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  reward_product_id TEXT REFERENCES reward_products(id) ON DELETE RESTRICT,
  reward_name_snapshot TEXT NOT NULL,
  brand_snapshot TEXT,
  package_size_snapshot TEXT NOT NULL,
  image_url_snapshot TEXT,
  coin_cost_snapshot INTEGER NOT NULL CHECK (coin_cost_snapshot >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  claim_status TEXT NOT NULL DEFAULT 'reserved',
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high-speed queries
CREATE INDEX IF NOT EXISTS idx_reward_products_category ON reward_products(category_id);
CREATE INDEX IF NOT EXISTS idx_reward_products_active ON reward_products(is_active);
CREATE INDEX IF NOT EXISTS idx_reward_products_archived ON reward_products(is_archived);
CREATE INDEX IF NOT EXISTS idx_reward_claims_order ON reward_claims(order_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_customer ON reward_claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_status ON reward_claims(claim_status);
CREATE INDEX IF NOT EXISTS idx_easy_coins_ledger_customer ON easy_coins_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_easy_coins_ledger_order ON easy_coins_ledger(order_id);

-- Enable RLS
ALTER TABLE reward_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE easy_coins_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE easy_coins_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public can view active reward categories" ON reward_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active reward products" ON reward_products FOR SELECT USING (is_active = true AND is_archived = false);
CREATE POLICY "Public can view program settings" ON easy_coins_settings FOR SELECT USING (true);
CREATE POLICY "Customers can view their own ledger" ON easy_coins_ledger FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can view their own claims" ON reward_claims FOR SELECT USING (auth.uid() = customer_id);
