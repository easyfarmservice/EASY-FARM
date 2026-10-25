import { NextRequest, NextResponse } from 'next/server';
import { UnifiedBasketService } from '@/services/unified-basket.service';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const basketsWithPricing = await UnifiedBasketService.getAllBasketsWithPricing();
    const products = await UnifiedBasketService.getAllProducts();

    return NextResponse.json({
      success: true,
      baskets: basketsWithPricing,
      products,
    });
  } catch (error: any) {
    console.error('[API/admin/baskets/unified] GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch basket data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const rateCheck = checkRateLimit(req, 40, 60);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { basketId, price, pricing_mode, packing_cost, target_margin_pct, active, max_swaps, name, description } = body;

    if (!basketId) {
      return NextResponse.json({ error: 'basketId is required' }, { status: 400 });
    }

    const result = await UnifiedBasketService.updateBasketPricing(basketId, {
      price,
      pricing_mode,
      packing_cost,
      target_margin_pct,
      active,
      max_swaps,
      name,
      description,
    });

    return NextResponse.json({ success: true, basket: result.basket });
  } catch (error: any) {
    console.error('[API/admin/baskets/unified] POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update basket' },
      { status: 500 }
    );
  }
}
