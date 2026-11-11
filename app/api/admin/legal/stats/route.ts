import { NextResponse } from 'next/server';
import { LegalService } from '@/services/legal.service';

export async function GET() {
  try {
    const stats = await LegalService.getAcceptanceStats();
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error('Error fetching legal stats:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

