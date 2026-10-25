'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import Link from 'next/link';
import { Package, ArrowRight, MapPin, ShoppingBag, CheckCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

interface CustomerOrder {
  id: string;
  raw_id: string;
  date: string;
  basket: string;
  status: string;
  deliveryDate: string;
  address?: string;
  total: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomerOrders = async () => {
    setLoading(true);
    try {
      const orderList: CustomerOrder[] = [];
      const seenOrderIds = new Set<string>();

      // 1. Fetch persistent database orders from Supabase
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let profileId = null;
        let customerPhone = '';
        let customerEmail = '';

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, phone, email')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          if (profile) {
            profileId = profile.id;
            customerPhone = profile.phone || '';
            customerEmail = profile.email || '';
          }
        } else if (typeof window !== 'undefined') {
          const demoUserStr = localStorage.getItem('easyfarm_user');
          if (demoUserStr) {
            try {
              const demoUser = JSON.parse(demoUserStr);
              customerPhone = demoUser.phone || '';
              customerEmail = demoUser.email || '';
            } catch {}
          }
        }

        let query = supabase
          .from('orders')
          .select(`
            id,
            total,
            status,
            created_at,
            delivery_date,
            notes,
            customer_addresses(full_address, apartment, locality),
            order_items(basket_name)
          `)
          .order('created_at', { ascending: false });

        if (profileId) {
          query = query.eq('customer_id', profileId);
        }

        const { data: dbData } = await query;

        if (dbData && dbData.length > 0) {
          dbData.forEach((o: any) => {
            let meta: any = null;
            if (o.notes) {
              try {
                if (o.notes.startsWith('{')) meta = JSON.parse(o.notes);
              } catch {}
            }

            const cleanId = meta?.orderNumber || `ORD-${o.id.slice(0, 6).toUpperCase()}`;
            seenOrderIds.add(cleanId);
            seenOrderIds.add(o.id);

            orderList.push({
              id: cleanId,
              raw_id: o.id,
              date: new Date(o.created_at).toLocaleDateString('en-IN', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              }),
              basket: o.order_items?.[0]?.basket_name || meta?.items?.[0]?.name || 'Weekly Harvest Basket',
              status: o.status ? o.status.replace('_', ' ') : 'Confirmed',
              deliveryDate: o.delivery_date
                ? new Date(o.delivery_date).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Upcoming Sunday by 6 PM',
              address:
                meta?.fullAddress ||
                (o.customer_addresses
                  ? `${o.customer_addresses.apartment || ''}, ${o.customer_addresses.locality || ''}`
                  : undefined),
              total: Number(o.total || 0),
            });
          });
        }
      } catch (dbErr) {
        console.warn('Could not query Supabase orders directly:', dbErr);
      }

      // 2. Fetch locally placed orders from localStorage (ensures instant visibility after checkout)
      if (typeof window !== 'undefined') {
        try {
          const savedIdsStr = localStorage.getItem('easyfarm_order_ids');
          const savedIds: string[] = savedIdsStr ? JSON.parse(savedIdsStr) : [];

          // Also check all localStorage keys starting with easyfarm_order_
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('easyfarm_order_') && key !== 'easyfarm_order_ids') {
              const id = key.replace('easyfarm_order_', '');
              if (!savedIds.includes(id)) savedIds.push(id);
            }
          }

          savedIds.forEach((id) => {
            if (seenOrderIds.has(id)) return;

            const orderStr = localStorage.getItem(`easyfarm_order_${id}`);
            if (orderStr) {
              try {
                const o = JSON.parse(orderStr);
                const firstBasket = o.items?.[0]?.basket?.name || o.items?.[0]?.name || 'Weekly Harvest Basket';
                const addrStr = o.address
                  ? `${o.address.flatNo || ''}, ${o.address.apartment || ''}, ${o.address.locality || 'Ghatkesar'}`
                  : undefined;

                orderList.push({
                  id: o.orderId || id,
                  raw_id: o.orderId || id,
                  date: o.createdAt
                    ? new Date(o.createdAt).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Today',
                  basket: firstBasket,
                  status: 'Confirmed',
                  deliveryDate: 'Upcoming Sunday by 6 PM',
                  address: addrStr,
                  total: Number(o.total || 0),
                });
                seenOrderIds.add(id);
              } catch {}
            }
          });
        } catch (storageErr) {
          console.warn('Could not read local orders:', storageErr);
        }
      }

      setOrders(orderList);
    } catch (err) {
      console.error('Failed to load customer orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerOrders();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-16 md:pb-0">
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-emerald-700" />
            My Weekly Orders
          </h1>
          <Link
            href="/baskets"
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200"
          >
            Order New Basket
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12">
            <EasyFarmLoader
              size="md"
              text="Fetching your order history..."
              subtitle="Retrieving your Sunday harvest deliveries"
            />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-900">No Orders Placed Yet</h3>
              <p className="text-xs text-slate-500">
                You haven't ordered a weekly vegetable basket yet. Choose from our fresh Telangana farm baskets for Sunday delivery in Ghatkesar &amp; Pocharam!
              </p>
            </div>
            <Link
              href="/baskets"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Browse Weekly Baskets →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div
                key={o.raw_id}
                className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-900 text-base">#{o.id}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full capitalize bg-emerald-100 text-emerald-900 border border-emerald-200">
                      <CheckCircle className="w-3 h-3 text-emerald-700" />
                      {o.status.toLowerCase() === 'confirmed' ? 'Confirmed (Paid)' : o.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Ordered on: {o.date}</p>
                  <p className="text-sm font-extrabold text-slate-900 pt-0.5">{o.basket}</p>
                  {o.address && (
                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate max-w-md">{o.address}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Delivery target: {o.deliveryDate}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2.5 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <span className="text-xl font-black text-emerald-900">₹{o.total.toFixed(2)}</span>
                  <Link
                    href={`/orders/${o.raw_id}`}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-900 text-white font-bold text-xs transition min-h-[40px] flex items-center justify-center cursor-pointer shadow-sm"
                  >
                    Track Order Status
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
