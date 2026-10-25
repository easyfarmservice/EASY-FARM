import { NextRequest, NextResponse } from 'next/server';
import { UnifiedBasketService } from '@/services/unified-basket.service';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  const rateCheck = checkRateLimit(req, 30, 60);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { customerId, basketId, deliveryWeek, items, swapsUsed } = body;

    if (!customerId || !basketId || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'customerId, basketId, and items array are required' },
        { status: 400 }
      );
    }

    const result = await UnifiedBasketService.saveCustomerCustomization(
      customerId,
      basketId,
      deliveryWeek,
      items,
      Number(swapsUsed) || 0
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API/baskets/customize] POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save customer customization' },
      { status: 400 }
    );
  }
}
