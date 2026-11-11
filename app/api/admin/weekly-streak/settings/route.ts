import { NextRequest, NextResponse } from 'next/server';
import { WeeklyStreakService } from '@/services/weekly-streak.service';

export async function GET() {
  try {
    const settings = await WeeklyStreakService.getSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await WeeklyStreakService.updateSettings(body, body.adminEmail || 'admin@easyfarm.in');
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

