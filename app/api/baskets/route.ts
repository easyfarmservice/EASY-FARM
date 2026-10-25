import { NextRequest, NextResponse } from 'next/server';
import { UnifiedBasketService } from '@/services/unified-basket.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const basketsWithPricing = await UnifiedBasketService.getAllBasketsWithPricing();
    const activeBaskets = basketsWithPricing.filter((b) => b.basket.active !== false);

    return NextResponse.json({
      success: true,
      baskets: activeBaskets.map(({ basket, pricing }) => ({
        id: basket.id,
        name: basket.name,
        slug: basket.slug,
        description: basket.description,
        price: basket.price,
        compare_at_price: basket.compare_at_price,
        image_url: basket.image_url,
        items_count: basket.items_count,
        max_swaps: basket.max_swaps,
        is_customizable: basket.is_customizable,
        active: basket.active,
        items: (basket.items || []).map((it: any) => ({
          productId: it.product_id,
          productName: it.product?.name || 'Crop',
          quantity: it.quantity,
          unit: it.unit,
          price: it.item_price,
          compare_at_price: it.compare_at_price,
          image_url: it.product?.image_url,
          is_fixed: it.is_fixed !== false && it.is_default !== false,
        })),
        savings: pricing.marketSavingsTotal,
        savingsPct: pricing.marketSavingsPct,
      })),
    });
  } catch (error: any) {
    console.error('[API/baskets] GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch active baskets' },
      { status: 500 }
    );
  }
}
