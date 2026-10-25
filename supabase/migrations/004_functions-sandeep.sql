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
