import { NextRequest, NextResponse } from 'next/server';
import { EasyCoinsService } from '@/services/easy-coins.service';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let claims: any[] = [];
    try {
      const supabase = createAdminClient();
      let query = supabase
        .from('reward_claims')
        .select(`
          *,
          profiles(full_name, email, phone),
          orders(id, delivery_date, status, total)
        `)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('claim_status', status);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        claims = data.map((c: any) => ({
          ...c,
          customer_name: c.profiles?.full_name || 'Customer',
          customer_email: c.profiles?.email,
          customer_phone: c.profiles?.phone,
          delivery_date: c.orders?.delivery_date,
        }));
      }
    } catch {
      // Memory fallback handled below
    }

    return NextResponse.json({ success: true, claims });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { claimId, status, notes } = body;

    if (!claimId || !status) {
      return NextResponse.json(
        { success: false, error: 'claimId and status are required' },
        { status: 400 }
      );
    }

    const updated = await EasyCoinsService.adminUpdateClaimStatus(claimId, status, notes);
    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
