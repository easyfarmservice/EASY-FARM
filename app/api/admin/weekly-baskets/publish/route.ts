import { NextRequest, NextResponse } from 'next/server';
import { UnifiedBasketService } from '@/services/unified-basket.service';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const deliveryWeek = url.searchParams.get('deliveryWeek') || undefined;
  const basketId = url.searchParams.get('basketId') || undefined;

  try {
    const planner = await UnifiedBasketService.getWeeklyPlanner(deliveryWeek, basketId);
    return NextResponse.json({ success: true, planner });
  } catch (error: any) {
    console.error('[API/admin/weekly-baskets] GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch weekly planner' },
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
    const { basketId, deliveryWeek, items, status } = body;

    if (!basketId || !deliveryWeek || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'basketId, deliveryWeek, and items array are required' },
        { status: 400 }
      );
    }

    const result = await UnifiedBasketService.saveWeeklyBasketPlan(
      basketId,
      deliveryWeek,
      items,
      status || 'published'
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API/admin/weekly-baskets] POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save weekly basket' },
      { status: 400 }
    );
  }
}
