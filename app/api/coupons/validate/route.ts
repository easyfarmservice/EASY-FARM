import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { z } from 'zod';

const CouponPayloadSchema = z.object({
  code: z.string().min(1, 'Please enter a coupon code').max(50),
  subtotal: z.number().nonnegative('Subtotal must be non-negative').optional().default(0),
  customerEmail: z.string().optional().nullable().transform((val) => (val && val.includes('@') ? val.trim() : undefined)),
});

const HARDCODED_COUPONS: Record<string, { code: string; type: 'flat' | 'percent' | 'one_rupee'; value: number; minOrder: number; description: string }> = {
  TEST1: {
    code: 'TEST1',
    type: 'one_rupee',
    value: 1,
    minOrder: 0,
    description: '🎉 Live Testing Coupon: Order total set to ₹1.00',
  },
  EASY1: {
    code: 'EASY1',
    type: 'one_rupee',
    value: 1,
    minOrder: 0,
    description: '🎉 Live Testing Coupon: Order total set to ₹1.00',
  },
  RUPEE1: {
    code: 'RUPEE1',
    type: 'one_rupee',
    value: 1,
    minOrder: 0,
    description: '🎉 Live Testing Coupon: Order total set to ₹1.00',
  },
  ONE: {
    code: 'ONE',
    type: 'one_rupee',
    value: 1,
    minOrder: 0,
    description: '🎉 Live Testing Coupon: Order total set to ₹1.00',
  },
  EASY50: {
    code: 'EASY50',
    type: 'flat',
    value: 50,
    minOrder: 100,
    description: 'Flat ₹50 off on orders above ₹100',
  },
  FIRSTFARM: {
    code: 'FIRSTFARM',
    type: 'percent',
    value: 10,
    minOrder: 100,
    description: '10% off on your first Easy Farm weekly basket',
  },
  GHATKESAR100: {
    code: 'GHATKESAR100',
    type: 'flat',
    value: 100,
    minOrder: 250,
    description: 'Flat ₹100 off on Premium Box or orders above ₹250',
  },
  GACHIBOWLI100: {
    code: 'GHATKESAR100',
    type: 'flat',
    value: 100,
    minOrder: 250,
    description: 'Flat ₹100 off on Premium Box or orders above ₹250',
  },
  WELCOME20: {
    code: 'WELCOME20',
    type: 'percent',
    value: 20,
    minOrder: 150,
    description: '20% welcome discount for Ghatkesar & Pocharam residents',
  },
};

export async function POST(req: NextRequest) {
  // 1. Rate Limiting to prevent brute-forcing coupon codes
  const rateCheck = checkRateLimit(req, 20, 60);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { valid: false, message: 'Too many coupon attempts. Please wait a minute.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parseResult = CouponPayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { valid: false, message: 'Invalid payload parameters' },
        { status: 400 }
      );
    }

    const { code, subtotal, customerEmail } = parseResult.data;
    const cleanCode = code.trim().toUpperCase();
    const orderSubtotal = Number(subtotal) || 0;

    // 1. Check Supabase DB first
    try {
      const supabase = createAdminClient();
      const { data: dbCoupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', cleanCode)
        .eq('active', true)
        .maybeSingle();

      if (dbCoupon) {
        const minOrderValue = Number(dbCoupon.min_order_value || 0);
        if (orderSubtotal < minOrderValue) {
          return NextResponse.json({
            valid: false,
            message: `Coupon '${cleanCode}' requires a minimum order of ₹${minOrderValue}`,
          });
        }

        if (dbCoupon.expiry_date && new Date(dbCoupon.expiry_date) < new Date()) {
          return NextResponse.json({ valid: false, message: `Coupon '${cleanCode}' has expired` });
        }

        if (dbCoupon.usage_limit && dbCoupon.used_count >= dbCoupon.usage_limit) {
          return NextResponse.json({ valid: false, message: `Coupon '${cleanCode}' has been fully redeemed` });
        }

        if (customerEmail && dbCoupon.per_user_limit) {
          const { count } = await supabase
            .from('coupon_usage')
            .select('*', { count: 'exact', head: true })
            .eq('coupon_id', dbCoupon.id)
            .eq('customer_email', customerEmail);

          if (count && count >= dbCoupon.per_user_limit) {
            return NextResponse.json({
              valid: false,
              message: `You have already used coupon '${cleanCode}' the maximum number of times`,
            });
          }
        }

        let discount = 0;
        if (dbCoupon.type === 'flat') {
          discount = Number(dbCoupon.value);
        } else if (dbCoupon.type === 'percent') {
          discount = Math.round((orderSubtotal * Number(dbCoupon.value)) / 100);
        }

        if (dbCoupon.max_discount) {
          discount = Math.min(discount, Number(dbCoupon.max_discount));
        }
        discount = Math.min(discount, orderSubtotal);

        return NextResponse.json({
          valid: true,
          code: dbCoupon.code,
          discount_amount: discount,
          discount_type: dbCoupon.type,
          discount_value: Number(dbCoupon.value),
          description: `${dbCoupon.type === 'flat' ? `₹${dbCoupon.value}` : `${dbCoupon.value}%`} discount applied!`,
        });
      }
    } catch {
      // Fallback
    }

    // 2. Built-in launch coupons
    const matched = HARDCODED_COUPONS[cleanCode];

    if (!matched) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid coupon code. Try EASY50, FIRSTFARM, or GHATKESAR100.',
      });
    }

    if (orderSubtotal < matched.minOrder) {
      return NextResponse.json({
        valid: false,
        message: `Coupon '${matched.code}' requires a minimum order of ₹${matched.minOrder}`,
      });
    }

    let discount = 0;
    if (matched.type === 'one_rupee') {
      discount = Math.max(0, orderSubtotal - 1);
    } else if (matched.type === 'flat') {
      discount = matched.value;
    } else {
      discount = Math.round((orderSubtotal * matched.value) / 100);
    }

    discount = Math.min(discount, orderSubtotal);

    return NextResponse.json({
      valid: true,
      code: matched.code,
      discount_amount: discount,
      discount_type: matched.type,
      discount_value: matched.value,
      description: matched.description,
    });
  } catch (err: any) {
    console.error('Coupon validation error:', err);
    return NextResponse.json({ valid: false, message: 'Failed to validate coupon' }, { status: 500 });
  }
}
