import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  // 1. Authenticate Admin
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) {
    return (
      auth.response ||
      NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Admin delivery authorization required.' },
        { status: 403 }
      )
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status')?.toUpperCase() || 'ALL';
    const searchQuery = searchParams.get('search')?.toLowerCase().trim() || '';
    const dateParam = searchParams.get('date'); // e.g. 'today' or YYYY-MM-DD
    const personFilter = searchParams.get('person') || 'ALL';

    const supabase = createAdminClient();

    // Query orders with profiles, address, order_items, notes
    const { data: rows, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        total,
        delivery_date,
        notes,
        delivery_person_type,
        delivery_person_name,
        delivery_assigned_at,
        otp_created_at,
        otp_expires_at,
        otp_verified,
        otp_attempts,
        delivered_at,
        failure_reason,
        rescheduled_date,
        reschedule_reason,
        created_at,
        profiles(id, full_name, phone, email),
        customer_addresses(full_address, apartment, locality),
        order_items(basket_name, quantity)
      `)
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) {
      console.error('[DeliveryList] Supabase query error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Compute Summary Statistics
    let countTotalToday = 0;
    let countReady = 0;
    let countOutForDelivery = 0;
    let countDelivered = 0;
    let countFailed = 0;

    const formattedOrders = (rows || []).map((o: any) => {
      const isToday = o.delivery_date === todayStr;
      if (isToday) countTotalToday++;

      const st = (o.status || '').toLowerCase();
      if (st === 'out_for_delivery') countOutForDelivery++;
      else if (st === 'ready_for_delivery' || st === 'confirmed' || st === 'packed' || st === 'harvest_scheduled') countReady++;
      else if (st === 'delivered') countDelivered++;
      else if (st === 'failed' || st === 'delivery_failed' || st === 'customer_unavailable' || st === 'cancelled') countFailed++;

      let meta: any = null;
      if (o.notes) {
        try {
          if (o.notes.startsWith('{')) meta = JSON.parse(o.notes);
        } catch {}
      }

      const customerName = meta?.customerName || o.profiles?.full_name || 'Resident';
      const customerEmail = meta?.customerEmail || o.profiles?.email || '';
      const rawPhone = meta?.customerPhone || o.profiles?.phone || '';
      const maskedPhone = rawPhone.length >= 10
        ? rawPhone.replace(/(\d{2})\d{4}(\d{4})/, '$1****$2')
        : (rawPhone || 'Not Provided');

      const area = meta?.deliveryZone || o.customer_addresses?.locality || 'Ghatkesar';
      const address = meta?.fullAddress || [o.customer_addresses?.apartment, o.customer_addresses?.locality]
        .filter(Boolean)
        .join(', ') || 'Singapore Township, Ghatkesar';

      const basketSummary = (o.order_items || [])
        .map((i: any) => `${i.basket_name} (${i.quantity})`)
        .join(', ') || (meta?.items ? meta.items.map((i: any) => `${i.name || i.basketName} (${i.quantity})`).join(', ') : 'Weekly Harvest Basket');

      return {
        id: meta?.orderNumber ? meta.orderNumber.replace('ORD-', 'EF') : `EF${o.id.slice(0, 4).toUpperCase()}`,
        raw_id: o.id,
        customer_name: customerName,
        customer_email: customerEmail,
        phone: rawPhone,
        masked_phone: maskedPhone,
        area,
        delivery_address: address,
        full_address: meta?.fullAddress || o.customer_addresses?.full_address || address,
        amount: Number(o.total || 0),
        status: o.status || 'confirmed',
        delivery_date: o.delivery_date,
        is_today: isToday,
        delivery_person: o.delivery_person_name || 'Founder (Shiva Shankar)',
        delivery_person_type: o.delivery_person_type || 'FOUNDER',
        assigned_at: o.delivery_assigned_at,
        otp_verified: Boolean(o.otp_verified),
        otp_attempts: o.otp_attempts || 0,
        otp_created_at: o.otp_created_at,
        otp_expires_at: o.otp_expires_at,
        delivered_at: o.delivered_at,
        failure_reason: o.failure_reason,
        rescheduled_date: o.rescheduled_date,
        basket_summary: basketSummary,
      };
    });

    // Filter by criteria
    let filtered = formattedOrders;

    if (dateParam === 'today') {
      filtered = filtered.filter((o) => o.is_today);
    } else if (dateParam && dateParam !== 'ALL' && dateParam !== 'all') {
      filtered = filtered.filter((o) => o.delivery_date === dateParam);
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'READY') {
        filtered = filtered.filter(
          (o) => o.status === 'ready_for_delivery' || o.status === 'confirmed' || o.status === 'packed'
        );
      } else if (statusFilter === 'OUT_FOR_DELIVERY') {
        filtered = filtered.filter((o) => o.status === 'out_for_delivery');
      } else if (statusFilter === 'DELIVERED') {
        filtered = filtered.filter((o) => o.status === 'delivered');
      } else if (statusFilter === 'FAILED') {
        filtered = filtered.filter(
          (o) =>
            o.status === 'failed' ||
            o.status === 'delivery_failed' ||
            o.status === 'cancelled' ||
            o.status === 'customer_unavailable'
        );
      }
    }

    if (personFilter !== 'ALL') {
      filtered = filtered.filter((o) => o.delivery_person_type === personFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(searchQuery) ||
          o.raw_id.toLowerCase().includes(searchQuery) ||
          o.customer_name.toLowerCase().includes(searchQuery) ||
          o.phone.toLowerCase().includes(searchQuery) ||
          o.area.toLowerCase().includes(searchQuery) ||
          o.delivery_address.toLowerCase().includes(searchQuery)
      );
    }

    // Sort by operational priority:
    // 1. OUT_FOR_DELIVERY first
    // 2. READY_FOR_DELIVERY / CONFIRMED / PACKED next
    // 3. DELIVERED
    // 4. FAILED / CANCELLED
    const priorityWeight: Record<string, number> = {
      out_for_delivery: 1,
      ready_for_delivery: 2,
      packed: 3,
      confirmed: 4,
      processing: 5,
      pending_payment: 6,
      delivered: 7,
      failed: 8,
      delivery_failed: 8,
      cancelled: 9,
    };

    filtered.sort((a, b) => {
      const pA = priorityWeight[a.status] || 99;
      const pB = priorityWeight[b.status] || 99;
      if (pA !== pB) return pA - pB;
      return b.raw_id.localeCompare(a.raw_id);
    });

    return NextResponse.json({
      success: true,
      stats: {
        total_today: countTotalToday,
        ready: countReady,
        out_for_delivery: countOutForDelivery,
        delivered: countDelivered,
        failed: countFailed,
      },
      orders: filtered,
    });
  } catch (err: any) {
    console.error('[DeliveryList] Exception:', err);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR', message: 'Failed to load delivery operations list.' },
      { status: 500 }
    );
  }
}
