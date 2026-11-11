import { NextRequest, NextResponse } from 'next/server';
import { LegalService } from '@/services/legal.service';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerId: explicitCustomerId,
      profileId,
      acceptanceSource = 'website',
      eventType = 'registration',
      metadata = {},
    } = body;

    // Check authenticated user
    let customerId = explicitCustomerId;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        customerId = user.id;
      }
    } catch {}

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer identifier is required to record legal acceptance.' },
        { status: 400 }
      );
    }

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser Client';

    const result = await LegalService.recordAcceptance({
      customerId,
      profileId,
      acceptanceSource: acceptanceSource === 'mobile_app' ? 'mobile_app' : 'website',
      eventType: eventType === 'reacceptance' ? 'reacceptance' : 'registration',
      ipAddress,
      userAgent,
      metadata: {
        ...metadata,
        acceptedVia: 'Mandatory Checkbox',
        url: req.url,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Legal terms and privacy policy acceptance recorded successfully.',
      records: result.records,
    });
  } catch (error: any) {
    console.error('Error recording legal acceptance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error recording acceptance.' },
      { status: 500 }
    );
  }
}

