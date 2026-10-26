import { NextRequest, NextResponse } from 'next/server';
import { EasyCoinsService } from '@/services/easy-coins.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const stock = (searchParams.get('stock') as any) || undefined;
    const sort = (searchParams.get('sort') as any) || undefined;

    const data = await EasyCoinsService.adminGetProducts({
      search,
      category,
      status,
      stock,
      sort,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product = await EasyCoinsService.adminUpsertProduct(body);
    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, action, stock_quantity } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Product IDs array is required' }, { status: 400 });
    }

    if (!['activate', 'deactivate', 'update_stock'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid bulk action' }, { status: 400 });
    }

    const result = await EasyCoinsService.adminBulkUpdateProducts({
      ids,
      action,
      stock_quantity: typeof stock_quantity === 'number' ? stock_quantity : undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const result = await EasyCoinsService.adminDeleteOrArchiveProduct(id);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
