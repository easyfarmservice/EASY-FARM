import { NextRequest, NextResponse } from 'next/server';
import { LegalService } from '@/services/legal.service';

export async function GET() {
  try {
    const details = await LegalService.getLegalBusinessDetails();
    return NextResponse.json({ success: true, details });
  } catch (error: any) {
    console.error('Error fetching legal business settings:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await LegalService.updateLegalBusinessDetails(body);
    return NextResponse.json({ success: true, message: 'Legal business details updated successfully.', details: updated });
  } catch (error: any) {
    console.error('Error updating legal business settings:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

