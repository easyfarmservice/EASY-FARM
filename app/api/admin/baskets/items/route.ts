import { NextRequest, NextResponse } from 'next/server';
import { UnifiedBasketService } from '@/services/unified-basket.service';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';

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
    const { basketId, items } = body;

    if (!basketId || !Array.isArray(items)) {
      return NextResponse.json({ error: 'basketId and items array are required' }, { status: 400 });
    }

    const result = await UnifiedBasketService.updateBasketItems(basketId, items);

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error('[API/admin/baskets/items] POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update basket items' },
      { status: 500 }
    );
  }
}
