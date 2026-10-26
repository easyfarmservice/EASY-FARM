-- ====================================================================
-- EASY FARM COMPLETE DATABASE SETUP & MIGRATION SCRIPT
-- Paste and run this in your new Supabase project SQL Editor in one click.
-- ====================================================================


-- ====================================================================
-- MIGRATION: 001_enable_extensions.sql
-- ====================================================================

-- Migration 001: Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ====================================================================
-- MIGRATION: 002_create_tables-sandeep.sql
-- ====================================================================

-- Migration 002: Create Tables

-- Roles Enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'admin', 'farmer', 'delivery_manager');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Order Status Enum
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending_payment',
    'confirmed',
    'processing',
    'packed',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment Status Enum
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'captured', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);

-- 2. Farmers Table
CREATE TABLE IF NOT EXISTS farmers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  village TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Telangana',
  photo_url TEXT,
  description TEXT,
  upi_identifier TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Farmer Documents
CREATE TABLE IF NOT EXISTS farmer_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  price DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Baskets Table
CREATE TABLE IF NOT EXISTS baskets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Basket Items
CREATE TABLE IF NOT EXISTS basket_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  basket_id UUID REFERENCES baskets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  UNIQUE(basket_id, product_id)
);

-- 8. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  available_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  low_stock_threshold DECIMAL(10,2) DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Delivery Zones (Geofenced with PostGIS)
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL DEFAULT 'Hyderabad',
  state TEXT NOT NULL DEFAULT 'Telangana',
  country TEXT NOT NULL DEFAULT 'India',
  polygon GEOMETRY(POLYGON, 4326),
  active BOOLEAN NOT NULL DEFAULT false,
  delivery_day TEXT NOT NULL DEFAULT 'Sunday',
  order_cutoff_day TEXT NOT NULL DEFAULT 'Thursday',
  order_cutoff_time TIME NOT NULL DEFAULT '23:59:50',
  delivery_promise TEXT NOT NULL DEFAULT 'Before 6 PM Sunday',
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  minimum_order DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for Spatial Polygon Querying
CREATE INDEX IF NOT EXISTS delivery_zones_polygon_idx ON delivery_zones USING GIST (polygon);

-- 10. Delivery Areas
CREATE TABLE IF NOT EXISTS delivery_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID REFERENCES delivery_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  pincodes TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Delivery Locations (Gated Communities/Apartments)
CREATE TABLE IF NOT EXISTS delivery_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID REFERENCES delivery_areas(id) ON DELETE CASCADE,
  building_name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Customer Addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  full_address TEXT NOT NULL,
  apartment TEXT,
  locality TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Hyderabad',
  state TEXT NOT NULL DEFAULT 'Telangana',
  pincode TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  delivery_zone_id UUID REFERENCES delivery_zones(id),
  delivery_area_id UUID REFERENCES delivery_areas(id),
  delivery_location_id UUID REFERENCES delivery_locations(id),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  address_id UUID REFERENCES customer_addresses(id),
  delivery_zone_id UUID REFERENCES delivery_zones(id),
  delivery_area_id UUID REFERENCES delivery_areas(id),
  delivery_location_id UUID REFERENCES delivery_locations(id),
  status order_status NOT NULL DEFAULT 'pending_payment',
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  delivery_date DATE NOT NULL,
  order_window_start TIMESTAMPTZ,
  order_window_end TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  basket_id UUID REFERENCES baskets(id),
  basket_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL
);

-- 15. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT,
  provider_payment_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'pending',
  method TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Deliveries Table
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  status order_status NOT NULL DEFAULT 'confirmed',
  assigned_to UUID REFERENCES profiles(id),
  estimated_time TIMESTAMPTZ,
  actual_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Waitlist Table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  pincode TEXT NOT NULL,
  locality TEXT NOT NULL,
  apartment TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, pincode)
);

-- 18. Farmer Payments Transparency Table
CREATE TABLE IF NOT EXISTS farmer_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
  produce TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  rate DECIMAL(10,2) NOT NULL,
  benchmark_rate DECIMAL(10,2) NOT NULL,
  farmer_rate DECIMAL(10,2) NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_reference TEXT NOT NULL,
  payment_date DATE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Testimonials Table
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 5,
  location TEXT NOT NULL DEFAULT 'Gachibowli',
  verified BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{"all": true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. Transparency Records (for QR Verification)
CREATE TABLE IF NOT EXISTS transparency_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  farmer_payment_id UUID REFERENCES farmer_payments(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ====================================================================
-- MIGRATION: 002_create_tables.sql
-- ====================================================================

-- Migration 002: Create Tables

-- Roles Enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'admin', 'farmer', 'delivery_manager');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Order Status Enum
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending_payment',
    'confirmed',
    'processing',
    'packed',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment Status Enum
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'captured', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);

-- 2. Farmers Table
CREATE TABLE IF NOT EXISTS farmers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  village TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Telangana',
  photo_url TEXT,
  description TEXT,
  upi_identifier TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Farmer Documents
CREATE TABLE IF NOT EXISTS farmer_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  price DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Baskets Table
CREATE TABLE IF NOT EXISTS baskets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Basket Items
CREATE TABLE IF NOT EXISTS basket_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  basket_id UUID REFERENCES baskets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  UNIQUE(basket_id, product_id)
);

-- 8. Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  available_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  low_stock_threshold DECIMAL(10,2) DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Delivery Zones (Geofenced with PostGIS)
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL DEFAULT 'Hyderabad',
  state TEXT NOT NULL DEFAULT 'Telangana',
  country TEXT NOT NULL DEFAULT 'India',
  polygon GEOMETRY(POLYGON, 4326),
  active BOOLEAN NOT NULL DEFAULT false,
  delivery_day TEXT NOT NULL DEFAULT 'Sunday',
  order_cutoff_day TEXT NOT NULL DEFAULT 'Thursday',
  order_cutoff_time TIME NOT NULL DEFAULT '23:59:50',
  delivery_promise TEXT NOT NULL DEFAULT 'Before 6 PM Sunday',
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  minimum_order DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for Spatial Polygon Querying
CREATE INDEX IF NOT EXISTS delivery_zones_polygon_idx ON delivery_zones USING GIST (polygon);

-- 10. Delivery Areas
CREATE TABLE IF NOT EXISTS delivery_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID REFERENCES delivery_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  pincodes TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Delivery Locations (Gated Communities/Apartments)
CREATE TABLE IF NOT EXISTS delivery_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID REFERENCES delivery_areas(id) ON DELETE CASCADE,
  building_name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Customer Addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  full_address TEXT NOT NULL,
  apartment TEXT,
  locality TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Hyderabad',
  state TEXT NOT NULL DEFAULT 'Telangana',
  pincode TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  delivery_zone_id UUID REFERENCES delivery_zones(id),
  delivery_area_id UUID REFERENCES delivery_areas(id),
  delivery_location_id UUID REFERENCES delivery_locations(id),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  address_id UUID REFERENCES customer_addresses(id),
  delivery_zone_id UUID REFERENCES delivery_zones(id),
  delivery_area_id UUID REFERENCES delivery_areas(id),
  delivery_location_id UUID REFERENCES delivery_locations(id),
  status order_status NOT NULL DEFAULT 'pending_payment',
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  delivery_date DATE NOT NULL,
  order_window_start TIMESTAMPTZ,
  order_window_end TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  basket_id UUID REFERENCES baskets(id),
  basket_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL
);

-- 15. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT,
  provider_payment_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'pending',
  method TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Deliveries Table
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  status order_status NOT NULL DEFAULT 'confirmed',
  assigned_to UUID REFERENCES profiles(id),
  estimated_time TIMESTAMPTZ,
  actual_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Waitlist Table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  pincode TEXT NOT NULL,
  locality TEXT NOT NULL,
  apartment TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, pincode)
);

-- 18. Farmer Payments Transparency Table
CREATE TABLE IF NOT EXISTS farmer_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
  produce TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  rate DECIMAL(10,2) NOT NULL,
  benchmark_rate DECIMAL(10,2) NOT NULL,
  farmer_rate DECIMAL(10,2) NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_reference TEXT NOT NULL,
  payment_date DATE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Testimonials Table
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 5,
  location TEXT NOT NULL DEFAULT 'Gachibowli',
  verified BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{"all": true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. Transparency Records (for QR Verification)
CREATE TABLE IF NOT EXISTS transparency_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  farmer_payment_id UUID REFERENCES farmer_payments(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ====================================================================
-- MIGRATION: 003_rls_policies-sandeep.sql
-- ====================================================================

-- Migration 003: Row Level Security (RLS) Policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE basket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transparency_records ENABLE ROW LEVEL SECURITY;

-- Helper function to check if auth user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') OR auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid() AND p.role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM profiles p
    JOIN admin_users a ON a.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are readable by owner or admin" ON profiles;
CREATE POLICY "Public profiles are readable by owner or admin"
  ON profiles FOR SELECT
  USING (auth.uid() = auth_user_id OR is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (is_admin());

-- Farmers Policies
DROP POLICY IF EXISTS "Public can view active farmers" ON farmers;
CREATE POLICY "Public can view active farmers"
  ON farmers FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage farmers" ON farmers;
CREATE POLICY "Admins can manage farmers"
  ON farmers FOR ALL
  USING (is_admin());

-- Products & Categories Policies
DROP POLICY IF EXISTS "Public can view active categories" ON product_categories;
CREATE POLICY "Public can view active categories"
  ON product_categories FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (is_admin());

-- Baskets & Items Policies
DROP POLICY IF EXISTS "Public can view active baskets" ON baskets;
CREATE POLICY "Public can view active baskets"
  ON baskets FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Public can view basket items" ON basket_items;
CREATE POLICY "Public can view basket items"
  ON basket_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage baskets" ON baskets;
CREATE POLICY "Admins can manage baskets"
  ON baskets FOR ALL
  USING (is_admin());

-- Delivery Zones / Areas / Locations
DROP POLICY IF EXISTS "Public can view active delivery zones" ON delivery_zones;
CREATE POLICY "Public can view active delivery zones"
  ON delivery_zones FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Public can view active delivery areas" ON delivery_areas;
CREATE POLICY "Public can view active delivery areas"
  ON delivery_areas FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Public can view active delivery locations" ON delivery_locations;
CREATE POLICY "Public can view active delivery locations"
  ON delivery_locations FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage delivery hierarchy" ON delivery_zones;
CREATE POLICY "Admins can manage delivery hierarchy"
  ON delivery_zones FOR ALL USING (is_admin());

-- Customer Addresses Policies
DROP POLICY IF EXISTS "Customers can manage own addresses" ON customer_addresses;
CREATE POLICY "Customers can manage own addresses"
  ON customer_addresses FOR ALL
  USING (customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR is_admin())
  WITH CHECK (customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR is_admin());

-- Orders & Order Items Policies
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR is_admin());

DROP POLICY IF EXISTS "Customers can insert own orders" ON orders;
CREATE POLICY "Customers can insert own orders"
  ON orders FOR INSERT
  WITH CHECK (
    customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    AND status = 'pending_payment'
  );

DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders"
  ON orders FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Customers can view own order items" ON order_items;
CREATE POLICY "Customers can view own order items"
  ON order_items FOR SELECT
  USING (order_id IN (
    SELECT id FROM orders WHERE customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  ) OR is_admin());

-- Payments Policies
DROP POLICY IF EXISTS "Customers can view own payments" ON payments;
CREATE POLICY "Customers can view own payments"
  ON payments FOR SELECT
  USING (order_id IN (
    SELECT id FROM orders WHERE customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  ) OR is_admin());

-- Waitlist Policies
DROP POLICY IF EXISTS "Anyone can join waitlist" ON waitlist;
CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view waitlist" ON waitlist;
CREATE POLICY "Admins can view waitlist"
  ON waitlist FOR SELECT
  USING (is_admin());

-- Testimonials Policies
DROP POLICY IF EXISTS "Public can view active testimonials" ON testimonials;
CREATE POLICY "Public can view active testimonials"
  ON testimonials FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage testimonials" ON testimonials;
CREATE POLICY "Admins can manage testimonials"
  ON testimonials FOR ALL
  USING (is_admin());

-- Transparency Records
DROP POLICY IF EXISTS "Public can view transparency records" ON transparency_records;
CREATE POLICY "Public can view transparency records"
  ON transparency_records FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can view farmer payments linked to transparency" ON farmer_payments;
CREATE POLICY "Public can view farmer payments linked to transparency"
  ON farmer_payments FOR SELECT
  USING (true);


-- ====================================================================
-- MIGRATION: 003_rls_policies.sql
-- ====================================================================

-- Migration 003: Row Level Security (RLS) Policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE basket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transparency_records ENABLE ROW LEVEL SECURITY;

-- Helper function to check if auth user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') OR auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid() AND p.role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM profiles p
    JOIN admin_users a ON a.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are readable by owner or admin" ON profiles;
CREATE POLICY "Public profiles are readable by owner or admin"
  ON profiles FOR SELECT
  USING (auth.uid() = auth_user_id OR is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (is_admin());

-- Farmers Policies
DROP POLICY IF EXISTS "Public can view active farmers" ON farmers;
CREATE POLICY "Public can view active farmers"
  ON farmers FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage farmers" ON farmers;
CREATE POLICY "Admins can manage farmers"
  ON farmers FOR ALL
  USING (is_admin());

-- Products & Categories Policies
DROP POLICY IF EXISTS "Public can view active categories" ON product_categories;
CREATE POLICY "Public can view active categories"
  ON product_categories FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (is_admin());

-- Baskets & Items Policies
DROP POLICY IF EXISTS "Public can view active baskets" ON baskets;
CREATE POLICY "Public can view active baskets"
  ON baskets FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Public can view basket items" ON basket_items;
CREATE POLICY "Public can view basket items"
  ON basket_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage baskets" ON baskets;
CREATE POLICY "Admins can manage baskets"
  ON baskets FOR ALL
  USING (is_admin());

-- Delivery Zones / Areas / Locations
DROP POLICY IF EXISTS "Public can view active delivery zones" ON delivery_zones;
CREATE POLICY "Public can view active delivery zones"
  ON delivery_zones FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Public can view active delivery areas" ON delivery_areas;
CREATE POLICY "Public can view active delivery areas"
  ON delivery_areas FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Public can view active delivery locations" ON delivery_locations;
CREATE POLICY "Public can view active delivery locations"
  ON delivery_locations FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage delivery hierarchy" ON delivery_zones;
CREATE POLICY "Admins can manage delivery hierarchy"
  ON delivery_zones FOR ALL USING (is_admin());

-- Customer Addresses Policies
DROP POLICY IF EXISTS "Customers can manage own addresses" ON customer_addresses;
CREATE POLICY "Customers can manage own addresses"
  ON customer_addresses FOR ALL
  USING (customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR is_admin())
  WITH CHECK (customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR is_admin());

-- Orders & Order Items Policies
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR is_admin());

DROP POLICY IF EXISTS "Customers can insert own orders" ON orders;
CREATE POLICY "Customers can insert own orders"
  ON orders FOR INSERT
  WITH CHECK (
    customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    AND status = 'pending_payment'
  );

DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders"
  ON orders FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Customers can view own order items" ON order_items;
CREATE POLICY "Customers can view own order items"
  ON order_items FOR SELECT
  USING (order_id IN (
    SELECT id FROM orders WHERE customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  ) OR is_admin());

-- Payments Policies
DROP POLICY IF EXISTS "Customers can view own payments" ON payments;
CREATE POLICY "Customers can view own payments"
  ON payments FOR SELECT
  USING (order_id IN (
    SELECT id FROM orders WHERE customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  ) OR is_admin());

-- Waitlist Policies
DROP POLICY IF EXISTS "Anyone can join waitlist" ON waitlist;
CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view waitlist" ON waitlist;
CREATE POLICY "Admins can view waitlist"
  ON waitlist FOR SELECT
  USING (is_admin());

-- Testimonials Policies
DROP POLICY IF EXISTS "Public can view active testimonials" ON testimonials;
CREATE POLICY "Public can view active testimonials"
  ON testimonials FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage testimonials" ON testimonials;
CREATE POLICY "Admins can manage testimonials"
  ON testimonials FOR ALL
  USING (is_admin());

-- Transparency Records
DROP POLICY IF EXISTS "Public can view transparency records" ON transparency_records;
CREATE POLICY "Public can view transparency records"
  ON transparency_records FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can view farmer payments linked to transparency" ON farmer_payments;
CREATE POLICY "Public can view farmer payments linked to transparency"
  ON farmer_payments FOR SELECT
  USING (true);


-- ====================================================================
-- MIGRATION: 004_functions-sandeep.sql
-- ====================================================================

-- Migration 004: Stored Procedures & Functions

-- 1. Function: Check delivery serviceability via PostGIS polygon or exact location match
CREATE OR REPLACE FUNCTION check_delivery_availability(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
RETURNS TABLE (
  available BOOLEAN,
  zone_id UUID,
  zone_name TEXT,
  area_id UUID,
  area_name TEXT,
  delivery_fee DECIMAL(10,2),
  minimum_order DECIMAL(10,2),
  delivery_day TEXT,
  delivery_promise TEXT
) AS $$
DECLARE
  point GEOMETRY;
  found_zone RECORD;
  found_area RECORD;
BEGIN
  -- Create PostGIS Point (EPSG:4326 - WGS 84)
  point := ST_SetSRID(ST_MakePoint(lng, lat), 4326);

  -- Check if coordinates fall within any active delivery zone polygon
  SELECT z.id, z.name, z.delivery_fee, z.minimum_order, z.delivery_day, z.delivery_promise
  INTO found_zone
  FROM delivery_zones z
  WHERE z.active = true
    AND ST_Covers(z.polygon, point)
  LIMIT 1;

  IF found_zone.id IS NOT NULL THEN
    -- Find corresponding area within zone
    SELECT a.id, a.name INTO found_area
    FROM delivery_areas a
    WHERE a.zone_id = found_zone.id AND a.active = true
    LIMIT 1;

    RETURN QUERY SELECT
      true AS available,
      found_zone.id AS zone_id,
      found_zone.name AS zone_name,
      found_area.id AS area_id,
      found_area.name AS area_name,
      found_zone.delivery_fee,
      found_zone.minimum_order,
      found_zone.delivery_day,
      found_zone.delivery_promise;
  ELSE
    RETURN QUERY SELECT
      false AS available,
      NULL::UUID AS zone_id,
      NULL::TEXT AS zone_name,
      NULL::UUID AS area_id,
      NULL::TEXT AS area_name,
      0.00::DECIMAL(10,2) AS delivery_fee,
      0.00::DECIMAL(10,2) AS minimum_order,
      ''::TEXT AS delivery_day,
      ''::TEXT AS delivery_promise;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 2. Trigger Function: Automatically create Profile on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, full_name, phone, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Customer'),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    new.email,
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Bind Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ====================================================================
-- MIGRATION: 004_functions.sql
-- ====================================================================

-- Migration 004: Stored Procedures & Functions

-- 1. Function: Check delivery serviceability via PostGIS polygon or exact location match
CREATE OR REPLACE FUNCTION check_delivery_availability(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
RETURNS TABLE (
  available BOOLEAN,
  zone_id UUID,
  zone_name TEXT,
  area_id UUID,
  area_name TEXT,
  delivery_fee DECIMAL(10,2),
  minimum_order DECIMAL(10,2),
  delivery_day TEXT,
  delivery_promise TEXT
) AS $$
DECLARE
  point GEOMETRY;
  found_zone RECORD;
  found_area RECORD;
BEGIN
  -- Create PostGIS Point (EPSG:4326 - WGS 84)
  point := ST_SetSRID(ST_MakePoint(lng, lat), 4326);

  -- Check if coordinates fall within any active delivery zone polygon
  SELECT z.id, z.name, z.delivery_fee, z.minimum_order, z.delivery_day, z.delivery_promise
  INTO found_zone
  FROM delivery_zones z
  WHERE z.active = true
    AND ST_Covers(z.polygon, point)
  LIMIT 1;

  IF found_zone.id IS NOT NULL THEN
    -- Find corresponding area within zone
    SELECT a.id, a.name INTO found_area
    FROM delivery_areas a
    WHERE a.zone_id = found_zone.id AND a.active = true
    LIMIT 1;

    RETURN QUERY SELECT
      true AS available,
      found_zone.id AS zone_id,
      found_zone.name AS zone_name,
      found_area.id AS area_id,
      found_area.name AS area_name,
      found_zone.delivery_fee,
      found_zone.minimum_order,
      found_zone.delivery_day,
      found_zone.delivery_promise;
  ELSE
    RETURN QUERY SELECT
      false AS available,
      NULL::UUID AS zone_id,
      NULL::TEXT AS zone_name,
      NULL::UUID AS area_id,
      NULL::TEXT AS area_name,
      0.00::DECIMAL(10,2) AS delivery_fee,
      0.00::DECIMAL(10,2) AS minimum_order,
      ''::TEXT AS delivery_day,
      ''::TEXT AS delivery_promise;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 2. Trigger Function: Automatically create Profile on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, full_name, phone, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Customer'),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    new.email,
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Bind Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ====================================================================
-- MIGRATION: 005_seed_data.sql
-- ====================================================================

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


-- ====================================================================
-- MIGRATION: 006_business_management_system.sql
-- ====================================================================

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


-- ====================================================================
-- MIGRATION: 007_security_hardening.sql
-- ====================================================================

-- Migration 007: Security Hardening & Complete RLS Policy Suite

-- 1. Enable RLS on all Business Management & Audit Tables
ALTER TABLE IF EXISTS business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weekly_baskets ENABLE ROW LEVEL SECURITY;

-- 2. Enhanced is_admin() Security Function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') OR auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid() AND p.role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM profiles p
    JOIN admin_users a ON a.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 3. Prevent Privilege Escalation (Non-admins cannot assign or change role to admin)
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Database administrator scripts / service role are authorized
  IF current_user IN ('postgres', 'supabase_admin') OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role != 'customer' AND NOT is_admin() THEN
      RAISE EXCEPTION 'Security Policy Error: Unauthorized attempt to create user with privileged role.';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role AND OLD.role != 'admin' AND NOT is_admin() THEN
      RAISE EXCEPTION 'Security Policy Error: Unauthorized attempt to modify user role.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS enforce_profile_role_protection ON profiles;
CREATE TRIGGER enforce_profile_role_protection
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- 4. RLS Policies for Business Settings
DROP POLICY IF EXISTS "Public can view business settings" ON business_settings;
CREATE POLICY "Public can view business settings"
  ON business_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage business settings" ON business_settings;
CREATE POLICY "Admins can manage business settings"
  ON business_settings FOR ALL
  USING (is_admin());

-- 5. RLS Policies for Discounts & Coupons
DROP POLICY IF EXISTS "Public can view active discounts" ON discounts;
CREATE POLICY "Public can view active discounts"
  ON discounts FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage discounts" ON discounts;
CREATE POLICY "Admins can manage discounts"
  ON discounts FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Public can view active coupons" ON coupons;
CREATE POLICY "Public can view active coupons"
  ON coupons FOR SELECT
  USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage coupons" ON coupons;
CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  USING (is_admin());

-- 6. RLS Policies for Coupon Usage (Customers view own redemptions)
DROP POLICY IF EXISTS "Customers view own coupon usage" ON coupon_usage;
CREATE POLICY "Customers view own coupon usage"
  ON coupon_usage FOR SELECT
  USING (customer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR is_admin());

DROP POLICY IF EXISTS "Admins manage coupon usage" ON coupon_usage;
CREATE POLICY "Admins manage coupon usage"
  ON coupon_usage FOR ALL
  USING (is_admin());

-- 7. RLS Policies for Weekly Baskets Inventory
DROP POLICY IF EXISTS "Public view weekly capacity" ON weekly_baskets;
CREATE POLICY "Public view weekly capacity"
  ON weekly_baskets FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage weekly capacity" ON weekly_baskets;
CREATE POLICY "Admins manage weekly capacity"
  ON weekly_baskets FOR ALL
  USING (is_admin());

-- 8. RLS Policies for Audit Logs & Price History (Strict Admin Only)
DROP POLICY IF EXISTS "Admins view audit logs" ON audit_logs;
CREATE POLICY "Admins view audit logs"
  ON audit_logs FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Admins view price history" ON price_history;
CREATE POLICY "Admins view price history"
  ON price_history FOR ALL
  USING (is_admin());

-- 9. Comprehensive RLS for Remaining Core Tables
-- Admin Users: Only accessible to admins
DROP POLICY IF EXISTS "Admins manage admin_users" ON admin_users;
CREATE POLICY "Admins manage admin_users"
  ON admin_users FOR ALL
  USING (is_admin());

-- Farmer Documents: Confidential, admin-only
DROP POLICY IF EXISTS "Admins manage farmer documents" ON farmer_documents;
CREATE POLICY "Admins manage farmer documents"
  ON farmer_documents FOR ALL
  USING (is_admin());

-- Inventory: Public can view available stock counts, only admins update
DROP POLICY IF EXISTS "Public can view inventory" ON inventory;
CREATE POLICY "Public can view inventory"
  ON inventory FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage inventory" ON inventory;
CREATE POLICY "Admins can manage inventory"
  ON inventory FOR ALL
  USING (is_admin());

-- Deliveries: Managed by admins & delivery staff
DROP POLICY IF EXISTS "Admins manage deliveries" ON deliveries;
CREATE POLICY "Admins manage deliveries"
  ON deliveries FOR ALL
  USING (is_admin());

-- Notifications: Users read own notifications, admins manage all
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR is_admin());

DROP POLICY IF EXISTS "Admins manage notifications" ON notifications;
CREATE POLICY "Admins manage notifications"
  ON notifications FOR ALL
  USING (is_admin());


-- ====================================================================
-- MIGRATION: 008_ghatkesar_delivery_zones.sql
-- ====================================================================

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


-- ====================================================================
-- MIGRATION: 009_delivery_operations_system.sql
-- ====================================================================

-- Migration 009: Delivery Operations System (Founder Delivery, Secure OTP, MSG91 & Audit Tracking)
-- Safe, non-destructive migration that preserves all existing order data.

-- 1. Safely extend order_status ENUM with delivery lifecycle statuses if they don't exist
DO $$
BEGIN
  -- Check and add 'ready_for_delivery'
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'order_status'::regtype AND enumlabel = 'ready_for_delivery') THEN
    ALTER TYPE order_status ADD VALUE 'ready_for_delivery';
  END IF;

  -- Check and add 'delivery_failed'
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'order_status'::regtype AND enumlabel = 'delivery_failed') THEN
    ALTER TYPE order_status ADD VALUE 'delivery_failed';
  END IF;

  -- Check and add 'rescheduled'
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'order_status'::regtype AND enumlabel = 'rescheduled') THEN
    ALTER TYPE order_status ADD VALUE 'rescheduled';
  END IF;

  -- Check and add 'customer_unavailable'
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'order_status'::regtype AND enumlabel = 'customer_unavailable') THEN
    ALTER TYPE order_status ADD VALUE 'customer_unavailable';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add Delivery & OTP fields to orders table safely
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_otp_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS otp_created_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS otp_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_last_attempt_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS delivery_person_type TEXT NOT NULL DEFAULT 'FOUNDER',
  ADD COLUMN IF NOT EXISTS delivery_person_name TEXT DEFAULT 'Founder (Easy Farm)',
  ADD COLUMN IF NOT EXISTS delivery_assigned_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS rescheduled_date DATE NULL,
  ADD COLUMN IF NOT EXISTS reschedule_reason TEXT NULL;

-- 3. Useful Performance & Operations Indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_person ON orders(delivery_person_type);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date_status ON orders(delivery_date, status);

-- 4. RLS Hardening for Delivery Fields
-- Customers can view their own orders but MUST NOT update delivery_otp_hash, otp_verified, or delivered_at.
-- Only authorized admins (or server service role) can perform status and delivery updates.
DO $$
BEGIN
  -- Verify orders RLS is active
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
END $$;


-- ====================================================================
-- MIGRATION: 010_basket_pricing_and_swapping.sql
-- ====================================================================

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


-- ====================================================================
-- MIGRATION: 011_easy_coins_system.sql
-- ====================================================================

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

-- ====================================================================
-- PROVISION INITIAL ADMIN PROFILE
-- Links shivashankarlode@gmail.com to profiles & admin_users
-- ====================================================================
DO $$
DECLARE
  admin_auth_id UUID;
  admin_prof_id UUID;
BEGIN
  SELECT id INTO admin_auth_id FROM auth.users WHERE email = 'shivashankarlode@gmail.com' LIMIT 1;
  
  IF admin_auth_id IS NOT NULL THEN
    -- Check if a profile record already exists for this user or email
    SELECT id INTO admin_prof_id FROM profiles WHERE auth_user_id = admin_auth_id OR email = 'shivashankarlode@gmail.com' LIMIT 1;
    
    IF admin_prof_id IS NOT NULL THEN
      UPDATE profiles 
      SET role = 'admin', auth_user_id = admin_auth_id, full_name = 'Shiva Shankar' 
      WHERE id = admin_prof_id;
    ELSE
      INSERT INTO profiles (auth_user_id, full_name, email, role, phone)
      VALUES (admin_auth_id, 'Shiva Shankar', 'shivashankarlode@gmail.com', 'admin', '+91 98490 12345')
      RETURNING id INTO admin_prof_id;
    END IF;
    
    IF admin_prof_id IS NOT NULL THEN
      INSERT INTO admin_users (profile_id, permissions)
      VALUES (admin_prof_id, '{"all": true}'::jsonb)
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  END IF;
END $$;
