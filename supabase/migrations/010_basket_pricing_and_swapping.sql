-- Migration 010: Basket Pricing, Product Management & Weekly Item Swapping System
-- Safe, non-destructive migration that extends baskets, products, and introduces weekly planners & customer swapping.

-- 1. Extend baskets table with business pricing & swap configuration
ALTER TABLE baskets
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS calculated_price DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pricing_mode TEXT NOT NULL DEFAULT 'manual', -- 'auto' or 'manual'
  ADD COLUMN IF NOT EXISTS packing_cost DECIMAL(10,2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS target_margin_pct DECIMAL(5,2) DEFAULT 25.00,
  ADD COLUMN IF NOT EXISTS market_reference_price DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS market_reference_source TEXT DEFAULT 'Telangana Mandi Benchmark',
  ADD COLUMN IF NOT EXISTS market_reference_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_customizable BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_swaps INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS items_count INT DEFAULT 5;

-- 2. Extend products table with procurement costs, market pricing, and swap eligibility
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS cost_unit TEXT DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS market_price DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS market_source TEXT DEFAULT 'Bowenpally / Chevella Mandi',
  ADD COLUMN IF NOT EXISTS market_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_seasonal BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_swap_eligible BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS eligible_baskets TEXT[] DEFAULT ARRAY['staple-box', 'green-box', 'premium-box', 'custom-basket'];

-- 3. Extend basket_items table with item-level cost snapshots and sort order
ALTER TABLE basket_items
  ADD COLUMN IF NOT EXISTS unit_cost_price DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS market_price_ref DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT FALSE;

-- 4. Create or extend weekly_baskets table (weekly delivery planner)
CREATE TABLE IF NOT EXISTS weekly_baskets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  basket_id UUID REFERENCES baskets(id) ON DELETE CASCADE,
  delivery_date DATE,
  week_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published', -- 'draft', 'published', 'closed'
  cutoff_datetime TIMESTAMPTZ,
  items_count INT NOT NULL DEFAULT 5,
  selling_price DECIMAL(10,2) DEFAULT 0.00,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  market_price DECIMAL(10,2) DEFAULT 0.00,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure delivery_date and all planner columns exist even if weekly_baskets was created by an earlier migration
ALTER TABLE weekly_baskets
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS market_price DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS cutoff_datetime TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS items_count INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_baskets_basket_delivery 
  ON weekly_baskets(basket_id, delivery_date) 
  WHERE delivery_date IS NOT NULL;

-- 5. Create weekly_basket_items table (5 default products + items per week)
CREATE TABLE IF NOT EXISTS weekly_basket_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_basket_id UUID REFERENCES weekly_baskets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  cost_price DECIMAL(10,2) DEFAULT 0.00,
  selling_price DECIMAL(10,2) DEFAULT 0.00,
  market_price DECIMAL(10,2) DEFAULT 0.00,
  sort_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(weekly_basket_id, product_id)
);

-- 6. Create customer_basket_customizations table (customer item swapping)
CREATE TABLE IF NOT EXISTS customer_basket_customizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  weekly_basket_id UUID REFERENCES weekly_baskets(id) ON DELETE CASCADE,
  basket_id UUID REFERENCES baskets(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'customized', -- 'customized', 'confirmed', 'locked'
  swaps_count INT NOT NULL DEFAULT 0,
  selected_items JSONB NOT NULL DEFAULT '[]', -- array of exactly 5 selected items
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, weekly_basket_id)
);

-- 7. Create product_substitutions table (audit trail for unavailable replacements)
CREATE TABLE IF NOT EXISTS product_substitutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  replacement_product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  affected_delivery_date DATE NOT NULL,
  reason TEXT NOT NULL,
  admin_name TEXT NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Ensure Custom Basket exists
INSERT INTO baskets (
  id,
  name,
  slug,
  description,
  price,
  image_url,
  active,
  sort_order,
  is_customizable,
  max_swaps,
  items_count
) VALUES (
  '33333333-0000-0000-0000-000000000004',
  'Custom Basket',
  'custom-basket',
  'Fully customizable vegetable basket tailored to your family kitchen preferences.',
  450.00,
  '/images/hero-vegetables.png',
  true,
  4,
  true,
  99,
  5
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  is_customizable = true;

-- 9. Performance indexes
CREATE INDEX IF NOT EXISTS idx_weekly_baskets_delivery_date ON weekly_baskets(delivery_date);
CREATE INDEX IF NOT EXISTS idx_weekly_baskets_status ON weekly_baskets(status);
CREATE INDEX IF NOT EXISTS idx_weekly_basket_items_basket ON weekly_basket_items(weekly_basket_id);
CREATE INDEX IF NOT EXISTS idx_customer_customizations_lookup ON customer_basket_customizations(customer_id, delivery_date);

-- 10. Enable RLS
ALTER TABLE weekly_baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_basket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_basket_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_substitutions ENABLE ROW LEVEL SECURITY;

-- Public can view published weekly baskets
DROP POLICY IF EXISTS "Public view published weekly baskets" ON weekly_baskets;
CREATE POLICY "Public view published weekly baskets"
  ON weekly_baskets FOR SELECT
  USING (status = 'published' OR is_admin());

DROP POLICY IF EXISTS "Public view weekly basket items" ON weekly_basket_items;
CREATE POLICY "Public view weekly basket items"
  ON weekly_basket_items FOR SELECT
  USING (true);

-- Customers can view and update their own customizations
DROP POLICY IF EXISTS "Customers manage own customizations" ON customer_basket_customizations;
CREATE POLICY "Customers manage own customizations"
  ON customer_basket_customizations FOR ALL
  USING (customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR is_admin())
  WITH CHECK (customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR is_admin());

-- Admins can manage all weekly records & substitutions
DROP POLICY IF EXISTS "Admins manage weekly baskets" ON weekly_baskets;
CREATE POLICY "Admins manage weekly baskets"
  ON weekly_baskets FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Admins manage weekly basket items" ON weekly_basket_items;
CREATE POLICY "Admins manage weekly basket items"
  ON weekly_basket_items FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Admins manage substitutions" ON product_substitutions;
CREATE POLICY "Admins manage substitutions"
  ON product_substitutions FOR ALL
  USING (is_admin());
