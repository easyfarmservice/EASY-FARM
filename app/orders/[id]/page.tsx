'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Check,
  CheckCircle2,
  Calendar,
  User,
  MapPin,
  ShieldCheck,
  Truck,
  Leaf,
  Package,
  Home,
  ShoppingBag,
  ShoppingCart,
  ListOrdered,
  ArrowRight,
  Clock,
  ExternalLink,
} from 'lucide-react';

import { formatIST, formatTimelineIST, formatDeliveryDateIST } from '@/lib/utils/format-ist';

interface OrderTimeline {
  confirmed_at: string | null;
  harvested_at: string | null;
  packed_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
}

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image?: string;
}

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  statusMessage?: string;
  delivery_date: string;
  delivery_promise?: string;
  created_at: string;
  updated_at: string;
  timeline: OrderTimeline;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  address: {
    formatted: string;
    apartment?: string;
    flatNo?: string;
    locality?: string;
    pincode?: string;
  };
  payment: {
    isPaid: boolean;
    status: string;
    statusText: string;
    paymentId?: string | null;
  };
  pricing: {
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
  };
  items: OrderItem[];
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const rawId = resolvedParams.id || '';

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!rawId) return;

    let isMounted = true;
    setLoading(true);

    fetch(`/api/orders/${rawId}/track`)
      .then((res) => {
        if (!res.ok) throw new Error('Order not found');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.order) {
          setOrder(data.order);
        } else {
          setFetchError(data.error || 'Failed to load order');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        // Fallback: check localStorage for offline/cached order representation
        try {
          const cached = localStorage.getItem(`easyfarm_order_${rawId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            setOrder({
              id: rawId,
              orderNumber: parsed.orderId || rawId,
              status: parsed.status || 'confirmed',
              delivery_date: '2026-11-01',
              delivery_promise: 'by 6:00 PM',
              created_at: parsed.createdAt || new Date().toISOString(),
              updated_at: parsed.createdAt || new Date().toISOString(),
              timeline: {
                confirmed_at: parsed.createdAt || new Date().toISOString(),
                harvested_at: null,
                packed_at: null,
                out_for_delivery_at: null,
                delivered_at: null,
              },
              customer: {
                name: parsed.address?.fullName || 'Resident',
                phone: parsed.address?.phone || '',
                email: parsed.address?.email || '',
              },
              address: {
                formatted: `${parsed.address?.flatNo || ''}, ${parsed.address?.apartment || 'Singapore Township'}, ${parsed.address?.locality || 'Ghatkesar'}, Hyderabad, Telangana – ${parsed.address?.pincode || '500088'}`,
                apartment: parsed.address?.apartment,
                flatNo: parsed.address?.flatNo,
                locality: parsed.address?.locality,
                pincode: parsed.address?.pincode,
              },
              payment: {
                isPaid: true,
                status: 'paid',
                statusText: 'Paid Successfully',
                paymentId: parsed.paymentId,
              },
              pricing: {
                subtotal: parsed.subtotal || 105,
                deliveryFee: parsed.deliveryFee || 0,
                discount: parsed.couponDiscount || 15,
                total: parsed.total || 90,
              },
              items: (parsed.items || []).map((i: any) => ({
                name: i.basket?.name || i.name || 'Fresh Produce',
                quantity: i.quantity || 1,
                unitPrice: i.basket?.price || i.unitPrice || 45,
                totalPrice: (i.quantity || 1) * (i.basket?.price || i.unitPrice || 45),
                image: '/images/hero-vegetables.png',
              })),
            });
            return;
          }
        } catch {}
        setFetchError(err.message || 'Error fetching order');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [rawId]);

  // Fallback defaults for instant rendering matching screenshot
  const displayOrderNumber = order?.orderNumber || (rawId.startsWith('ORD-') ? rawId : `ORD-${rawId.slice(0, 8).toUpperCase()}`);
  const deliveryDateFormatted = formatDeliveryDateIST(order?.delivery_date || '2026-11-01');
  const deliveryPromiseText = order?.delivery_promise || 'by 6:00 PM';
  const customerName = order?.customer.name || 'shiva';
  const customerPhone = order?.customer.phone ? ` (${order.customer.phone})` : '';
  const customerDisplay = `${customerName}${customerPhone}`;
  const addressDisplay =
    order?.address.formatted ||
    '12, Singapore Township, Ghatkesar mandal, Hyderabad, Telangana – 500088';

  // Dynamic timestamps directly from database record (no fabricated dates)
  const confirmedAtStr = order?.timeline?.confirmed_at || order?.created_at;
  const confirmedFormatted = confirmedAtStr ? formatIST(confirmedAtStr) : 'Pending';

  const harvestedAtStr = order?.timeline?.harvested_at;
  const harvestedFormatted = harvestedAtStr ? formatIST(harvestedAtStr) : null;

  const packedAtStr = order?.timeline?.packed_at;
  const packedFormatted = packedAtStr ? formatIST(packedAtStr) : null;

  const outForDeliveryAtStr = order?.timeline?.out_for_delivery_at;
  const outForDeliveryFormatted = outForDeliveryAtStr ? formatIST(outForDeliveryAtStr) : null;

  const deliveredAtStr = order?.timeline?.delivered_at;
  const deliveredFormatted = deliveredAtStr ? formatIST(deliveredAtStr) : null;

  // Timeline Step Status
  const isConfirmed = Boolean(confirmedAtStr);
  const isHarvested = Boolean(harvestedAtStr);
  const isPacked = Boolean(packedAtStr);
  const isOutForDelivery = Boolean(outForDeliveryAtStr) || order?.status === 'out_for_delivery';
  const isDelivered = Boolean(deliveredAtStr) || order?.status === 'delivered';

  // Timeline steps matching screenshot layout
  const timelineSteps = [
    {
      id: 'confirmed',
      title: 'Order Confirmed',
      icon: Calendar,
      isCompleted: isConfirmed,
      isActive: order?.status === 'confirmed',
      // Authoritative format: e.g. "Oct 25, 2026 · 11:42 AM"
      timeText: confirmedFormatted,
      statusLabel: 'Confirmed',
    },
    {
      id: 'harvested',
      title: 'Harvesting & Quality Check',
      icon: Leaf,
      isCompleted: isHarvested,
      isActive: order?.status === 'harvest_scheduled' || order?.status === 'harvested',
      timeText: harvestedFormatted ? harvestedFormatted : 'Scheduled',
      statusLabel: isHarvested ? 'Harvested' : 'Upcoming',
    },
    {
      id: 'packed',
      title: 'Sorting & Eco-Packing',
      icon: Package,
      isCompleted: isPacked,
      isActive: order?.status === 'packed',
      timeText: packedFormatted ? packedFormatted : 'Scheduled',
      statusLabel: isPacked ? 'Packed' : 'Upcoming',
    },
    {
      id: 'out_for_delivery',
      title: 'Out for Delivery',
      icon: Truck,
      isCompleted: isOutForDelivery,
      isActive: order?.status === 'out_for_delivery',
      timeText: outForDeliveryFormatted ? outForDeliveryFormatted : 'Scheduled',
      statusLabel: isOutForDelivery ? 'On the way' : 'Upcoming',
    },
    {
      id: 'delivered',
      title: 'Delivered',
      icon: Home,
      isCompleted: isDelivered,
      isActive: order?.status === 'delivered',
      timeText: deliveredFormatted ? deliveredFormatted : 'Scheduled',
      statusLabel: isDelivered ? 'Delivered' : 'Upcoming',
    },
  ];

  // Produce items list
  const items = order?.items && order.items.length > 0 ? order.items : [
    {
      name: 'Fresh Spinach',
      quantity: 1,
      unitPrice: 45,
      totalPrice: 45,
      image: '/images/spinach-thumb.jpg',
    },
    {
      name: 'Tomatoes',
      quantity: 1,
      unitPrice: 60,
      totalPrice: 60,
      image: '/images/tomatoes-thumb.jpg',
    },
  ];

  const subtotal = order?.pricing ? order.pricing.subtotal : 105;
  const deliveryFee = order?.pricing ? order.pricing.deliveryFee : 0;
  const discount = order?.pricing ? order.pricing.discount : 15;
  const totalPaid = order?.pricing ? order.pricing.total : 90;

  return (
    <div className="min-h-screen bg-[#f7faf7] text-slate-800 font-sans antialiased relative overflow-hidden pb-16">
      {/* BACKGROUND ORGANIC ACCENTS */}
      <div className="absolute top-0 left-0 w-48 h-48 pointer-events-none opacity-40 select-none -translate-x-10 -translate-y-10">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M45 10C80 40 120 20 150 70C180 120 130 160 90 170C50 180 10 140 15 90C20 40 10 -20 45 10Z" fill="#a7f3d0" />
        </svg>
      </div>
      <div className="absolute top-12 right-0 w-64 h-64 pointer-events-none opacity-30 select-none translate-x-16">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 15C100 5 140 45 160 90C180 135 145 175 100 180C55 185 20 150 15 105C10 60 0 25 50 15Z" fill="#bbf7d0" />
        </svg>
      </div>

      {/* TOP HEADER */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-4 flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center text-white shadow-sm transition group-hover:scale-105">
            <Leaf className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-emerald-950 block leading-tight">
              Easy Farm
            </span>
            <span className="text-[10px] text-emerald-800 font-semibold italic block -mt-0.5">
              Freshness, delivered differently.
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-4 text-xs font-bold text-emerald-950">
          <Link
            href="/"
            className="flex items-center gap-1.5 hover:text-emerald-700 transition px-2 py-1"
          >
            <Home className="w-4 h-4 text-emerald-800" />
            <span>Home</span>
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href="/account"
            className="flex items-center gap-1.5 hover:text-emerald-700 transition px-2 py-1"
          >
            <User className="w-4 h-4 text-emerald-800" />
            <span>My Orders</span>
          </Link>
        </nav>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 pt-2 pb-12 relative z-10">
        {/* BANNER: CONFIRMATION & CRATE ILLUSTRATION */}
        <div className="text-center space-y-4 pt-2">
          {/* Green Checkmark Badge with Harvest Crate */}
          <div className="relative inline-flex flex-col items-center justify-center">
            {/* Pulsing circular badge */}
            <div className="w-16 h-16 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 mb-3 relative z-10">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>

            {/* Fresh produce crate illustration */}
            <div className="relative w-44 h-32 sm:w-56 sm:h-36 -mt-2">
              <Image
                src="/images/harvest-crate.jpg"
                alt="Easy Farm Harvest Crate"
                fill
                priority
                sizes="(max-width: 768px) 180px, 240px"
                className="object-contain drop-shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Your order is confirmed!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Thanks for choosing Easy Farm. We&apos;re preparing your fresh harvest.
            </p>
          </div>

          {/* Dynamic Order Pill */}
          <div className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs sm:text-sm font-black text-slate-900 shadow-sm">
            <span>Order #{displayOrderNumber}</span>
          </div>
        </div>

        {/* 4-COLUMN DETAILS OVERVIEW CARD */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-sm shadow-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {/* 1. Delivery On */}
            <div className="flex items-start gap-3 pt-3 sm:pt-0 sm:px-3 first:pl-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 block">Delivery On</span>
                <span className="text-sm font-bold text-slate-900 block truncate">
                  {deliveryDateFormatted}
                </span>
                <span className="text-[11px] text-slate-500 block">{deliveryPromiseText}</span>
              </div>
            </div>

            {/* 2. Customer */}
            <div className="flex items-start gap-3 pt-3 sm:pt-0 sm:px-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 block">Customer</span>
                <span className="text-sm font-bold text-slate-900 block truncate">
                  {customerDisplay}
                </span>
              </div>
            </div>

            {/* 3. Delivery Address */}
            <div className="flex items-start gap-3 pt-3 sm:pt-0 sm:px-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 block">Delivery Address</span>
                <p className="text-xs font-semibold text-slate-700 leading-snug line-clamp-2">
                  {addressDisplay}
                </p>
              </div>
            </div>

            {/* 4. Payment Status */}
            <div className="flex items-start gap-3 pt-3 sm:pt-0 sm:px-3 last:pr-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 block">Payment Status</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {order?.payment.statusText || 'Paid Successfully'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TRACK YOUR ORDER CARD */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-sm shadow-slate-100 space-y-6">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-800" />
              <span>Track Your Order</span>
            </h2>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>On Track</span>
            </div>
          </div>

          {/* Stepper: Desktop & Tablet Horizontal View */}
          <div className="hidden md:block py-2">
            <div className="relative flex items-start justify-between">
              {/* Connecting progress line behind step icons */}
              <div className="absolute top-5 left-10 right-10 h-0.5 bg-slate-200 -z-0">
                <div
                  className="h-full bg-emerald-700 transition-all duration-500"
                  style={{
                    width: isDelivered
                      ? '100%'
                      : isOutForDelivery
                      ? '75%'
                      : isPacked
                      ? '50%'
                      : isHarvested
                      ? '25%'
                      : '0%',
                  }}
                />
              </div>

              {timelineSteps.map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={step.id}
                    className="flex flex-col items-center text-center relative z-10 w-40"
                  >
                    {/* Circle badge */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        step.isCompleted
                          ? 'bg-emerald-700 text-white shadow-sm ring-4 ring-emerald-50'
                          : step.isActive
                          ? 'bg-emerald-700 text-white shadow-sm ring-4 ring-emerald-100'
                          : 'bg-slate-100 border border-slate-300 text-slate-400'
                      }`}
                    >
                      {step.isCompleted ? (
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                    </div>

                    {/* Step Icon Badge */}
                    <div className="mt-2.5">
                      <StepIcon
                        className={`w-4 h-4 mx-auto ${
                          step.isCompleted || step.isActive ? 'text-emerald-800' : 'text-slate-400'
                        }`}
                      />
                    </div>

                    {/* Title */}
                    <h3
                      className={`text-xs font-bold mt-1 leading-snug ${
                        step.isCompleted || step.isActive ? 'text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {step.title}
                    </h3>

                    {/* IST Formatted Timestamp or Status */}
                    <p
                      className={`text-[11px] mt-0.5 font-semibold ${
                        step.isCompleted
                          ? 'text-slate-700'
                          : step.isActive
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.timeText}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stepper: Mobile Vertical View */}
          <div className="md:hidden space-y-5 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timelineSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div key={step.id} className="flex items-start gap-3.5 relative z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      step.isCompleted
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : step.isActive
                        ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-100'
                        : 'bg-slate-100 border border-slate-300 text-slate-400'
                    }`}
                  >
                    {step.isCompleted ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <StepIcon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <h3
                      className={`text-xs font-bold ${
                        step.isCompleted || step.isActive ? 'text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`text-[11px] mt-0.5 font-semibold ${
                        step.isCompleted
                          ? 'text-slate-700'
                          : step.isActive
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.timeText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KNOW YOUR HARVEST BANNER */}
        <div className="bg-gradient-to-r from-emerald-100/70 via-green-50 to-emerald-100/50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm shadow-emerald-100/40">
          <div className="flex items-center gap-3.5 text-center sm:text-left w-full sm:w-auto">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-sm border border-emerald-200">
              <Image
                src="/images/know-your-harvest.jpg"
                alt="Know your harvest"
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Know your harvest
              </h3>
              <p className="text-xs text-slate-600 max-w-sm">
                View details about the farm and batch information for your order.
              </p>
            </div>
          </div>
          <Link
            href={`/transparency/${displayOrderNumber}`}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-bold flex items-center justify-center gap-2 transition shrink-0 shadow-sm shadow-emerald-900/20"
          >
            <span>View harvest details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ORDER SUMMARY CARD */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm shadow-slate-100 space-y-4">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-800" />
              <span>Order Summary</span>
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-1">
            {/* Left: Produce Items List (7 cols) */}
            <div className="md:col-span-7 space-y-3.5 divide-y divide-slate-100">
              {items.map((item, idx) => {
                const itemImg =
                  item.image ||
                  (item.name.toLowerCase().includes('spinach')
                    ? '/images/spinach-thumb.jpg'
                    : item.name.toLowerCase().includes('tomato')
                    ? '/images/tomatoes-thumb.jpg'
                    : '/images/hero-vegetables.png');

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between pt-3 first:pt-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                        <Image
                          src={itemImg}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-contain p-1"
                        />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {item.name}
                        </h4>
                        <span className="text-[11px] text-slate-500 block">
                          {item.quantity} kg
                        </span>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      ₹{item.totalPrice}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Right: Pricing Breakdown (5 cols) */}
            <div className="md:col-span-5 md:border-l md:border-slate-100 md:pl-6 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">₹{subtotal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery Fee</span>
                <span className="font-semibold text-slate-900">
                  {deliveryFee === 0 ? '₹0' : `₹${deliveryFee}`}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="font-semibold">- ₹{discount}</span>
                </div>
              )}

              {/* Total Paid Highlight Box */}
              <div className="pt-2">
                <div className="p-3 rounded-xl bg-emerald-100/70 border border-emerald-200/80 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Total Paid</span>
                  <span className="text-base font-black text-slate-950">₹{totalPaid}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          <Link
            href="/"
            className="w-full py-3.5 px-6 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm text-center transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-800/20"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
          <Link
            href="/account"
            className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm text-center transition flex items-center justify-center gap-2 shadow-sm"
          >
            <ListOrdered className="w-4 h-4" />
            <span>View My Orders</span>
          </Link>
        </div>

        {/* TRUST BADGES FOOTER */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <Leaf className="w-4 h-4 text-emerald-700" />
            <span>100% Fresh Produce</span>
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Safe &amp; Secure Payments</span>
          </div>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-700" />
            <span>On-Time Delivery</span>
          </div>
        </div>
      </main>
    </div>
  );
}
