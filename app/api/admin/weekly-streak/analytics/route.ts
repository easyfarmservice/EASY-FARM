import { NextRequest, NextResponse } from 'next/server';
import { WeeklyStreakService } from '@/services/weekly-streak.service';

export async function GET() {
  try {
    const analytics = await WeeklyStreakService.getAnalytics();
    const auditLogs = await WeeklyStreakService.getAuditLogs(30);
    return NextResponse.json({ success: true, analytics, auditLogs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

