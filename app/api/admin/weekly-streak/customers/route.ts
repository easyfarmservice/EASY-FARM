import { NextRequest, NextResponse } from 'next/server';
import { WeeklyStreakService } from '@/services/weekly-streak.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const search = searchParams.get('search') || undefined;
    const filter = searchParams.get('filter') || undefined;

    if (customerId) {
      const overview = await WeeklyStreakService.getOverview(customerId);
      return NextResponse.json({ success: true, ...overview });
    }

    const customers = await WeeklyStreakService.getAllCustomerStreaks({ search, filter });
    return NextResponse.json({ success: true, customers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

