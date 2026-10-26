-- ====================================================================
-- MIGRATION 011: EASY COINS REWARDS SYSTEM
-- Loyalty & Physical Rewards Program for Easy Farm (easyfarm.co.in)
-- ====================================================================

-- 1. REWARD CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS reward_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. REWARD PRODUCTS TABLE (Physical Essentials)
CREATE TABLE IF NOT EXISTS reward_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  category_id UUID REFERENCES reward_categories(id) ON DELETE SET NULL,
  description TEXT,
  package_size TEXT NOT NULL,
  image_url TEXT,
  coin_cost INTEGER NOT NULL CHECK (coin_cost > 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active BOOLEAN DEFAULT true,
  max_claims_per_customer INTEGER DEFAULT NULL,
  max_claims_per_order INTEGER DEFAULT 1,
  min_order_value DECIMAL(10,2) DEFAULT 0.00,
  cost_price_inr DECIMAL(10,2) DEFAULT 0.00,
  supplier_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EASY COINS SETTINGS TABLE (Configurable Program Rules)
CREATE TABLE IF NOT EXISTS easy_coins_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 4. EASY COINS TRANSACTION LEDGER (Auditable Atomic Ledger)
CREATE TABLE IF NOT EXISTS easy_coins_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- Positive for credits (earn/reverse), negative for debits (spend)
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('earned_order', 'redeemed_reward', 'reversed_cancellation', 'admin_adjustment', 'expired', 'bonus_promo')
  ),
  description TEXT NOT NULL,
  reference_id TEXT, -- E.g. payment_id or admin email
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REWARD CLAIMS TABLE (Linked to Orders & Delivery)
CREATE TABLE IF NOT EXISTS reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_product_id UUID NOT NULL REFERENCES reward_products(id) ON DELETE RESTRICT,
  reward_name_snapshot TEXT NOT NULL,
  package_size_snapshot TEXT NOT NULL,
  coin_cost_snapshot INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  claim_status TEXT NOT NULL DEFAULT 'reserved' CHECK (
    claim_status IN ('reserved', 'confirmed', 'packed', 'delivered', 'cancelled', 'released')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_reward_products_category ON reward_products(category_id);
CREATE INDEX IF NOT EXISTS idx_reward_products_active ON reward_products(is_active);
CREATE INDEX IF NOT EXISTS idx_easy_coins_ledger_customer ON easy_coins_ledger(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_easy_coins_ledger_order ON easy_coins_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_order ON reward_claims(order_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_customer ON reward_claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_status ON reward_claims(claim_status);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE reward_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE easy_coins_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE easy_coins_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;

-- 1. Reward Categories & Products: Public read for active, admin full access
DROP POLICY IF EXISTS "Public can view active reward categories" ON reward_categories;
CREATE POLICY "Public can view active reward categories"
  ON reward_categories FOR SELECT
  USING (is_active = true OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role = 'admin')));

DROP POLICY IF EXISTS "Admins have full access to reward categories" ON reward_categories;
CREATE POLICY "Admins have full access to reward categories"
  ON reward_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Public can view active reward products" ON reward_products;
CREATE POLICY "Public can view active reward products"
  ON reward_products FOR SELECT
  USING (is_active = true OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role = 'admin')));

DROP POLICY IF EXISTS "Admins have full access to reward products" ON reward_products;
CREATE POLICY "Admins have full access to reward products"
  ON reward_products FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role = 'admin'));

-- 2. Easy Coins Settings: Public read, Admin manage
DROP POLICY IF EXISTS "Public can view easy coins settings" ON easy_coins_settings;
CREATE POLICY "Public can view easy coins settings"
  ON easy_coins_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage easy coins settings" ON easy_coins_settings;
CREATE POLICY "Admins can manage easy coins settings"
  ON easy_coins_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role = 'admin'));

-- 3. Easy Coins Ledger: Customer views own, Admin views all
DROP POLICY IF EXISTS "Customers view own easy coins ledger" ON easy_coins_ledger;
CREATE POLICY "Customers view own easy coins ledger"
  ON easy_coins_ledger FOR SELECT
  USING (
    customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role = 'admin'))
  );

-- 4. Reward Claims: Customer views own, Admin views all
DROP POLICY IF EXISTS "Customers view own reward claims" ON reward_claims;
CREATE POLICY "Customers view own reward claims"
  ON reward_claims FOR SELECT
  USING (
    customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role = 'admin'))
  );

DROP POLICY IF EXISTS "Admins can manage reward claims" ON reward_claims;
CREATE POLICY "Admins can manage reward claims"
  ON reward_claims FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.role = 'admin'));

-- ====================================================================
-- SEED DATA (Genuine Lawful Essentials Catalog & Initial Settings)
-- ====================================================================

-- Insert Default Settings
INSERT INTO easy_coins_settings (is_enabled, earn_rate_per_100_inr, min_qualifying_order, max_rewards_per_order, coin_expiry_days, bonus_first_order_coins)
SELECT true, 10, 100.00, 1, 365, 20
WHERE NOT EXISTS (SELECT 1 FROM easy_coins_settings);

-- Insert Reward Categories
INSERT INTO reward_categories (name, slug, description, icon, sort_order)
VALUES
  ('Oral Care', 'oral-care', 'Toothpastes, brushes and dental essentials', 'Sparkles', 1),
  ('Bath & Personal Care', 'bath-personal-care', 'Soaps, shampoos and hair care', 'Smile', 2),
  ('Household Cleaning', 'household-cleaning', 'Dishwash bars, detergents and scrubbers', 'Shield', 3),
  ('Kitchen Essentials', 'kitchen-essentials', 'Food bags, kitchen wipes and reusable bags', 'Package', 4),
  ('Daily Personal Essentials', 'daily-personal-essentials', 'Combs, tissues and personal hygiene', 'Heart', 5),
  ('Everyday Utility', 'everyday-utility', 'Pens, notebooks, batteries and stationery', 'Compass', 6),
  ('Family Essentials Bundles', 'family-bundles', 'Curated bundles of high-use everyday products', 'Gift', 7)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Insert Genuine Everyday Reward Products
DO $$
DECLARE
  cat_oral UUID;
  cat_bath UUID;
  cat_clean UUID;
  cat_kitchen UUID;
  cat_personal UUID;
  cat_utility UUID;
  cat_bundle UUID;
BEGIN
  SELECT id INTO cat_oral FROM reward_categories WHERE slug = 'oral-care';
  SELECT id INTO cat_bath FROM reward_categories WHERE slug = 'bath-personal-care';
  SELECT id INTO cat_clean FROM reward_categories WHERE slug = 'household-cleaning';
  SELECT id INTO cat_kitchen FROM reward_categories WHERE slug = 'kitchen-essentials';
  SELECT id INTO cat_personal FROM reward_categories WHERE slug = 'daily-personal-essentials';
  SELECT id INTO cat_utility FROM reward_categories WHERE slug = 'everyday-utility';
  SELECT id INTO cat_bundle FROM reward_categories WHERE slug = 'family-bundles';

  -- Oral Care
  INSERT INTO reward_products (name, brand, category_id, description, package_size, image_url, coin_cost, stock_quantity, cost_price_inr, supplier_name)
  VALUES
    ('Dabur Red Ayurvedic Toothpaste', 'Dabur', cat_oral, 'Traditional herbal ayurvedic toothpaste for complete dental protection.', '100g Tube', '/images/rewards/dabur-red.jpg', 40, 50, 42.00, 'Direct Wholesale'),
    ('Colgate ZigZag Deep Clean Toothbrushes', 'Colgate', cat_oral, 'Multi-angle cross bristles for deep interdental plaque removal.', 'Pack of 2', '/images/rewards/colgate-zigzag.jpg', 35, 60, 36.00, 'Direct Wholesale'),
    
    -- Bath & Personal Care
    ('Medimix 18 Herbs Ayurvedic Bathing Soap', 'Medimix', cat_bath, 'Nourishing herbal formulation proven to prevent blemishes and skin dryness.', '125g Bar', '/images/rewards/medimix-soap.jpg', 30, 75, 32.00, 'Direct Wholesale'),
    ('Dettol Original Germ Protection Bathing Soap', 'Dettol', cat_bath, 'Trusted antibacterial protection for the whole family.', '75g x 3 Multipack', '/images/rewards/dettol-multipack.jpg', 75, 40, 85.00, 'Direct Wholesale'),
    ('Parachute 100% Pure Coconut Hair Oil', 'Parachute', cat_bath, 'Naturally filtered pure coconut oil for nourishment and scalp health.', '100ml Bottle', '/images/rewards/parachute-oil.jpg', 45, 55, 46.00, 'Direct Wholesale'),

    -- Household Cleaning
    ('Vim Lemon Dishwash Bar with Polycoat', 'Vim', cat_clean, 'Cuts tough grease from stainless steel utensils and ceramic cookware.', '200g Bar', '/images/rewards/vim-bar.jpg', 25, 90, 22.00, 'Direct Wholesale'),
    ('Scotch-Brite Heavy Duty Scrub Pad', 'Scotch-Brite', cat_clean, 'Durable fiber scrub pads with superior stain removing efficiency.', 'Pack of 3', '/images/rewards/scotch-brite.jpg', 35, 70, 35.00, 'Direct Wholesale'),
    ('Surf Excel Easy Wash Detergent Powder', 'Surf Excel', cat_clean, 'Superior stain removal technology in bucket wash for everyday laundry.', '500g Pack', '/images/rewards/surf-excel.jpg', 65, 45, 70.00, 'Direct Wholesale'),

    -- Kitchen Essentials
    ('Reusable Heavy-Duty Cotton Grocery Carry Bag', 'Easy Farm Eco', cat_kitchen, '100% biodegradable unbleached cotton bag with reinforced carrying handles.', 'Standard 15L', '/images/rewards/cotton-bag.jpg', 50, 80, 48.00, 'Local Artisan Guild'),
    ('Multipurpose Cotton Kitchen Wipes', 'CleanHome', cat_kitchen, 'Ultra-absorbent lint-free cotton towels for wiping counters and dishes.', 'Pack of 2', '/images/rewards/kitchen-wipes.jpg', 40, 65, 38.00, 'Direct Wholesale'),

    -- Daily Personal Essentials
    ('Handcrafted Neem Wood Pocket Comb', 'PureRoots', cat_personal, 'Anti-static organic neem wood comb that prevents dandruff and detangles gently.', '1 Piece', '/images/rewards/neem-comb.jpg', 30, 60, 28.00, 'Telangana Handicrafts'),
    ('Origami Soft 3-Ply Pocket Tissues', 'Origami', cat_personal, 'Gentle on skin, compact travel-friendly pocket tissue packs.', 'Pack of 6', '/images/rewards/pocket-tissues.jpg', 25, 80, 24.00, 'Direct Wholesale'),

    -- Everyday Utility
    ('Duracell Chota Power AAA Alkaline Batteries', 'Duracell', cat_utility, 'Long-lasting power for TV remotes, kitchen weighing scales and clocks.', 'Pack of 2', '/images/rewards/duracell-aaa.jpg', 40, 50, 44.00, 'Direct Wholesale'),
    ('Classmate Pulse Spiral Bound Long Notebook', 'Classmate', cat_utility, 'Single lined 160 pages notebook with smooth chlorine-free paper.', '160 Pages', '/images/rewards/classmate-notebook.jpg', 45, 40, 45.00, 'Direct Wholesale'),

    -- Bundles
    ('Morning Freshness & Oral Care Bundle', 'Easy Farm Essentials', cat_bundle, 'Includes Dabur Red Ayurvedic Toothpaste (100g) and Colgate ZigZag (Pack of 2).', '2 Products', '/images/rewards/oral-bundle.jpg', 70, 30, 75.00, 'In-house Packaged'),
    ('Pure Hygiene Bath & Kitchen Care Bundle', 'Easy Farm Essentials', cat_bundle, 'Includes Medimix 125g Soap, Vim 200g Dishwash Bar, and Scotch-Brite (Pack of 3).', '3 Products', '/images/rewards/hygiene-bundle.jpg', 80, 30, 88.00, 'In-house Packaged')
  ON CONFLICT DO NOTHING;
END $$;
