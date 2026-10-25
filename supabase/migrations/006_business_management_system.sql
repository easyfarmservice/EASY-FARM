-- Migration 006: Business Management System (Pricing, Basket Contents, Discounts, Coupons, Delivery & Settings)

-- 1. Extend Baskets Table with Business Controls
ALTER TABLE baskets 
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS additional_images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS stock INT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_orders INT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS min_order_qty INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_order_qty INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- 2. Discounts Table
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT,
  type TEXT NOT NULL DEFAULT 'percent', -- 'percent' or 'fixed'
  value DECIMAL(10,2) NOT NULL,
  applicable_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'baskets', 'products'
  applicable_ids TEXT[] DEFAULT '{}',
  min_order_value DECIMAL(10,2) DEFAULT 0.00,
  max_discount_amount DECIMAL(10,2),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  usage_limit INT,
  used_count INT DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed' or 'percent'
  value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2) DEFAULT 0.00,
  max_discount DECIMAL(10,2),
  start_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  usage_limit INT,
  per_user_limit INT DEFAULT 1,
  applicable_baskets TEXT[] DEFAULT '{}',
  applicable_products TEXT[] DEFAULT '{}',
  allow_stacking BOOLEAN DEFAULT false,
  used_count INT DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Coupon Usage Tracking Table
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_email TEXT,
  order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Price History Audit Log Table
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL, -- 'basket' or 'product'
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  old_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL,
  old_compare_at DECIMAL(10,2),
  new_compare_at DECIMAL(10,2),
  changed_by TEXT NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. General Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id TEXT,
  admin_name TEXT NOT NULL DEFAULT 'Admin',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Weekly Baskets Capacity & Delivery Planner Table
CREATE TABLE IF NOT EXISTS weekly_baskets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  basket_id UUID REFERENCES baskets(id) ON DELETE CASCADE,
  delivery_date DATE,
  week_label TEXT NOT NULL, -- e.g. "Sep 07 - Sep 13"
  available_capacity INT NOT NULL DEFAULT 100,
  ordered_capacity INT NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  selling_price DECIMAL(10,2) DEFAULT 0.00,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  market_price DECIMAL(10,2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'published', -- 'draft', 'published', 'available', 'sold_out', 'closed'
  cutoff_datetime TIMESTAMPTZ,
  items_count INT NOT NULL DEFAULT 5,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(week_label, basket_id)
);

-- 8. Business Settings Table (Key-Value Store)
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial Business Settings
INSERT INTO business_settings (key, value, description)
VALUES 
  ('order_cutoff_day', '"Thursday"', 'Weekly order cutoff day'),
  ('order_cutoff_time', '"23:59"', 'Weekly order cutoff time (HH:mm)'),
  ('delivery_day', '"Sunday"', 'Weekly delivery day'),
  ('delivery_promise', '"Sunday by 6 PM"', 'Customer delivery promise text'),
  ('base_delivery_fee', '40.00', 'Standard delivery fee in INR'),
  ('free_delivery_threshold', '499.00', 'Minimum subtotal for free delivery'),
  ('minimum_order_value', '250.00', 'Minimum order amount in INR'),
  ('allow_coupon_stacking', 'false', 'Allow coupon discount to stack with sale prices'),
  ('support_phone', '"+91 98490 12345"', 'Support phone number'),
  ('support_email', '"support@easyfarm.in"', 'Support email address')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();
