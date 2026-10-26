import { NextResponse } from 'next/server';
import { EasyCoinsService } from '@/services/easy-coins.service';

export async function GET() {
  try {
    const analytics = await EasyCoinsService.getProgramAnalytics();
    return NextResponse.json({ success: true, ...analytics });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
