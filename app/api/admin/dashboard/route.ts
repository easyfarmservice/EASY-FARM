import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAuth } from '@/lib/security/auth-guard';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(req: NextRequest) {
  // 1. Rate Limiting
  const rateCheck = checkRateLimit(req, 60, 60);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // 2. Admin Authorization Guard
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();

    // 1. Orders
    const { data: dbOrders, count: ordersCount, error: ordersErr } = await supabase
      .from('orders')
      .select(
        'id, total, status, created_at, profiles(full_name), customer_addresses(locality, apartment), payments(status, amount)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (ordersErr) {
      console.error('Admin dashboard orders error:', ordersErr);
    }

    let revSum = 0;
    let confirmedRevenue = 0;
    let confirmedOrdersCount = 0;
    let notConfirmedRevenue = 0;
    let notConfirmedOrdersCount = 0;

    const confirmedStatuses = new Set([
      'confirmed',
      'processing',
      'packed',
      'ready_for_delivery',
      'out_for_delivery',
      'delivered',
    ]);

    let recentOrders: Array<any> = [];

    if (dbOrders && dbOrders.length > 0) {
      dbOrders.forEach((o: any) => {
        const amt = Number(o.total || 0);
        const payment = Array.isArray(o.payments) ? o.payments[0] : o.payments;
        const isConfirmed = confirmedStatuses.has(o.status) || payment?.status === 'captured';

        if (isConfirmed) {
          confirmedRevenue += amt;
          confirmedOrdersCount += 1;
        } else {
          notConfirmedRevenue += amt;
          notConfirmedOrdersCount += 1;
        }
      });

      revSum = confirmedRevenue + notConfirmedRevenue;

      recentOrders = dbOrders.slice(0, 10).map((o: any) => {
        const payment = Array.isArray(o.payments) ? o.payments[0] : o.payments;
        const isConfirmed = confirmedStatuses.has(o.status) || payment?.status === 'captured';

        return {
          id: `ORD-${o.id.slice(0, 6).toUpperCase()}`,
          customer: (o.profiles as any)?.full_name || 'Registered Customer',
          location: o.customer_addresses
            ? `${(o.customer_addresses as any).apartment || ''} ${(o.customer_addresses as any).locality}`.trim()
            : 'Ghatkesar & Pocharam, Hyderabad (Active)',
          status: o.status ? o.status.replace(/_/g, ' ') : 'confirmed',
          isConfirmed,
          total: Number(o.total || 0),
          date: new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        };
      });
    }

    // 2. Customers
    const { count: customerCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer');

    // 3. Waitlist
    const { count: waitlistCount } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    // 4. Low Stock Inventory
    const { data: inventoryData } = await supabase
      .from('inventory')
      .select('available_quantity, products(name)')
      .limit(5);

    const lowStockItems = (inventoryData || []).map((inv: any) => ({
      name: inv.products?.name || 'Produce Item',
      qty: Number(inv.available_quantity || 0),
    }));

    // 5. Active Delivery Zone
    const { data: zoneData } = await supabase
      .from('delivery_zones')
      .select('name')
      .eq('active', true)
      .limit(1);

    const activeZoneName = zoneData && zoneData.length > 0 ? zoneData[0].name : 'Ghatkesar & Pocharam, Hyderabad (Active)';

    return NextResponse.json({
      totalOrders: ordersCount || dbOrders?.length || 0,
      totalRevenue: revSum,
      confirmedRevenue,
      confirmedOrdersCount,
      notConfirmedRevenue,
      notConfirmedOrdersCount,
      activeCustomers: customerCount || 0,
      waitlistCount: waitlistCount || 0,
      recentOrders,
      lowStockItems,
      activeZoneName,
    });
  } catch (err: any) {
    console.error('Admin dashboard API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
