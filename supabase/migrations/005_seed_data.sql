-- Migration 005: Seed Data for Gachibowli Launch

-- 1. Insert Initial Delivery Zone (Gachibowli Polygon)
INSERT INTO delivery_zones (
  id, name, slug, city, state, country, polygon, active, delivery_day, order_cutoff_day, delivery_promise, delivery_fee, minimum_order
) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Gachibowli',
  'gachibowli',
  'Hyderabad',
  'Telangana',
  'India',
  -- Polygon encompassing main Gachibowli IT hub / Gated Communities area
  ST_GeomFromText('POLYGON((78.3300 17.4300, 78.3700 17.4300, 78.3700 17.4600, 78.3300 17.4600, 78.3300 17.4300))', 4326),
  true,
  'Sunday',
  'Thursday',
  'Sunday by 6 PM',
  0.00,
  250.00
) ON CONFLICT (slug) DO NOTHING;

-- 2. Insert Delivery Area
INSERT INTO delivery_areas (id, zone_id, name, slug, pincodes, active) VALUES (
  'b2c3d4e5-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Gachibowli Central',
  'gachibowli-central',
  ARRAY['500032', '500081'],
  true
) ON CONFLICT DO NOTHING;

-- 3. Insert Sample Gated Communities
INSERT INTO delivery_locations (id, area_id, building_name, address, latitude, longitude, active) VALUES
  ('c3d4e5f6-0000-0000-0000-000000000003', 'b2c3d4e5-0000-0000-0000-000000000002', 'My Home Bhooja', 'Silpa Gram Craft Village, Gachibowli', 17.4435, 78.3772, true),
  ('c3d4e5f6-0000-0000-0000-000000000004', 'b2c3d4e5-0000-0000-0000-000000000002', 'Jayabheri Silicon County', 'Hitec City Road, Gachibowli', 17.4470, 78.3700, true),
  ('c3d4e5f6-0000-0000-0000-000000000005', 'b2c3d4e5-0000-0000-0000-000000000002', 'Aparna Cyber Life', 'Nallagandla - Gachibowli Rd', 17.4520, 78.3420, true)
ON CONFLICT DO NOTHING;

-- 4. Seed Categories
INSERT INTO product_categories (id, name, slug, description, active) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Staples', 'staples', 'Daily kitchen essential vegetables', true),
  ('11111111-0000-0000-0000-000000000002', 'Leafy Greens', 'leafy-greens', 'Fresh farm-picked leafy greens', true),
  ('11111111-0000-0000-0000-000000000003', 'Gourmet & Exotic', 'gourmet-exotic', 'Specialty local Telangana vegetables', true)
ON CONFLICT (slug) DO NOTHING;

-- 5. Seed Products
INSERT INTO products (id, name, slug, description, category_id, price, unit, image_url, active) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Country Tomato', 'country-tomato', 'Naturally ripened local country tomatoes', '11111111-0000-0000-0000-000000000001', 35.00, 'kg', '/images/vegetables/tomato.jpg', true),
  ('22222222-0000-0000-0000-000000000002', 'Purple Brinjal', 'purple-brinjal', 'Tender Telangana purple brinjals', '11111111-0000-0000-0000-000000000001', 40.00, 'kg', '/images/vegetables/brinjal.jpg', true),
  ('22222222-0000-0000-0000-000000000003', 'Fresh Palak (Spinach)', 'fresh-palak', 'Crisp pesticide-free palak leaves', '11111111-0000-0000-0000-000000000002', 25.00, 'bunch', '/images/vegetables/palak.jpg', true),
  ('22222222-0000-0000-0000-000000000004', 'Organic Carrot', 'organic-carrot', 'Sweet crunchy local carrots', '11111111-0000-0000-0000-000000000001', 50.00, 'kg', '/images/vegetables/carrot.jpg', true),
  ('22222222-0000-0000-0000-000000000005', 'Cluster Beans (Gwar)', 'cluster-beans', 'Freshly plucked cluster beans', '11111111-0000-0000-0000-000000000001', 45.00, 'kg', '/images/vegetables/beans.jpg', true),
  ('22222222-0000-0000-0000-000000000006', 'Lady Finger (Bhindi)', 'lady-finger', 'Tender green ladies finger', '11111111-0000-0000-0000-000000000001', 40.00, 'kg', '/images/vegetables/bhindi.jpg', true),
  ('22222222-0000-0000-0000-000000000007', 'Potato', 'potato', 'Farm fresh kitchen potatoes', '11111111-0000-0000-0000-000000000001', 30.00, 'kg', '/images/vegetables/potato.jpg', true),
  ('22222222-0000-0000-0000-000000000008', 'Red Onion', 'red-onion', 'Pungent Telangana red onions', '11111111-0000-0000-0000-000000000001', 35.00, 'kg', '/images/vegetables/onion.jpg', true)
ON CONFLICT (slug) DO NOTHING;

-- 6. Seed Baskets
INSERT INTO baskets (id, name, slug, description, price, image_url, active, sort_order) VALUES
  ('33333333-0000-0000-0000-000000000001', 'Staple Box', 'staple-box', 'Everyday essential vegetables for a small household (5-6 varieties, ~6-7 kg)', 250.00, '/images/hero-vegetables.png', true, 1),
  ('33333333-0000-0000-0000-000000000002', 'Green Box', 'green-box', 'More greens, seasonal veggies & essential staples for health-conscious homes (~8-9 kg)', 350.00, '/images/hero-vegetables.png', true, 2),
  ('33333333-0000-0000-0000-000000000003', 'Premium Box', 'premium-box', 'An abundant weekly selection for joint families with extra exotics & greens (~12-14 kg)', 500.00, '/images/hero-vegetables.png', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- 7. Seed Basket Items
INSERT INTO basket_items (basket_id, product_id, quantity, unit) VALUES
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 1.5, 'kg'),
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000007', 2.0, 'kg'),
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000008', 1.5, 'kg'),
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000006', 0.5, 'kg'),
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', 2.0, 'bunch'),

  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 2.0, 'kg'),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 1.0, 'kg'),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003', 4.0, 'bunch'),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004', 1.0, 'kg'),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000005', 0.5, 'kg'),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000007', 2.0, 'kg'),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000008', 2.0, 'kg'),

  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 3.0, 'kg'),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 1.5, 'kg'),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', 5.0, 'bunch'),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000004', 1.5, 'kg'),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000005', 1.0, 'kg'),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000006', 1.0, 'kg'),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000007', 3.0, 'kg'),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000008', 3.0, 'kg')
ON CONFLICT DO NOTHING;

-- 8. Seed Farmers (Telangana Local Farmers)
INSERT INTO farmers (id, name, phone, village, district, state, photo_url, description, upi_identifier, active) VALUES
  ('44444444-0000-0000-0000-000000000001', 'K. Rajamma', '+91 98490 12345', 'Chevella', 'Ranga Reddy', 'Telangana', '/images/farmers/rajamma.jpg', 'Grows organic leafy greens and country tomatoes using traditional compost methods for 18 years.', 'rajamma@upi', true),
  ('44444444-0000-0000-0000-000000000002', 'M. Suresh Reddy', '+91 97012 34567', 'Shankarpally', 'Ranga Reddy', 'Telangana', '/images/farmers/suresh.jpg', 'Specializes in drip-irrigated brinjal and root vegetables with zero chemical pesticides.', 'sureshreddy@upi', true),
  ('44444444-0000-0000-0000-000000000003', 'G. Lakshmi', '+91 99591 98765', 'Shamshabad', 'Ranga Reddy', 'Telangana', '/images/farmers/lakshmi.jpg', 'Pioneer in natural farming practices, supplying fresh cluster beans and ladies finger.', 'lakshmig@upi', true)
ON CONFLICT DO NOTHING;

-- 9. Seed Inventory
INSERT INTO inventory (product_id, available_quantity, reserved_quantity, unit) VALUES
  ('22222222-0000-0000-0000-000000000001', 500, 0, 'kg'),
  ('22222222-0000-0000-0000-000000000002', 300, 0, 'kg'),
  ('22222222-0000-0000-0000-000000000003', 400, 0, 'bunch'),
  ('22222222-0000-0000-0000-000000000004', 250, 0, 'kg'),
  ('22222222-0000-0000-0000-000000000005', 200, 0, 'kg'),
  ('22222222-0000-0000-0000-000000000006', 300, 0, 'kg'),
  ('22222222-0000-0000-0000-000000000007', 800, 0, 'kg'),
  ('22222222-0000-0000-0000-000000000008', 750, 0, 'kg')
ON CONFLICT (product_id) DO NOTHING;

-- 10. Seed Demo Testimonials
INSERT INTO testimonials (customer_name, content, rating, location, verified, is_demo, active) VALUES
  ('Priya Sharma', 'The vegetables in the Green Box arrive extraordinarily fresh every Sunday morning! Knowing it comes straight from Chevella farmers makes it even better.', 5, 'My Home Bhooja, Gachibowli', true, true, true),
  ('Vikram Malhotra', 'Saves my weekend trip to the crowded mandi. The Staple Box easily lasts our family of 3 through the week. Highly recommended!', 5, 'Jayabheri Silicon County, Gachibowli', true, true, true),
  ('Ananya Roy', 'Superb quality tomatoes and palak. The transparent pricing and farmer stories win my heart. Great service for Gachibowli IT folks.', 5, 'Aparna Cyber Life', true, true, true)
ON CONFLICT DO NOTHING;


