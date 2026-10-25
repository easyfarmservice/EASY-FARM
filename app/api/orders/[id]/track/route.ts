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

    const rawId = String(id).trim();
    const supabase = createAdminClient();

    // 1. Flexible lookup by UUID, notes matching (ORD-XXXXXX), or prefix match
    let targetOrderId = rawId;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);

    if (!isUUID) {
      // Try searching notes for ORD-XXXXXX
      const { data: matchedOrder } = await supabase
        .from('orders')
        .select('id')
        .ilike('notes', `%${rawId}%`)
        .limit(1)
        .maybeSingle();

      if (matchedOrder?.id) {
        targetOrderId = matchedOrder.id;
      } else {
        // Fallback: search all orders by prefix
        const clean = rawId.replace(/^(ORD-|EF)/i, '').toLowerCase();
        const { data: all } = await supabase.from('orders').select('id');
        const match = all?.find((o) =>
          o.id.toLowerCase().startsWith(clean) ||
          o.id.slice(0, 6).toLowerCase().startsWith(clean.slice(0, 4))
        );
        if (match) {
          targetOrderId = match.id;
        }
      }
    }

    // 2. Fetch full order record with related profiles, addresses, items, and payments
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        subtotal,
        delivery_fee,
        total,
        delivery_date,
        delivered_at,
        otp_created_at,
        delivery_assigned_at,
        notes,
        created_at,
        updated_at,
        customer_addresses(id, full_address, apartment, locality, city, state, pincode, label),
        profiles(id, full_name, phone, email),
        order_items(id, basket_name, quantity, unit_price, total_price),
        payments(id, provider, provider_payment_id, provider_order_id, status, amount, created_at, updated_at)
      `)
      .eq('id', targetOrderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // 3. Parse JSON notes metadata
    let meta: any = null;
    if (order.notes) {
      try {
        if (order.notes.startsWith('{')) {
          meta = JSON.parse(order.notes);
        } else {
          meta = { originalNotes: order.notes };
        }
      } catch {
        meta = { originalNotes: order.notes };
      }
    }

    const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
    const isPaid =
      payment?.status === 'captured' ||
      order.status === 'confirmed' ||
      order.status === 'packed' ||
      order.status === 'out_for_delivery' ||
      order.status === 'delivered';

    // 4. Derive authoritative, non-fabricated timestamps
    // - Order Confirmed: Server confirmation timestamp or DB created_at (timestamptz)
    let confirmedAt: string | null = null;
    if (order.status !== 'pending_payment') {
      confirmedAt =
        meta?.timeline?.confirmed_at ||
        payment?.updated_at ||
        payment?.created_at ||
        order.created_at; // PostgreSQL timestamptz default
    }

    // - Harvesting & Quality Check: null if stage has not occurred (NO fabricated timestamps)
    const harvestedAt = meta?.timeline?.harvested_at || null;

    // - Sorting & Eco-Packing: null if stage has not occurred
    const packedAt = meta?.timeline?.packed_at || null;

    // - Out for Delivery: otp_created_at from Supabase or null if not yet out
    const outForDeliveryAt =
      (order.status === 'out_for_delivery' || order.status === 'delivered')
        ? (order.otp_created_at || order.delivery_assigned_at || meta?.timeline?.out_for_delivery_at || null)
        : null;

    // - Delivered: delivered_at from Supabase or null if not yet delivered
    const deliveredAt = order.status === 'delivered' ? (order.delivered_at || meta?.timeline?.delivered_at || null) : null;

    // 5. Friendly status message
    let statusMessage = 'Order confirmed and scheduled for Sunday harvest delivery.';
    if (order.status === 'out_for_delivery') {
      statusMessage = 'Your Easy Farm order is out for delivery.';
    } else if (order.status === 'delivered') {
      statusMessage = 'Your Easy Farm order has been delivered.';
    } else if (order.status === 'packed') {
      statusMessage = 'Your harvest has been packed and is ready for dispatch.';
    }

    // 6. Format customer details
    const customer = {
      name: meta?.customerName || (order.profiles as any)?.full_name || 'Resident',
      phone: meta?.customerPhone || (order.profiles as any)?.phone || '',
      email: meta?.customerEmail || (order.profiles as any)?.email || '',
    };

    // 7. Format address string
    const addrRow = order.customer_addresses as any;
    const formattedAddress =
      meta?.fullAddress ||
      (addrRow
        ? [
            addrRow.full_address,
            addrRow.apartment,
            addrRow.locality,
            addrRow.city || 'Hyderabad',
            `${addrRow.state || 'Telangana'} – ${addrRow.pincode || '500088'}`,
          ]
            .filter(Boolean)
            .join(', ')
        : '12, Singapore Township, Ghatkesar mandal, Hyderabad, Telangana – 500088');

    // 8. Order items breakdown
    const items =
      order.order_items && order.order_items.length > 0
        ? order.order_items.map((i: any) => ({
            name: i.basket_name,
            quantity: i.quantity,
            unitPrice: Number(i.unit_price),
            totalPrice: Number(i.total_price),
            image: '/images/hero-vegetables.png',
          }))
        : meta?.items && meta.items.length > 0
        ? meta.items.map((i: any) => ({
            name: i.basketName || i.name,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            totalPrice: Number(i.totalPrice),
            image: '/images/hero-vegetables.png',
          }))
        : [
            {
              name: 'Fresh Harvest Produce',
              quantity: 1,
              unitPrice: Number(order.total || 0),
              totalPrice: Number(order.total || 0),
              image: '/images/hero-vegetables.png',
            },
          ];

    // 9. Pricing breakdown
    const subtotal = Number(order.subtotal || 0);
    const deliveryFee = Number(order.delivery_fee || 0);
    const total = Number(order.total || 0);
    const discount = Math.max(0, subtotal + deliveryFee - total);

    const displayOrderNumber = meta?.orderNumber || `ORD-${order.id.slice(0, 8).toUpperCase()}`;

    // STRICT SANITIZATION: NEVER EXPOSE OTP, OTP HASH, OR SECRETS
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: displayOrderNumber,
        status: order.status,
        statusMessage,
        delivery_date: order.delivery_date,
        delivery_promise: meta?.deliveryPromise || 'by 6:00 PM',
        created_at: order.created_at, // Exact PostgreSQL timestamptz
        updated_at: order.updated_at,
        timeline: {
          confirmed_at: confirmedAt,
          harvested_at: harvestedAt,
          packed_at: packedAt,
          out_for_delivery_at: outForDeliveryAt,
          delivered_at: deliveredAt,
        },
        customer,
        address: {
          formatted: formattedAddress,
          apartment: addrRow?.apartment || meta?.apartment || 'Singapore Township',
          flatNo: addrRow?.full_address || meta?.flatNo || '',
          locality: addrRow?.locality || meta?.locality || 'Ghatkesar mandal',
          pincode: addrRow?.pincode || meta?.pincode || '500088',
        },
        payment: {
          isPaid,
          status: isPaid ? 'paid' : 'pending',
          statusText: isPaid ? 'Paid Successfully' : 'Pending',
          paymentId: payment?.provider_payment_id || null,
        },
        pricing: {
          subtotal,
          deliveryFee,
          discount,
          total,
        },
        items,
      },
    });
  } catch (err: any) {
    console.error('[Track Route Error]:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
