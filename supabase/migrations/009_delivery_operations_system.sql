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
