import { NextRequest, NextResponse } from 'next/server';
import { UnifiedBasketService } from '@/services/unified-basket.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const customerId = url.searchParams.get('customerId') || undefined;
    const deliveryWeek = url.searchParams.get('deliveryWeek') || undefined;

    const data = await UnifiedBasketService.getCustomerUpcomingBasket(id, customerId, deliveryWeek);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API/baskets/[id]/weekly] GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch weekly basket details' },
      { status: 500 }
    );
  }
}
