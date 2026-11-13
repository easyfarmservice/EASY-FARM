-- Migration 015: Update Order Cutoff to Saturday 11:59 PM and Expand Corridor Pincodes
-- Cutoff rule: Orders placed before Saturday 11:59:59 PM deliver on upcoming Sunday.
-- Orders placed after 12:00 AM (Sunday) deliver on the subsequent Sunday.

-- 1. Update defaults on delivery_zones table
ALTER TABLE delivery_zones
  ALTER COLUMN order_cutoff_day SET DEFAULT 'Saturday',
  ALTER COLUMN order_cutoff_time SET DEFAULT '23:59:59';

-- 2. Update existing active delivery zones
UPDATE delivery_zones
SET
  order_cutoff_day = 'Saturday',
  order_cutoff_time = '23:59:59',
  delivery_day = 'Sunday',
  delivery_promise = 'Sunday by 6 PM',
  updated_at = NOW()
WHERE active = true;

-- 3. Update business settings
INSERT INTO business_settings (key, value, description)
VALUES
  ('order_cutoff_day', '"Saturday"', 'Weekly order cutoff day'),
  ('order_cutoff_time', '"23:59:59"', 'Weekly order cutoff time (HH:mm:ss)'),
  ('delivery_day', '"Sunday"', 'Weekly delivery day')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 4. Update delivery areas to include all active corridor pincodes
UPDATE delivery_areas
SET
  pincodes = ARRAY['500088', '501301', '500098', '500039', '500092', '501401'],
  active = true
WHERE slug = 'singapore-township-pocharam' OR slug = 'ghatkesar-pocharam' OR name ILIKE '%pocharam%';

