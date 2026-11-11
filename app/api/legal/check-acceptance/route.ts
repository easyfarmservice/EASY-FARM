import { NextRequest, NextResponse } from 'next/server';
import { LegalService } from '@/services/legal.service';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let customerId = searchParams.get('customerId');

    if (!customerId) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          customerId = user.id;
        }
      } catch {}
    }

    if (!customerId) {
      return NextResponse.json({
        success: true,
        requiresReacceptance: false,
        pendingDocuments: [],
      });
    }

    const check = await LegalService.checkCustomerAcceptanceStatus(customerId);

    return NextResponse.json({
      success: true,
      requiresReacceptance: check.requiresReacceptance,
      pendingDocuments: check.pendingDocuments,
    });
  } catch (error: any) {
    console.error('Error checking legal acceptance status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

