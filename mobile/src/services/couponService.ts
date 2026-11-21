import { supabase } from '../lib/supabase';

export interface DatabaseCoupon {
  id: string;
  code: string;
  type: 'flat' | 'percent' | 'one_rupee';
  value: number;
  min_order_value: number;
  max_discount?: number | null;
  expiry_date?: string | null;
  usage_limit?: number | null;
  used_count?: number;
  per_user_limit?: number | null;
  active: boolean;
  description?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  message?: string;
  code?: string;
  couponId?: string;
  discountAmount?: number;
  discountType?: 'flat' | 'percent' | 'one_rupee';
  discountValue?: number;
  description?: string;
}

// Built-in launch & testing coupons matching website (/api/coupons/validate)
const BUILTIN_COUPONS: Record<
  string,
  { code: string; type: 'flat' | 'percent' | 'one_rupee'; value: number; minOrder: number; description: string }
> = {
  NEW20: {
    code: 'NEW20',
    type: 'flat',
    value: 180,
    minOrder: 0,
    description: 'Flat ₹180 off on fresh vegetables',
  },
  ONE: {
    code: 'ONE',
    type: 'percent',
    value: 99,
    minOrder: 0,
    description: '🎉 99% off special promotion',
  },
  EASY50: {
    code: 'EASY50',
    type: 'flat',
    value: 50,
    minOrder: 250,
    description: 'Flat ₹50 off on orders above ₹250',
  },
  FIRSTFARM: {
    code: 'FIRSTFARM',
    type: 'percent',
    value: 10,
    minOrder: 250,
    description: '10% off on your first weekly basket',
  },
  GHATKESAR100: {
    code: 'GHATKESAR100',
    type: 'flat',
    value: 100,
    minOrder: 400,
    description: 'Flat ₹100 off on orders above ₹400',
  },
  WELCOME20: {
    code: 'WELCOME20',
    type: 'percent',
    value: 20,
    minOrder: 300,
    description: '20% welcome discount for residents',
  },
};

/**
 * Fetches all active coupons created by admin in the Supabase database
 */
export async function fetchAvailableCoupons(): Promise<DatabaseCoupon[]> {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((c: any) => ({
        id: c.id,
        code: c.code,
        type: c.type || 'flat',
        value: Number(c.value),
        min_order_value: Number(c.min_order_value || 0),
        max_discount: c.max_discount ? Number(c.max_discount) : null,
        expiry_date: c.expiry_date,
        usage_limit: c.usage_limit,
        used_count: c.used_count || 0,
        per_user_limit: c.per_user_limit,
        active: Boolean(c.active),
        description:
          c.description ||
          (c.type === 'flat'
            ? `Flat ₹${c.value} off${c.min_order_value > 0 ? ` on orders above ₹${c.min_order_value}` : ''}`
            : `${c.value}% off${c.min_order_value > 0 ? ` on orders above ₹${c.min_order_value}` : ''}`),
      }));
    }
  } catch (err) {
    console.warn('Failed to fetch coupons from database:', err);
  }

  // Fallback to active launch coupons
  return Object.values(BUILTIN_COUPONS).map((b) => ({
    id: `coupon-${b.code.toLowerCase()}`,
    code: b.code,
    type: b.type,
    value: b.value,
    min_order_value: b.minOrder,
    active: true,
    description: b.description,
  }));
}

/**
 * Validates a coupon code directly against Supabase database `coupons` table
 * Handles admin-configured min order value, expiration, usage limits, and discounts
 */
export async function validateCouponCode(
  code: string,
  subtotal: number,
  customerEmail?: string
): Promise<CouponValidationResult> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, message: 'Please enter a coupon code' };
  }

  const orderSubtotal = Math.max(0, Number(subtotal) || 0);

  try {
    // 1. Query Supabase database coupons table directly
    const { data: dbCoupon, error: dbErr } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', cleanCode)
      .eq('active', true)
      .maybeSingle();

    if (!dbErr && dbCoupon) {
      const minOrderValue = Number(dbCoupon.min_order_value || 0);
      if (orderSubtotal < minOrderValue) {
        return {
          valid: false,
          message: `Coupon '${cleanCode}' requires a minimum order of ₹${minOrderValue}`,
        };
      }

      if (dbCoupon.expiry_date && new Date(dbCoupon.expiry_date) < new Date()) {
        return {
          valid: false,
          message: `Coupon '${cleanCode}' has expired`,
        };
      }

      if (dbCoupon.usage_limit && (dbCoupon.used_count || 0) >= dbCoupon.usage_limit) {
        return {
          valid: false,
          message: `Coupon '${cleanCode}' has been fully redeemed`,
        };
      }

      // Check per user limit in coupon_usage table
      if (customerEmail && dbCoupon.per_user_limit) {
        try {
          const { count } = await supabase
            .from('coupon_usage')
            .select('*', { count: 'exact', head: true })
            .eq('coupon_id', dbCoupon.id)
            .eq('customer_email', customerEmail.trim().toLowerCase());

          if (count && count >= dbCoupon.per_user_limit) {
            return {
              valid: false,
              message: `You have already used coupon '${cleanCode}' the maximum allowed times`,
            };
          }
        } catch {
          // If coupon_usage check fails, allow order
        }
      }

      // Calculate discount
      let discount = 0;
      if (dbCoupon.type === 'flat') {
        discount = Number(dbCoupon.value);
      } else if (dbCoupon.type === 'percent') {
        discount = Math.round((orderSubtotal * Number(dbCoupon.value)) / 100);
      } else if (dbCoupon.type === 'one_rupee') {
        discount = Math.max(0, orderSubtotal - 1);
      }

      if (dbCoupon.max_discount) {
        discount = Math.min(discount, Number(dbCoupon.max_discount));
      }

      discount = Math.min(discount, orderSubtotal);

      return {
        valid: true,
        code: dbCoupon.code,
        couponId: dbCoupon.id,
        discountAmount: discount,
        discountType: dbCoupon.type,
        discountValue: Number(dbCoupon.value),
        description:
          dbCoupon.type === 'flat'
            ? `Flat ₹${dbCoupon.value} discount applied!`
            : `${dbCoupon.value}% discount applied!`,
      };
    }
  } catch (err) {
    console.warn('Coupon database check note:', err);
  }

  // 2. Check built-in launch codes
  const fallback = BUILTIN_COUPONS[cleanCode];
  if (fallback) {
    if (orderSubtotal < fallback.minOrder) {
      return {
        valid: false,
        message: `Coupon '${fallback.code}' requires a minimum order of ₹${fallback.minOrder}`,
      };
    }

    let discount = 0;
    if (fallback.type === 'one_rupee') {
      discount = Math.max(0, orderSubtotal - 1);
    } else if (fallback.type === 'flat') {
      discount = fallback.value;
    } else {
      discount = Math.round((orderSubtotal * fallback.value) / 100);
    }

    discount = Math.min(discount, orderSubtotal);

    return {
      valid: true,
      code: fallback.code,
      discountAmount: discount,
      discountType: fallback.type,
      discountValue: fallback.value,
      description: fallback.description,
    };
  }

  return {
    valid: false,
    message: 'Invalid coupon code. Please enter a valid coupon (e.g. NEW20, ONE).',
  };
}

/**
 * Records coupon usage into Supabase `coupon_usage` table and increments `used_count`
 */
export async function recordCouponUsage(
  couponId: string,
  customerEmail?: string,
  orderId?: string
): Promise<void> {
  try {
    if (couponId && !couponId.startsWith('coupon-')) {
      // 1. Insert into coupon_usage
      await supabase.from('coupon_usage').insert({
        coupon_id: couponId,
        customer_email: customerEmail ? customerEmail.trim().toLowerCase() : 'app_user',
        order_id: orderId || null,
        used_at: new Date().toISOString(),
      });

      // 2. Increment used_count in coupons table
      const { data: coupon } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('id', couponId)
        .maybeSingle();

      const newCount = (coupon?.used_count || 0) + 1;
      await supabase.from('coupons').update({ used_count: newCount }).eq('id', couponId);
    }
  } catch (err) {
    console.warn('Failed to record coupon usage in Supabase:', err);
  }
}
