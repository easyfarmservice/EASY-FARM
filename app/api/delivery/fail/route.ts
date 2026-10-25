import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordDeliveryAuditLog } from '@/lib/delivery-audit';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) {
    return (
      auth.response ||
      NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Admin authorization required.' },
        { status: 403 }
      )
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawOrderId = body.order_id || body.orderId;
    const reason = String(body.reason || '').trim();

    if (!rawOrderId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_ORDER_ID', message: 'Order ID is required.' },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'MISSING_REASON', message: 'A failure reason is mandatory.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch order
    let query = supabase.from('orders').select('id, status, profiles(full_name)');
    if (rawOrderId.startsWith('ORD-')) {
      const prefix = rawOrderId.replace('ORD-', '').toLowerCase();
      const { data: allOrders } = await supabase.from('orders').select('id');
      const matched = allOrders?.find((o) => o.id.slice(0, 6).toLowerCase() === prefix);
      query = query.eq('id', matched ? matched.id : rawOrderId);
    } else {
      query = query.eq('id', rawOrderId);
    }

    const { data: order, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json(
        { success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found.' },
        { status: 404 }
      );
    }

    if (order.status === 'delivered') {
      return NextResponse.json(
        { success: false, error: 'ALREADY_DELIVERED', message: 'Delivered orders cannot be marked as failed.' },
        { status: 400 }
      );
    }

    const adminName = auth.profile?.full_name || auth.user?.email || 'Founder / Admin';

    // Update status to 'failed' or 'delivery_failed' and record failure reason
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'failed',
        failure_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: 'DB_ERROR', message: updateErr.message },
        { status: 500 }
      );
    }

    await recordDeliveryAuditLog({
      adminId: auth.user?.id,
      adminName,
      action: 'DELIVERY_FAILED',
      orderId: order.id,
      details: {
        reason,
        previous_status: order.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Delivery marked as failed.',
      order_id: order.id,
      status: 'failed',
      failure_reason: reason,
    });
  } catch (err: any) {
    console.error('[DeliveryFail] Exception:', err);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
