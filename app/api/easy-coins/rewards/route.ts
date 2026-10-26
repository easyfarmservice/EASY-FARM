import { NextRequest, NextResponse } from 'next/server';
import { EasyCoinsService } from '@/services/easy-coins.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subtotal = Number(searchParams.get('subtotal')) || 0;

    const catalog = await EasyCoinsService.getCatalog(subtotal);
    return NextResponse.json({
      success: true,
      ...catalog,
    });
  } catch (error: any) {
    console.error('Error fetching Easy Coins rewards catalog:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rewards catalog' },
      { status: 500 }
    );
  }
}
