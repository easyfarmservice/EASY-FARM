import { NextRequest, NextResponse } from 'next/server';
import { PricingService } from '@/services/pricing.service';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { z } from 'zod';

const CalculatePayloadSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().optional(),
      basketId: z.string().optional(),
      quantity: z.number().int().positive('Quantity must be a positive integer'),
      customPrice: z.number().optional(),
      compareAtPrice: z.number().optional(),
    }).refine((item) => Boolean(item.id || item.basketId), {
      message: 'Either id or basketId is required for each cart item',
    })
  ).min(1, 'Cart items are required'),
  couponCode: z.string().optional().nullable(),
  customerEmail: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const rateCheck = checkRateLimit(req, 60, 60);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { valid: false, message: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parseResult = CalculatePayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { valid: false, message: 'Invalid items in cart payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { items, couponCode, customerEmail } = parseResult.data;
    const calculationItems = items.map((item) => ({
      basketId: (item.basketId || item.id) as string,
      quantity: item.quantity,
      customPrice: item.customPrice,
      compareAtPrice: item.compareAtPrice,
    }));

    const cleanEmail = customerEmail && customerEmail.trim().length > 0 ? customerEmail.trim() : undefined;
    const cleanCoupon = couponCode && couponCode.trim().length > 0 ? couponCode.trim() : undefined;

    const result = await PricingService.calculateOrderTotal(calculationItems, cleanCoupon, cleanEmail);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Order calculation endpoint error:', err);
    return NextResponse.json(
      { valid: false, message: 'Failed to calculate order totals' },
      { status: 500 }
    );
  }
}
