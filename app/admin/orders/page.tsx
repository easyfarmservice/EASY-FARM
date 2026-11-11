'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Search,
  Filter,
  RefreshCw,
  ShoppingBag,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Gift,
  User,
  Clock,
  Package,
} from 'lucide-react';

interface CustomizedSubItem {
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
  price?: number;
  compare_at_price?: number;
  image_url?: string;
  isSwapped?: boolean;
  replacedProductName?: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizedItems?: CustomizedSubItem[];
}

interface AdminOrder {
  id: string;
  uuid: string;
  status: string;
  payment_status: string;
  payment_id: string | null;
  total: number;
  subtotal: number;
  delivery_fee: number;
  coupon_discount?: number;
  delivery_date: string;
  delivery_promise?: string;
  delivery_zone: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  address: string;
  flat_no?: string;
  apartment?: string;
  locality?: string;
  pincode?: string;
  coupon_code?: string | null;
  coins_discount?: {
    coinsUsed: number;
    discountAmount: number;
  } | null;
  claimed_reward?: {
    id: string;
    name: string;
    brand?: string;
    package_size?: string;
    quantity?: number;
    coin_cost: number;
    total_coins?: number;
    image_url?: string;
  } | null;
  claimed_rewards?: Array<{
    id: string;
    name: string;
    brand?: string;
    package_size?: string;
    quantity: number;
    coin_cost: number;
    total_coins: number;
    image_url?: string;
  }>;
  streak_reward?: {
    id: string;
    title: string;
    discountAmount: number;
  } | null;
  items: OrderItem[];
  confirmed_at?: string | null;
  created_at: string;
}

function formatSubItemQuantityAndPrice(sub: CustomizedSubItem, boxQty: number) {
  const unitStr = (sub.unit || '').trim();
  const rawQty = Number(sub.quantity) || 1;
  const rawPrice = Number(sub.price) || 0;

  // In CustomBoxZeptoView, `unit` starts with a number (e.g. "500 g", "1 kg") and `quantity` is pack count
  if (/^\d/.test(unitStr)) {
    const totalPacks = rawQty * Math.max(1, boxQty);
    const displayQuantity = totalPacks > 1 ? `${totalPacks} × ${unitStr}` : unitStr;
    const unitPrice = rawPrice;
    const totalPrice = rawPrice * totalPacks;
    return { displayQuantity, unitPrice, totalPrice };
  }

  // In StapleBoxZeptoView, `quantity` is the weight value (e.g. 500 with unit "g", or 1 with unit "kg")
  const baseQtyLabel = `${rawQty} ${unitStr}`.trim();
  const displayQuantity = boxQty > 1 ? `${boxQty} × (${baseQtyLabel})` : baseQtyLabel;
  const unitPrice = rawPrice;
  const totalPrice = rawPrice * Math.max(1, boxQty);
  return { displayQuantity, unitPrice, totalPrice };
}

function formatDeliveryDate(dateStr?: string, createdAt?: string) {
  let target = dateStr ? new Date(dateStr) : null;
  if (!target || isNaN(target.getTime())) {
    const base = createdAt ? new Date(createdAt) : new Date();
    const daysUntilSun = (7 - base.getDay()) % 7 || 7;
    base.setDate(base.getDate() + daysUntilSun);
    target = base;
  }
  return target.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);

        // If URL has ?order= or ?orderId=, auto-expand that order on initial load
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const targetOrder = params.get('orderId') || params.get('order');
          if (targetOrder) {
            const matched = data.orders.find(
              (o: AdminOrder) => o.id === targetOrder || o.uuid === targetOrder
            );
            if (matched) {
              setExpandedOrderId((prev) => prev || matched.uuid);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-refresh polling every 8 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchOrders();
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update order status');
      }

      if (newStatus === 'delivered' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('weekly-streak-updated'));
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.uuid === orderId || o.id === orderId
            ? {
                ...o,
                status: newStatus,
                payment_status: newStatus === 'confirmed' ? 'paid' : o.payment_status,
                confirmed_at:
                  newStatus === 'confirmed' && !o.confirmed_at
                    ? new Date().toISOString()
                    : o.confirmed_at,
              }
            : o
        )
      );

      // Automatically expand the order details when confirmed so the admin sees all order details immediately
      if (newStatus === 'confirmed') {
        setExpandedOrderId(orderId);
      }

      setUpdateMsg(`Order ${orderId.slice(0, 8)} status updated to "${newStatus.replace('_', ' ').toUpperCase()}"`);
      setTimeout(() => setUpdateMsg(null), 3500);
    } catch (err: any) {
      alert('Could not update status: ' + err.message);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      o.id.toLowerCase().includes(term) ||
      o.customer_name.toLowerCase().includes(term) ||
      o.customer_phone.toLowerCase().includes(term) ||
      (o.customer_email && o.customer_email.toLowerCase().includes(term)) ||
      o.address.toLowerCase().includes(term) ||
      (o.payment_id && o.payment_id.toLowerCase().includes(term));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'paid' && o.payment_status === 'paid') ||
      o.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-slate-900">Live Customer Orders</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Click on any order row to view complete items ordered, quantities, prices, delivery date, delivery location, phone number, and email ID.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded accent-emerald-600"
              />
              Auto-refresh (8s)
            </label>

            <button
              onClick={() => {
                setLoading(true);
                fetchOrders();
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh Now'}
            </button>
          </div>
        </div>

        {updateMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-sm animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{updateMsg}</span>
          </div>
        )}

        {/* SEARCH & FILTERS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by order ID, customer name, phone, email, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-slate-500 shrink-0">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Orders ({orders.length})</option>
                <option value="confirmed">Confirmed</option>
                <option value="paid">Paid</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          {/* ORDERS TABLE */}
          {loading && orders.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-700" />
              <p>Fetching dynamic live orders from Supabase...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-1" />
              <p className="font-bold text-slate-800 text-sm">No matching orders found</p>
              <p className="text-slate-400">Orders placed by customers will appear here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 pl-2">Order ID</th>
                    <th className="pb-3">Customer &amp; Contact</th>
                    <th className="pb-3">Delivery Location &amp; Date</th>
                    <th className="pb-3">Items Ordered</th>
                    <th className="pb-3">Payment</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Total Price</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredOrders.map((o) => {
                    const isExpanded = expandedOrderId === o.uuid;
                    const totalSubItemsCount = o.items.reduce(
                      (sum, item) =>
                        sum +
                        (item.customizedItems && item.customizedItems.length > 0
                          ? item.customizedItems.length
                          : 1),
                      0
                    );

                    return (
                      <React.Fragment key={o.uuid}>
                        <tr
                          onClick={() => setExpandedOrderId(isExpanded ? null : o.uuid)}
                          className={`transition cursor-pointer ${
                            isExpanded
                              ? 'bg-emerald-50/70 hover:bg-emerald-50'
                              : 'hover:bg-slate-50/90'
                          }`}
                          title="Click to view full order details"
                        >
                          {/* Order ID */}
                          <td className="py-3.5 pl-2 font-mono font-black text-slate-900 text-xs">
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 group-hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              <span>{o.id}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-emerald-700" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-sans font-normal mt-1">
                              {new Date(o.created_at).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </td>

                          {/* Customer & Contact */}
                          <td className="py-3.5">
                            <p className="font-extrabold text-slate-900">{o.customer_name}</p>
                            {o.customer_phone ? (
                              <a
                                href={`tel:${o.customer_phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-bold hover:underline mt-0.5"
                              >
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                {o.customer_phone}
                              </a>
                            ) : (
                              <p className="text-[10px] text-slate-400">No phone</p>
                            )}
                            {o.customer_email && (
                              <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 break-all max-w-[200px]">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{o.customer_email}</span>
                              </p>
                            )}
                          </td>

                          {/* Delivery Address & Date */}
                          <td className="py-3.5 max-w-[230px]">
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                              <div className="text-slate-700 text-xs leading-snug">
                                <p className="font-bold text-slate-900">
                                  {o.apartment || o.locality}
                                </p>
                                <p className="text-[11px] text-slate-500 line-clamp-2">{o.address}</p>
                                <p className="text-[10px] font-bold text-emerald-800 mt-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>
                                    Delivery:{' '}
                                    {formatDeliveryDate(o.delivery_date, o.created_at)}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Items */}
                          <td className="py-3.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedOrderId(isExpanded ? null : o.uuid);
                              }}
                              className="inline-flex items-center gap-1.5 font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer"
                            >
                              <span>
                                {o.items.length} box{o.items.length > 1 ? 'es' : ''} ({totalSubItemsCount} items)
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-emerald-800" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
                              )}
                            </button>
                            <p className="text-[11px] font-semibold text-slate-700 mt-1 truncate max-w-[160px]">
                              {o.items.map((it) => `${it.name} (×${it.quantity})`).join(', ')}
                            </p>
                            {(() => {
                              const rewardsList =
                                Array.isArray(o.claimed_rewards) && o.claimed_rewards.length > 0
                                  ? o.claimed_rewards
                                  : o.claimed_reward
                                  ? [
                                      {
                                        ...o.claimed_reward,
                                        quantity: o.claimed_reward.quantity || 1,
                                        total_coins:
                                          o.claimed_reward.total_coins || o.claimed_reward.coin_cost,
                                      },
                                    ]
                                  : [];
                              if (rewardsList.length === 0) return null;
                              return (
                                <div className="flex flex-wrap gap-1 mt-1 max-w-[210px]">
                                  {rewardsList.map((rew, rIdx) => (
                                    <span
                                      key={rew.id || rIdx}
                                      className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded-md truncate max-w-[190px]"
                                      title={`${rew.name} (${rew.package_size || '1 Unit'}) × ${rew.quantity}`}
                                    >
                                      <Gift className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                                      <span>
                                        {rew.name} ×{rew.quantity}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>

                          {/* Payment */}
                          <td className="py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 font-black px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${
                                o.payment_status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-900 border border-amber-200'
                              }`}
                            >
                              <CreditCard className="w-2.5 h-2.5" />
                              {o.payment_status === 'paid' ? 'PAID' : 'PENDING'}
                            </span>
                            {o.payment_id && (
                              <p
                                className="text-[9px] font-mono text-slate-400 mt-0.5 truncate max-w-[110px]"
                                title={o.payment_id}
                              >
                                {o.payment_id}
                              </p>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5">
                            <span
                              className={`font-bold px-2.5 py-1 rounded-xl text-[11px] capitalize ${
                                o.status === 'confirmed'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : o.status === 'delivered'
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                  : o.status === 'out_for_delivery'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {o.status.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Total */}
                          <td className="py-3.5 text-right font-black text-slate-900 text-sm">
                            ₹{o.total.toFixed(2)}
                            {o.coupon_code && (
                              <p className="text-[10px] text-emerald-700 font-mono font-bold">
                                [{o.coupon_code}]
                              </p>
                            )}
                          </td>

                          {/* Actions */}
                          <td
                            className="py-3.5 text-right pr-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={o.status}
                              onChange={(e) => handleUpdateStatus(o.uuid, e.target.value)}
                              className="border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer shadow-xs"
                            >
                              <option value="confirmed">Confirmed</option>
                              <option value="harvest_scheduled">Harvest Scheduled</option>
                              <option value="packed">Packed</option>
                              <option value="out_for_delivery">Out for Delivery</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>

                        {/* EXPANDED COMPLETE ORDER DETAILS PANEL */}
                        {isExpanded && (
                          <tr className="bg-emerald-50/40 border-b-2 border-emerald-200">
                            <td colSpan={8} className="p-4 sm:p-6">
                              <div className="bg-white rounded-3xl border border-emerald-200/90 shadow-md p-5 sm:p-6 space-y-6">
                                {/* TOP SUMMARY BAR */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="px-3 py-1 rounded-xl bg-emerald-900 text-white font-mono font-black text-xs">
                                      Order #{o.id}
                                    </span>
                                    <span
                                      className={`px-3 py-1 rounded-xl font-black text-xs uppercase tracking-wide border ${
                                        o.status === 'confirmed' || o.payment_status === 'paid'
                                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                          : 'bg-amber-100 text-amber-900 border-amber-300'
                                      }`}
                                    >
                                      {o.status.replace('_', ' ')} •{' '}
                                      {o.payment_status === 'paid' ? 'PAYMENT CONFIRMED' : 'PAYMENT PENDING'}
                                    </span>
                                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      Ordered on{' '}
                                      {new Date(o.created_at).toLocaleString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setExpandedOrderId(null)}
                                    className="text-xs font-bold text-slate-500 hover:text-slate-800 self-end sm:self-auto cursor-pointer"
                                  >
                                    Close Details ✕
                                  </button>
                                </div>

                                {/* 3-COLUMN INFO CARDS: CUSTOMER CONTACT | DELIVERY LOCATION | DELIVERY DATE */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                  {/* 1. CUSTOMER CONTACT DETAILS (NAME, PHONE NUMBER, EMAIL ID) */}
                                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
                                    <p className="font-black text-slate-500 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                      <User className="w-4 h-4 text-emerald-700" />
                                      Customer Contact Details
                                    </p>
                                    <div className="space-y-2 pt-1">
                                      <div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                          Customer Name
                                        </span>
                                        <span className="font-black text-slate-900 text-sm">
                                          {o.customer_name}
                                        </span>
                                      </div>

                                      <div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                          Phone Number
                                        </span>
                                        {o.customer_phone ? (
                                          <a
                                            href={`tel:${o.customer_phone}`}
                                            className="inline-flex items-center gap-1.5 font-black text-emerald-800 hover:text-emerald-950 text-sm hover:underline"
                                          >
                                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            <span>{o.customer_phone}</span>
                                          </a>
                                        ) : (
                                          <span className="text-slate-400 font-semibold">
                                            Not provided
                                          </span>
                                        )}
                                      </div>

                                      <div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                          Email ID
                                        </span>
                                        {o.customer_email ? (
                                          <a
                                            href={`mailto:${o.customer_email}`}
                                            className="inline-flex items-center gap-1.5 font-bold text-slate-800 hover:text-emerald-800 text-xs break-all hover:underline"
                                          >
                                            <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            <span>{o.customer_email}</span>
                                          </a>
                                        ) : (
                                          <span className="text-slate-400 font-semibold">
                                            Not provided
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 2. LOCATION TO BE DELIVERED */}
                                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
                                    <p className="font-black text-slate-500 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                      <MapPin className="w-4 h-4 text-emerald-700" />
                                      Location to be Delivered
                                    </p>
                                    <div className="space-y-1.5 pt-1">
                                      {o.flat_no && (
                                        <div>
                                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                            Flat / Door No.
                                          </span>
                                          <span className="font-bold text-slate-900">{o.flat_no}</span>
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                          Apartment / Community
                                        </span>
                                        <span className="font-black text-slate-900 text-sm">
                                          {o.apartment || 'Resident Address'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                          Full Delivery Address
                                        </span>
                                        <p className="font-semibold text-slate-700 leading-relaxed">
                                          {o.address}
                                        </p>
                                      </div>
                                      <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                                        <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                                          PIN: {o.pincode || '500088'}
                                        </span>
                                        <span className="bg-white text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                                          Zone: {o.delivery_zone}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 3. DATE TO BE DELIVERED & PAYMENT SUMMARY */}
                                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
                                    <p className="font-black text-slate-500 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                      <Calendar className="w-4 h-4 text-emerald-700" />
                                      Date to be Delivered
                                    </p>
                                    <div className="space-y-2 pt-1">
                                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                                        <span className="text-[10px] font-black uppercase text-emerald-800 block">
                                          Scheduled Delivery Date
                                        </span>
                                        <span className="font-black text-emerald-950 text-sm block mt-0.5">
                                          {formatDeliveryDate(o.delivery_date, o.created_at)}
                                        </span>
                                        <span className="text-[11px] font-semibold text-emerald-700 block mt-0.5">
                                          Slot: {o.delivery_promise || 'Sunday, 8:00 AM – 6:00 PM'}
                                        </span>
                                      </div>

                                      <div className="space-y-1 text-slate-700 pt-1">
                                        <div className="flex justify-between">
                                          <span className="text-slate-500">Items Subtotal:</span>
                                          <span className="font-bold">₹{o.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-slate-500">Delivery Fee:</span>
                                          <span className="font-bold">
                                            {o.delivery_fee === 0 ? 'FREE' : `₹${o.delivery_fee.toFixed(2)}`}
                                          </span>
                                        </div>
                                        {(o.coupon_discount || 0) > 0 && (
                                          <div className="flex justify-between text-emerald-700">
                                            <span>Coupon Discount ({o.coupon_code}):</span>
                                            <span className="font-bold">-₹{Number(o.coupon_discount).toFixed(2)}</span>
                                          </div>
                                        )}
                                        {o.coins_discount && o.coins_discount.discountAmount > 0 && (
                                          <div className="flex justify-between text-amber-800">
                                            <span>
                                              🪙 Easy Coins Discount ({o.coins_discount.coinsUsed} Coins):
                                            </span>
                                            <span className="font-bold">
                                              -₹{Number(o.coins_discount.discountAmount).toFixed(2)}
                                            </span>
                                          </div>
                                        )}
                                        <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-black text-slate-900">
                                          <span>Total Amount:</span>
                                          <span className="text-emerald-900">₹{o.total.toFixed(2)}</span>
                                        </div>
                                      </div>

                                      {o.payment_id && (
                                        <p className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 break-all">
                                          Payment ID: {o.payment_id}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* ITEMS ORDERED, QUANTITY & PRICE BREAKDOWN TABLE */}
                                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                  <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-4 h-4 text-emerald-400" />
                                      <h3 className="font-black text-xs uppercase tracking-wider">
                                        Items Ordered, Quantity &amp; Price Breakdown
                                      </h3>
                                    </div>
                                    <span className="text-[11px] font-bold text-emerald-300">
                                      Total Payable: ₹{o.total.toFixed(2)}
                                    </span>
                                  </div>

                                  <div className="divide-y divide-slate-200 bg-white">
                                    {o.items.map((item, idx) => {
                                      const hasSubItems =
                                        Array.isArray(item.customizedItems) &&
                                        item.customizedItems.length > 0;

                                      return (
                                        <div key={idx} className="p-4 space-y-3">
                                          {/* Parent Basket / Box Header */}
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                            <div className="flex items-center gap-2.5">
                                              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-900 font-black text-xs flex items-center justify-center">
                                                {idx + 1}
                                              </span>
                                              <div>
                                                <p className="font-black text-slate-900 text-sm">
                                                  {item.name}
                                                </p>
                                                <p className="text-[11px] text-slate-500 font-semibold">
                                                  Box Quantity: {item.quantity} × ₹{Number(item.unitPrice).toFixed(2)}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                                Box Total Price
                                              </span>
                                              <span className="font-black text-emerald-900 text-sm">
                                                ₹{Number(item.totalPrice).toFixed(2)}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Individual Vegetables Ordered Inside the Box */}
                                          {hasSubItems && (
                                            <div className="overflow-x-auto">
                                              <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                                                    <th className="py-2 px-3">Vegetable / Item Ordered</th>
                                                    <th className="py-2 px-3">Net Quantity</th>
                                                    <th className="py-2 px-3 text-right">Unit Price</th>
                                                    <th className="py-2 px-3 text-right">Item Total</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                  {item.customizedItems!.map((sub, sIdx) => {
                                                    const {
                                                      displayQuantity,
                                                      unitPrice,
                                                      totalPrice,
                                                    } = formatSubItemQuantityAndPrice(
                                                      sub,
                                                      item.quantity
                                                    );

                                                    return (
                                                      <tr
                                                        key={sIdx}
                                                        className="hover:bg-slate-50/80"
                                                      >
                                                        <td className="py-2 px-3 font-bold text-slate-900">
                                                          <span>{sub.productName}</span>
                                                          {sub.isSwapped && (
                                                            <span className="ml-2 text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                                                              Swapped
                                                              {sub.replacedProductName
                                                                ? ` (replaced ${sub.replacedProductName})`
                                                                : ''}
                                                            </span>
                                                          )}
                                                        </td>
                                                        <td className="py-2 px-3">
                                                          <span className="font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                            {displayQuantity}
                                                          </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-semibold text-slate-600">
                                                          ₹{unitPrice.toFixed(2)}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-black text-slate-900">
                                                          ₹{totalPrice.toFixed(2)}
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}

                                    {/* EXTRA ITEMS CLAIMED USING EASY COINS INSIDE ITEMS BREAKDOWN */}
                                    {(() => {
                                      const rewardsList =
                                        Array.isArray(o.claimed_rewards) && o.claimed_rewards.length > 0
                                          ? o.claimed_rewards
                                          : o.claimed_reward
                                          ? [
                                              {
                                                ...o.claimed_reward,
                                                quantity: o.claimed_reward.quantity || 1,
                                                total_coins:
                                                  o.claimed_reward.total_coins ||
                                                  o.claimed_reward.coin_cost,
                                              },
                                            ]
                                          : [];

                                      if (rewardsList.length === 0) return null;

                                      const totalCoinsUsed = rewardsList.reduce(
                                        (sum, r) => sum + Number(r.total_coins || r.coin_cost * (r.quantity || 1)),
                                        0
                                      );

                                      return (
                                        <div className="p-4 bg-amber-50/40 space-y-3">
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200/70">
                                            <div className="flex items-center gap-2.5">
                                              <span className="w-6 h-6 rounded-lg bg-amber-200 text-amber-950 font-black text-xs flex items-center justify-center">
                                                🎁
                                              </span>
                                              <div>
                                                <p className="font-black text-amber-950 text-sm">
                                                  Extra Items Claimed Using Easy Coins (Pack in Basket)
                                                </p>
                                                <p className="text-[11px] text-amber-800 font-semibold">
                                                  {rewardsList.reduce((s, r) => s + (r.quantity || 1), 0)} Extra Item
                                                  {rewardsList.reduce((s, r) => s + (r.quantity || 1), 0) > 1
                                                    ? 's'
                                                    : ''}{' '}
                                                  • Redeemed with 🪙 {totalCoinsUsed} Easy Coins
                                                </p>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <span className="text-[10px] font-bold uppercase text-amber-700 block">
                                                Extra Items Price
                                              </span>
                                              <span className="font-black text-emerald-800 text-sm">
                                                ₹0.00 (Free with Coins)
                                              </span>
                                            </div>
                                          </div>

                                          <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                              <thead>
                                                <tr className="bg-amber-100/60 text-amber-900 font-bold uppercase text-[10px] border-b border-amber-200">
                                                  <th className="py-2 px-3">Extra Item Claimed</th>
                                                  <th className="py-2 px-3">Package Size &amp; Quantity</th>
                                                  <th className="py-2 px-3 text-right">Easy Coins Used</th>
                                                  <th className="py-2 px-3 text-right">Price</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-amber-100 bg-white">
                                                {rewardsList.map((rew, rIdx) => (
                                                  <tr key={rew.id || rIdx} className="hover:bg-amber-50/40">
                                                    <td className="py-2.5 px-3 font-black text-slate-900">
                                                      <div className="flex items-center gap-2">
                                                        <Gift className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                        <div>
                                                          <span>{rew.name}</span>
                                                          {rew.brand && (
                                                            <span className="ml-1.5 text-[10px] font-semibold text-slate-500">
                                                              ({rew.brand})
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                      <span className="font-bold text-amber-950 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md">
                                                        {rew.quantity || 1} × ({rew.package_size || '1 Unit'})
                                                      </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-bold text-amber-900">
                                                      🪙 {rew.total_coins || rew.coin_cost * (rew.quantity || 1)} Coins
                                                      {(rew.quantity || 1) > 1 && (
                                                        <span className="block text-[10px] text-slate-400 font-normal">
                                                          ({rew.coin_cost} coins each)
                                                        </span>
                                                      )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                                                      ₹0.00 (Free)
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* LOYALTY REWARD SUMMARY BANNER IF PRESENT */}
                                {(() => {
                                  const rewardsList =
                                    Array.isArray(o.claimed_rewards) && o.claimed_rewards.length > 0
                                      ? o.claimed_rewards
                                      : o.claimed_reward
                                      ? [
                                          {
                                            ...o.claimed_reward,
                                            quantity: o.claimed_reward.quantity || 1,
                                            total_coins:
                                              o.claimed_reward.total_coins || o.claimed_reward.coin_cost,
                                          },
                                        ]
                                      : [];

                                  if (rewardsList.length === 0) return null;

                                  const totalCoinsRedeemed = rewardsList.reduce(
                                    (sum, r) => sum + Number(r.total_coins || r.coin_cost * (r.quantity || 1)),
                                    0
                                  );

                                  return (
                                    <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="space-y-1.5">
                                        <p className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                          <Gift className="w-3.5 h-3.5 text-amber-700" />
                                          Extra Items Claimed Using Easy Coins (Pack in Basket)
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {rewardsList.map((rew, rIdx) => (
                                            <span
                                              key={rew.id || rIdx}
                                              className="inline-flex items-center gap-1.5 font-extrabold text-slate-900 text-xs bg-white px-3 py-1 rounded-xl border border-amber-300 shadow-2xs"
                                            >
                                              <span>🎁 {rew.name}</span>
                                              <span className="text-amber-800">
                                                ({rew.package_size || '1 Unit'}) × {rew.quantity || 1}
                                              </span>
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs shrink-0">
                                        <span className="font-bold text-amber-900 bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">
                                          🪙 {totalCoinsRedeemed} Coins Redeemed
                                        </span>
                                        <span className="font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg">
                                          Pack in Basket
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
