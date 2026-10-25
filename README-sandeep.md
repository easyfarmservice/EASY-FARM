# Easy Farm — Deployment & Setup Guide

## 1. Overview

**Easy Farm** is a production-ready farm-to-door weekly vegetable delivery startup web application designed for its launch in **Ghatkesar & Pocharam, Hyderabad, Telangana**.

---

## 2. Environment Variables Setup

Copy `.env.local.example` to `.env.local` in your root project folder:

```bash
cp .env.local.example .env.local
```

Fill in the following real credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AWS S3 Storage & CloudFront CDN
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=easy-farm-assets
AWS_CLOUDFRONT_URL=https://d1111111111111.cloudfront.net

# Resend Email Integration
RESEND_API_KEY=re_123456789

# Mapbox Platform
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijoi...

# Razorpay Payments Integration
RAZORPAY_KEY_ID=rzp_live_1234567890
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

---

## 3. Supabase Setup Instructions

1. Open your **Supabase Dashboard** and go to the **SQL Editor**.
2. Run the SQL migration scripts in order from the `supabase/migrations/` folder:
   - `001_enable_extensions.sql` (Enables PostGIS, uuid-ossp, pg_trgm)
   - `002_create_tables.sql` (Creates 22 normalized database tables)
   - `003_rls_policies.sql` (Applies security policies for auth and admin)
   - `004_functions.sql` (Creates `check_delivery_availability` RPC and triggers)
   - `005_seed_data.sql` (Seeds initial weekly baskets, Telangana farmers, inventory, and testimonials)
   - `008_ghatkesar_delivery_zones.sql` (Seeds Ghatkesar & Pocharam delivery polygon)

---

## 4. How Serviceability & Geofencing Works

1. Customer enters PIN code, address search, or GPS location.
2. Coordinates (`lat`, `lng`) are sent to `/api/delivery/check`.
3. Server executes PostGIS function: `ST_Covers(polygon, ST_SetSRID(ST_MakePoint(lng, lat), 4326))`.
4. If coordinates are **inside Ghatkesar & Pocharam polygon**, ordering is allowed.
5. If coordinates are **outside Ghatkesar & Pocharam polygon**, customer is prompted with:
   *"We're not delivering to your area yet."* and redirected to **Join the Waitlist**.

---

## 5. How to Add a New Delivery Zone (e.g. Kondapur / Financial District)

No code changes are required. Simply execute in Supabase SQL Editor:

```sql
INSERT INTO delivery_zones (name, slug, city, polygon, active, delivery_fee, minimum_order)
VALUES (
  'Financial District',
  'financial-district',
  'Hyderabad',
  ST_GeomFromText('POLYGON((78.3300 17.4100, 78.3500 17.4100, 78.3500 17.4300, 78.3300 17.4300, 78.3300 17.4100))', 4326),
  true,
  0.00,
  250.00
);
```

---

## 6. How to Add a New Gated Community

To restrict/enable delivery to a specific community within an active area:

```sql
INSERT INTO delivery_locations (area_id, building_name, address, latitude, longitude, active)
VALUES (
  'b2c3d4e5-0000-0000-0000-000000000002',
  'My Home Vihanga',
  'Nanakramguda, Financial District Road',
  17.4190,
  78.3390,
  true
);
```

---

## 7. Security Checklist

- [x] All database tables protected by Supabase Row Level Security (RLS)
- [x] PostGIS spatial verification enforced on server before order creation
- [x] Server-side basket price lookup (client price overrides impossible)
- [x] Razorpay payment signatures verified server-side
- [x] Admin routes protected by role-based checks
- [x] No sensitive secret keys exposed in client bundles
