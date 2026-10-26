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
} from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
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
  delivery_date: string;
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
  claimed_reward?: {
    id: string;
    name: string;
    brand?: string;
    package_size?: string;
    coin_cost: number;
    image_url?: string;
  } | null;
  items: OrderItem[];
  created_at: string;
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

      setOrders((prev) =>
        prev.map((o) =>
          o.uuid === orderId || o.id === orderId
            ? { ...o, status: newStatus, payment_status: newStatus === 'confirmed' ? 'paid' : o.payment_status }
            : o
        )
      );
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
              Dynamic real-time dashboard displaying verified customer orders, delivery addresses, and payment statuses.
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
                placeholder="Search by order ID, customer name, phone, address..."
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
                    <th className="pb-3">Customer & Contact</th>
                    <th className="pb-3">Delivery Address</th>
                    <th className="pb-3">Items</th>
                    <th className="pb-3">Payment</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Total</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredOrders.map((o) => {
                    const isExpanded = expandedOrderId === o.uuid;
                    return (
                      <React.Fragment key={o.uuid}>
                        <tr className="hover:bg-slate-50/80 transition group">
                          {/* Order ID */}
                          <td className="py-3.5 pl-2 font-mono font-black text-slate-900 text-xs">
                            <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {o.id}
                            </span>
                            <p className="text-[10px] text-slate-400 font-normal mt-1">
                              {new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5">
                            <p className="font-extrabold text-slate-900">{o.customer_name}</p>
                            {o.customer_phone && (
                              <a
                                href={`tel:${o.customer_phone}`}
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-bold hover:underline"
                              >
                                <Phone className="w-3 h-3 text-emerald-600" />
                                {o.customer_phone}
                              </a>
                            )}
                            {o.customer_email && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{o.customer_email}</p>
                            )}
                          </td>

                          {/* Delivery Address */}
                          <td className="py-3.5 max-w-[220px]">
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                              <div className="text-slate-700 text-xs leading-snug">
                                <p className="font-bold text-slate-900">{o.apartment || o.locality}</p>
                                <p className="text-[11px] text-slate-500 line-clamp-2">{o.address}</p>
                              </div>
                            </div>
                          </td>

                          {/* Items */}
                          <td className="py-3.5">
                            <button
                              type="button"
                              onClick={() => setExpandedOrderId(isExpanded ? null : o.uuid)}
                              className="flex items-center gap-1 font-semibold text-slate-900 hover:text-emerald-800 text-xs"
                            >
                              <span>{o.items.length} item{o.items.length > 1 ? 's' : ''}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                            </button>
                            <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                              {o.items[0]?.name || 'Basket'}
                            </p>
                            {o.claimed_reward && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded-md mt-0.5 truncate max-w-[130px]" title={o.claimed_reward.name}>
                                <Gift className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                                <span>{o.claimed_reward.name}</span>
                              </span>
                            )}
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
                              <p className="text-[9px] font-mono text-slate-400 mt-0.5 truncate max-w-[110px]" title={o.payment_id}>
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
                          <td className="py-3.5 text-right pr-2">
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

                        {/* EXPANDED DETAILS ACCORDION */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 border-b border-slate-200">
                            <td colSpan={8} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
                                  <p className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                                    Full Delivery Location
                                  </p>
                                  <p className="font-extrabold text-slate-800">{o.apartment || 'Apartment'}</p>
                                  <p className="text-slate-600">{o.address}</p>
                                  <p className="text-slate-400 text-[11px]">Zone: {o.delivery_zone} | PIN: {o.pincode}</p>
                                </div>

                                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
                                  <p className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                                    Schedule & Payment
                                  </p>
                                  <p className="font-bold text-slate-800">
                                    Delivery: {new Date(o.delivery_date).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
                                  </p>
                                  <p className="text-slate-600">Subtotal: ₹{o.subtotal} | Delivery: ₹{o.delivery_fee}</p>
                                  {o.payment_id && (
                                    <p className="text-emerald-700 font-mono text-[10px]">Razorpay Payment: {o.payment_id}</p>
                                  )}
                                </div>

                                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                                  <p className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400">
                                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                                    Items Breakdown
                                  </p>
                                  <div className="space-y-1">
                                    {o.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-slate-700">
                                        <span>• {item.name} x {item.quantity}</span>
                                        <span className="font-bold">₹{item.totalPrice}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {o.claimed_reward && (
                                  <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-2xl border border-amber-200 space-y-1.5">
                                    <p className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                      <Gift className="w-3.5 h-3.5 text-amber-700" />
                                      Loyalty Reward (Free Essential)
                                    </p>
                                    <p className="font-extrabold text-slate-900 text-xs">{o.claimed_reward.name}</p>
                                    <p className="text-[10px] text-slate-600">
                                      {o.claimed_reward.package_size || '1 Unit'} • {o.claimed_reward.brand || 'Easy Farm'}
                                    </p>
                                    <div className="pt-1.5 border-t border-amber-200/80 flex items-center justify-between text-[10px]">
                                      <span className="font-bold text-amber-900">🪙 {o.claimed_reward.coin_cost} Coins Redeemed</span>
                                      <span className="font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                        Pack in Basket
                                      </span>
                                    </div>
                                  </div>
                                )}
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
