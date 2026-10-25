import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });
    }

    const supabase = createAdminClient();

    let query = supabase
      .from('orders')
      .select('id, status, delivery_date, delivered_at, created_at, customer_addresses(full_address, apartment, locality, pincode, label)');

    if (id.startsWith('ORD-') || id.startsWith('EF')) {
      const clean = id.replace(/^(ORD-|EF)/i, '').toLowerCase();
      const { data: all } = await supabase.from('orders').select('id');
      const match = all?.find((o) => o.id.slice(0, 6).toLowerCase().startsWith(clean.slice(0, 4)));
      if (match) {
        query = query.eq('id', match.id);
      } else {
        query = query.eq('id', id);
      }
    } else {
      query = query.eq('id', id);
    }

    const { data: order, error } = await query.maybeSingle();

    if (error || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    let statusMessage = 'Order confirmed and scheduled for Sunday harvest delivery.';
    if (order.status === 'out_for_delivery') {
      statusMessage = 'Your Easy Farm order is out for delivery.';
    } else if (order.status === 'delivered') {
      statusMessage = 'Your Easy Farm order has been delivered.';
    } else if (order.status === 'packed') {
      statusMessage = 'Your harvest has been packed and is ready for dispatch.';
    }

    // STRICT SANITIZATION: NEVER EXPOSE OTP, OTP HASH, OR SECRETS
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        statusMessage,
        delivery_date: order.delivery_date,
        delivered_at: order.delivered_at,
        address: order.customer_addresses,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
