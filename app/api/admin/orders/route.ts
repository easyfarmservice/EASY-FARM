import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { EmailService } from '@/services/email.service';

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();

    // 1. Fetch orders from Supabase with relations
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        subtotal,
        delivery_fee,
        total,
        delivery_date,
        notes,
        created_at,
        updated_at,
        profiles(id, full_name, phone, email),
        customer_addresses(id, full_address, apartment, locality, pincode, label),
        order_items(id, basket_name, quantity, unit_price, total_price),
        payments(id, provider, provider_payment_id, provider_order_id, status, amount)
      `)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('[Admin Orders API] Error fetching orders:', ordersError);
      return NextResponse.json({ success: false, error: ordersError.message }, { status: 500 });
    }

    // 2. Format orders for Admin Dashboard with robust JSON metadata fallback
    const formattedOrders = (orders || []).map((o: any) => {
      let meta: any = null;
      if (o.notes) {
        try {
          if (o.notes.startsWith('{')) {
            meta = JSON.parse(o.notes);
          }
        } catch {}
      }

      const payment = Array.isArray(o.payments) ? o.payments[0] : o.payments;
      const isPaid = payment?.status === 'captured' || o.status === 'confirmed' || o.status === 'delivered';

      const customerName =
        meta?.customerName ||
        o.profiles?.full_name ||
        'Customer';

      const customerPhone =
        meta?.customerPhone ||
        o.profiles?.phone ||
        '';

      const customerEmail =
        meta?.customerEmail ||
        o.profiles?.email ||
        '';

      const address =
        meta?.fullAddress ||
        (o.customer_addresses
          ? `${o.customer_addresses.full_address || ''}, ${o.customer_addresses.apartment || ''}, ${o.customer_addresses.locality || ''} ${o.customer_addresses.pincode || ''}`.replace(/^[,\s]+|[,\s]+$/g, '')
          : 'Ghatkesar & Pocharam Corridor');

      const items =
        o.order_items && o.order_items.length > 0
          ? o.order_items.map((i: any) => ({
              name: i.basket_name,
              quantity: i.quantity,
              unitPrice: i.unit_price,
              totalPrice: i.total_price,
            }))
          : meta?.items && meta.items.length > 0
          ? meta.items.map((i: any) => ({
              name: i.basketName || i.name,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice,
            }))
          : [{ name: 'Weekly Harvest Basket', quantity: 1, unitPrice: o.total, totalPrice: o.total }];

      return {
        id: meta?.orderNumber || `ORD-${o.id.slice(0, 6).toUpperCase()}`,
        uuid: o.id,
        status: o.status || 'pending_payment',
        payment_status: isPaid ? 'paid' : 'pending',
        payment_id: payment?.provider_payment_id || null,
        subtotal: Number(o.subtotal || 0),
        delivery_fee: Number(o.delivery_fee || 0),
        total: Number(o.total || 0),
        delivery_date: o.delivery_date,
        delivery_zone: meta?.deliveryZone || 'Ghatkesar & Pocharam',
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        address,
        flat_no: meta?.flatNo || '',
        apartment: meta?.apartment || o.customer_addresses?.apartment || '',
        locality: meta?.locality || o.customer_addresses?.locality || 'Ghatkesar',
        pincode: meta?.pincode || o.customer_addresses?.pincode || '500088',
        coupon_code: meta?.couponCode || null,
        items,
        created_at: o.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedOrders.length,
      orders: formattedOrders,
    });
  } catch (err: any) {
    console.error('[Admin Orders API Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ success: false, error: 'orderId and status are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // 1. Fetch current order record to preserve notes and timeline
    let ordQuery = supabase.from('orders').select('id, notes, status, created_at');
    if (orderId.length === 36 && orderId.includes('-')) {
      ordQuery = ordQuery.eq('id', orderId);
    } else {
      ordQuery = ordQuery.ilike('notes', `%${orderId}%`);
    }
    const { data: currentOrd } = await ordQuery.maybeSingle();

    const updateData: any = {
      status,
      updated_at: nowIso,
    };

    if (currentOrd) {
      let meta: any = {};
      if (currentOrd.notes) {
        try {
          if (currentOrd.notes.startsWith('{')) meta = JSON.parse(currentOrd.notes);
          else meta = { originalNotes: currentOrd.notes };
        } catch {
          meta = { originalNotes: currentOrd.notes };
        }
      }
      meta.timeline = meta.timeline || {};

      if (status === 'confirmed' && !meta.timeline.confirmed_at) {
        meta.timeline.confirmed_at = nowIso;
      } else if ((status === 'harvest_scheduled' || status === 'harvested') && !meta.timeline.harvested_at) {
        meta.timeline.harvested_at = nowIso;
      } else if (status === 'packed' && !meta.timeline.packed_at) {
        meta.timeline.packed_at = nowIso;
      } else if (status === 'out_for_delivery' && !meta.timeline.out_for_delivery_at) {
        meta.timeline.out_for_delivery_at = nowIso;
      } else if (status === 'delivered') {
        meta.timeline.delivered_at = nowIso;
        updateData.delivered_at = nowIso;
        updateData.otp_verified = true;
      }

      if (status !== 'delivered') {
        updateData.otp_verified = false;
        updateData.delivered_at = null;
        if (meta.timeline.delivered_at) {
          delete meta.timeline.delivered_at;
        }
      }

      updateData.notes = JSON.stringify(meta);
    } else {
      if (status !== 'delivered') {
        updateData.otp_verified = false;
        updateData.delivered_at = null;
      }
    }

    let query = supabase.from('orders').update(updateData);

    if (orderId.length === 36 && orderId.includes('-')) {
      query = query.eq('id', orderId);
    } else {
      query = query.ilike('notes', `%${orderId}%`);
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // If order was marked as delivered, dispatch confirmation email to customer
    if (status === 'delivered') {
      try {
        let orderQuery = supabase
          .from('orders')
          .select(`
            id,
            notes,
            profiles(full_name, email),
            customer_addresses(full_address, apartment, locality)
          `);

        if (orderId.length === 36 && orderId.includes('-')) {
          orderQuery = orderQuery.eq('id', orderId);
        } else {
          orderQuery = orderQuery.ilike('notes', `%${orderId}%`);
        }

        const { data: matchedOrder } = await orderQuery.maybeSingle();
        if (matchedOrder) {
          let meta: any = null;
          if (matchedOrder.notes) {
            try {
              if (matchedOrder.notes.startsWith('{')) meta = JSON.parse(matchedOrder.notes);
            } catch {}
          }

          const customerEmail = meta?.customerEmail || (matchedOrder.profiles as any)?.email || '';
          const customerName = meta?.customerName || (matchedOrder.profiles as any)?.full_name || 'Valued Resident';
          const displayOrderId = meta?.orderNumber || `EF${matchedOrder.id.slice(0, 4).toUpperCase()}`;
          const deliveryAddress =
            meta?.fullAddress ||
            (matchedOrder.customer_addresses as any)?.full_address ||
            [(matchedOrder.customer_addresses as any)?.apartment, (matchedOrder.customer_addresses as any)?.locality]
              .filter(Boolean)
              .join(', ') ||
            'Ghatkesar & Pocharam Corridor';

          if (customerEmail) {
            await EmailService.sendOrderDeliveredEmail({
              toEmail: customerEmail,
              recipientName: customerName,
              orderId: displayOrderId,
              deliveryAddress,
            });
          }
        }
      } catch (emailErr) {
        console.error('[Admin Orders PATCH] Error sending delivered email:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${status}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
