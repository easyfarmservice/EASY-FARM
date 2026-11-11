import { NextRequest, NextResponse } from 'next/server';
import { WeeklyStreakService } from '@/services/weekly-streak.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, newStreak, reason, adminEmail } = body;

    if (!customerId || typeof newStreak !== 'number' || !reason) {
      return NextResponse.json(
        { success: false, error: 'customerId, numeric newStreak, and a mandatory reason are required' },
        { status: 400 }
      );
    }

    const result = await WeeklyStreakService.adminAdjustStreak({
      customerId,
      newStreak,
      reason,
      adminEmail: adminEmail || 'admin@easyfarm.in',
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, streak: result.streak });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

