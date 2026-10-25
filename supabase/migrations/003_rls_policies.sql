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
