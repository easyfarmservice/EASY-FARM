-- Migration 008: Ghatkesar Delivery Zones, PostGIS Polygon, and Delivery Admin RLS
-- This migration ensures the database is the authoritative source for delivery serviceability.

-- 1. Deactivate old legacy Gachibowli zone
UPDATE delivery_zones
SET active = false, updated_at = NOW()
WHERE slug = 'gachibowli';

-- 2. Insert or Update Ghatkesar & Pocharam Delivery Zone
-- Polygon bounds: West 78.6300, East 78.7200, South 17.4100, North 17.4800
-- Encompasses Singapore Township (Sanskruti), Emerald Heights, Pocharam IT Corridor,
-- Modi Emerald Park, and Ghatkesar Town center.
INSERT INTO delivery_zones (
  id,
  name,
  slug,
  city,
  state,
  country,
  polygon,
  active,
  delivery_day,
  order_cutoff_day,
  order_cutoff_time,
  delivery_promise,
  delivery_fee,
  minimum_order,
  created_at,
  updated_at
) VALUES (
  'e1f2a3b4-0000-0000-0000-000000000001',
  'Ghatkesar & Pocharam',
  'ghatkesar-pocharam',
  'Hyderabad',
  'Telangana',
  'India',
  ST_GeomFromText('POLYGON((78.6300 17.4100, 78.7200 17.4100, 78.7200 17.4800, 78.6300 17.4800, 78.6300 17.4100))', 4326),
  true,
  'Sunday',
  'Thursday',
  '23:59:50',
  'Sunday by 6 PM',
  0.00,
  250.00,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  polygon = EXCLUDED.polygon,
  active = EXCLUDED.active,
  delivery_day = EXCLUDED.delivery_day,
  order_cutoff_day = EXCLUDED.order_cutoff_day,
  order_cutoff_time = EXCLUDED.order_cutoff_time,
  delivery_promise = EXCLUDED.delivery_promise,
  delivery_fee = EXCLUDED.delivery_fee,
  minimum_order = EXCLUDED.minimum_order,
  updated_at = NOW();

-- 3. Insert or Update Delivery Area for Singapore Township & Pocharam
INSERT INTO delivery_areas (
  id,
  zone_id,
  name,
  slug,
  pincodes,
  active,
  created_at
) VALUES (
  'f2a3b4c5-0000-0000-0000-000000000002',
  'e1f2a3b4-0000-0000-0000-000000000001',
  'Singapore Township & Pocharam Corridor',
  'singapore-township-pocharam',
  ARRAY['500088', '501301', '500098'],
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  zone_id = EXCLUDED.zone_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  pincodes = EXCLUDED.pincodes,
  active = EXCLUDED.active;

-- 4. Sample Gated Communities in Ghatkesar Area
INSERT INTO delivery_locations (id, area_id, building_name, address, latitude, longitude, active) VALUES
  ('a1b2c3d4-1111-0000-0000-000000000001', 'f2a3b4c5-0000-0000-0000-000000000002', 'Singapore Township (Sanskruti)', 'Pocharam, Ghatkesar Road', 17.4475, 78.6534, true),
  ('a1b2c3d4-1111-0000-0000-000000000002', 'f2a3b4c5-0000-0000-0000-000000000002', 'Emerald Heights', 'Pocharam IT Corridor, Ghatkesar', 17.4520, 78.6650, true),
  ('a1b2c3d4-1111-0000-0000-000000000003', 'f2a3b4c5-0000-0000-0000-000000000002', 'Modi Emerald Park', 'Near Ghatkesar Town', 17.4410, 78.6750, true)
ON CONFLICT DO NOTHING;

-- 5. Strengthen RLS for Delivery Hierarchy Management
DROP POLICY IF EXISTS "Admins can manage delivery zones" ON delivery_zones;
CREATE POLICY "Admins can manage delivery zones"
  ON delivery_zones FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can manage delivery areas" ON delivery_areas;
CREATE POLICY "Admins can manage delivery areas"
  ON delivery_areas FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can manage delivery locations" ON delivery_locations;
CREATE POLICY "Admins can manage delivery locations"
  ON delivery_locations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
