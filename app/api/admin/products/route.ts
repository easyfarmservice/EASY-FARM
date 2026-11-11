import { NextRequest, NextResponse } from 'next/server';
import { UnifiedBasketService } from '@/services/unified-basket.service';
import { verifyAdminAuth } from '@/lib/security/auth-guard';

export async function GET() {
  try {
    const products = await UnifiedBasketService.getAllProducts();
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load products' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json(
        { success: false, error: 'Product name is required' },
        { status: 400 }
      );
    }
    const result = await UnifiedBasketService.saveMasterProduct(body);
    return NextResponse.json({ success: true, product: result.product });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save product' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { ids, active } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product IDs array is required' },
        { status: 400 }
      );
    }

    const result = await UnifiedBasketService.bulkUpdateProductsStatus(
      ids,
      Boolean(active)
    );
    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
      products: result.products,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to bulk update products' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }
    await UnifiedBasketService.deleteMasterProduct(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}

