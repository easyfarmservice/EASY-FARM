'use client';

import React, { useEffect, useState, use } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import Link from 'next/link';
import { CheckCircle2, Clock, MapPin, QrCode } from 'lucide-react';

import { getSavedAddresses } from '@/lib/utils/address';

interface OrderAddress {
  fullName?: string;
  phone?: string;
  apartment?: string;
  flatNo?: string;
  locality?: string;
  pincode?: string;
  label?: string;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id || 'ORD-884920';

  const [deliveryAddress, setDeliveryAddress] = useState<OrderAddress>({
    fullName: 'Resident',
    phone: '',
    apartment: 'Singapore Township',
    flatNo: 'Selected Flat',
    locality: 'Ghatkesar',
    pincode: '501301',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedOrderStr = localStorage.getItem(`easyfarm_order_${orderId}`);
      if (savedOrderStr) {
        try {
          const parsed = JSON.parse(savedOrderStr);
          if (parsed.address) {
            setDeliveryAddress(parsed.address);
            return;
          }
        } catch (e) {
          console.error('Error parsing order address:', e);
        }
      }

      // Fallback: load user profile details and user-scoped address
      const userStr = localStorage.getItem('easyfarm_user');
      let name = 'Resident';
      let phone = '';
      let userIdent: { email?: string } | null = null;

      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          name = u.fullName || u.email?.split('@')[0] || name;
          phone = u.phone || '';
          if (u.email) userIdent = { email: u.email };
        } catch (e) {}
      }

      const addrs = getSavedAddresses(userIdent);
      if (addrs.length > 0) {
        const first = addrs[0];
        setDeliveryAddress({
          fullName: first.fullName || name,
          phone: first.phone || phone,
          apartment: first.apartment,
          flatNo: first.flatNo,
          locality: first.locality || 'Ghatkesar',
          pincode: first.pincode || '501301',
          label: first.label,
        });
        return;
      }

      setDeliveryAddress((prev) => ({ ...prev, fullName: name, phone }));
    }
  }, [orderId]);

  const [liveStatus, setLiveStatus] = useState<string>('confirmed');
  const [statusMessage, setStatusMessage] = useState<string>('Order placed successfully.');

  useEffect(() => {
    fetch(`/api/orders/${orderId}/track`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.order) {
          setLiveStatus(data.order.status);
          if (data.order.statusMessage) {
            setStatusMessage(data.order.statusMessage);
          }
          if (data.order.address) {
            setDeliveryAddress((prev) => ({
              ...prev,
              apartment: data.order.address.apartment || prev.apartment,
              flatNo: data.order.address.full_address || prev.flatNo,
              locality: data.order.address.locality || prev.locality,
              pincode: data.order.address.pincode || prev.pincode,
              label: data.order.address.label || prev.label,
            }));
          }
        }
      })
      .catch(() => null);
  }, [orderId]);

  const isOut = liveStatus === 'out_for_delivery';
  const isDelivered = liveStatus === 'delivered';

  const orderStatuses = [
    { label: 'Order Confirmed', done: true, time: 'Thursday 10:30 PM' },
    { label: 'Harvesting & Quality Check', done: true, time: 'Saturday 7:00 AM' },
    { label: 'Sorting & Eco-Packing', done: true, time: 'Saturday 4:00 PM' },
    { label: 'Out for Sunday Delivery', done: isOut || isDelivered, time: isOut ? 'Out for delivery right now' : 'Sunday 1:00 PM' },
    { label: 'Delivered by 6 PM', done: isDelivered, time: isDelivered ? 'Handover completed' : 'Expected Sunday by 6:00 PM' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-16 md:pb-0">
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full space-y-6">
        {/* SUCCESS / STATUS BANNER */}
        <div className={`text-white rounded-3xl p-6 sm:p-8 space-y-4 text-center shadow-lg transition-colors ${
          isDelivered ? 'bg-emerald-950' : isOut ? 'bg-amber-900' : 'bg-emerald-900'
        }`}>
          <CheckCircle2 className={`w-14 h-14 mx-auto ${isOut ? 'text-amber-300 animate-pulse' : 'text-amber-300'}`} />
          <div>
            <span className="text-xs uppercase tracking-wider text-emerald-300 font-bold">
              {isDelivered ? 'Order Delivered' : isOut ? 'Out for Delivery' : 'Order Placed Successfully'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              {isDelivered ? (
                'Your Easy Farm order has been delivered.'
              ) : isOut ? (
                'Your Easy Farm order is out for delivery.'
              ) : (
                `Order #${orderId}`
              )}
            </h1>
            <p className="text-xs text-emerald-200 mt-1">
              {isDelivered ? (
                <span>Thank you for supporting local Telangana farmers!</span>
              ) : isOut ? (
                <span>Our representative is on the way. Please share the 4-digit OTP upon arrival.</span>
              ) : (
                <>Delivery scheduled for: <strong>Sunday by 6:00 PM</strong> in Ghatkesar &amp; Pocharam</>
              )}
            </p>
          </div>
        </div>

        {/* ORDER TIMELINE */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="w-5 h-5 text-emerald-700" />
            Live Delivery Tracking Status
          </h2>

          <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
            {orderStatuses.map((st, idx) => (
              <div key={idx} className="flex items-start gap-4 relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    st.done
                      ? 'bg-emerald-700 text-white shadow-md'
                      : 'bg-slate-100 border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {st.done ? '✓' : idx + 1}
                </div>
                <div className="pt-1">
                  <h3 className={`text-sm font-bold ${st.done ? 'text-slate-900' : 'text-slate-400'}`}>
                    {st.label}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{st.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BATCH TRANSPARENCY CARD */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-950 text-sm">Batch QR Farmer Transparency</h3>
              <p className="text-xs text-emerald-800">Scan or view batch information for Chevella farm harvest payout.</p>
            </div>
          </div>
          <Link
            href={`/transparency/${orderId}`}
            className="px-4 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition shrink-0 min-h-[40px] flex items-center justify-center"
          >
            View Transparency
          </Link>
        </div>

        {/* ADDRESS & DETAILS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3 text-xs text-slate-600 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-700" />
              Delivery Destination
            </h3>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Payment Confirmed
            </span>
          </div>
          <p className="font-bold text-slate-800 text-sm">
            {deliveryAddress.fullName} {deliveryAddress.phone ? `(${deliveryAddress.phone})` : ''}
          </p>
          <p className="text-slate-600 leading-relaxed">
            {deliveryAddress.flatNo ? `${deliveryAddress.flatNo}, ` : ''}
            {deliveryAddress.apartment ? `${deliveryAddress.apartment}, ` : ''}
            {deliveryAddress.locality || 'Ghatkesar'}, Hyderabad, Telangana — {deliveryAddress.pincode || '501301'}
          </p>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-sm text-center transition shadow-md"
          >
            Continue Shopping
          </Link>
          <Link
            href="/account"
            className="flex-1 py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm text-center transition"
          >
            View Customer Account &amp; Orders
          </Link>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
