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
