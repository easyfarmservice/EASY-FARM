'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  Phone,
  MapPin,
  Calendar,
  Send,
  X,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  UserCheck,
  Building,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

interface DeliveryOrder {
  id: string;
  raw_id: string;
  customer_name: string;
  phone: string;
  masked_phone: string;
  area: string;
  delivery_address: string;
  full_address: string;
  amount: number;
  status: string;
  delivery_date: string;
  is_today: boolean;
  delivery_person: string;
  delivery_person_type: string;
  assigned_at?: string;
  otp_verified: boolean;
  otp_attempts: number;
  otp_created_at?: string;
  otp_expires_at?: string;
  delivered_at?: string;
  failure_reason?: string;
  rescheduled_date?: string;
  basket_summary: string;
}

interface DeliveryStats {
  total_today: number;
  ready: number;
  out_for_delivery: number;
  delivered: number;
  failed: number;
}

export default function DeliveryOperationsPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [stats, setStats] = useState<DeliveryStats>({
    total_today: 0,
    ready: 0,
    out_for_delivery: 0,
    delivered: 0,
    failed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusTab, setStatusTab] = useState<'ALL' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');

  // Modals & Drawers state
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [verifyModalOrder, setVerifyModalOrder] = useState<DeliveryOrder | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<{ time: string } | null>(null);

  // Start Delivery confirmation modal
  const [startModalOrder, setStartModalOrder] = useState<DeliveryOrder | null>(null);
  const [startingDelivery, setStartingDelivery] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Resend OTP state
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Failure modal state
  const [failModalOrder, setFailModalOrder] = useState<DeliveryOrder | null>(null);
  const [failReason, setFailReason] = useState('Customer unavailable');
  const [customFailReason, setCustomFailReason] = useState('');
  const [submittingFail, setSubmittingFail] = useState(false);

  // Reschedule modal state
  const [rescheduleOrder, setRescheduleOrder] = useState<DeliveryOrder | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('Customer requested Sunday reschedule');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  // Unmask phone state
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({});

  // 1. Fetch live delivery operations list
  const fetchDeliveries = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (dateFilter === 'today') params.set('date', 'today');
      if (statusTab !== 'ALL') params.set('status', statusTab);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/delivery/list?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders || []);
        if (data.stats) setStats(data.stats);
      } else {
        console.error('Failed to load deliveries:', data.error);
      }
    } catch (err) {
      console.error('Network error loading deliveries:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFilter, statusTab, searchQuery]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Notice auto-dismiss
  useEffect(() => {
    if (!actionNotice) return;
    const t = setTimeout(() => setActionNotice(null), 5000);
    return () => clearTimeout(t);
  }, [actionNotice]);

  // 2. Action: Start Delivery
  const handleStartDelivery = async (order: DeliveryOrder) => {
    setStartingDelivery(true);
    setStartError(null);

    try {
      const res = await fetch('/api/delivery/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.raw_id }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStartError(data.message || 'Failed to start delivery.');
        return;
      }

      setStartModalOrder(null);
      setActionNotice({
        type: 'success',
        message: `Delivery started for Order #${order.id}! 4-digit OTP dispatched to customer.`,
      });
      fetchDeliveries(true);
    } catch (err: any) {
      setStartError('Network error starting delivery: ' + err.message);
    } finally {
      setStartingDelivery(false);
    }
  };

  // 3. Action: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModalOrder || otpInput.trim().length !== 4) {
      setVerifyError('Please enter a complete 4-digit OTP.');
      return;
    }

    setVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetch('/api/delivery/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: verifyModalOrder.raw_id,
          otp: otpInput.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setVerifyError(data.message || 'Verification failed. Please check the OTP.');
        return;
      }

      const deliveredTime = new Date(data.delivered_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      setVerifySuccess({ time: deliveredTime });
      fetchDeliveries(true);
    } catch (err: any) {
      setVerifyError('Network error verifying OTP: ' + err.message);
    } finally {
      setVerifying(false);
    }
  };

  // 4. Action: Resend OTP
  const handleResendOtp = async (order: DeliveryOrder) => {
    if (resendCooldown > 0) return;
    setResending(true);

    try {
      const res = await fetch('/api/delivery/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.raw_id }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setActionNotice({
          type: 'error',
          message: data.message || 'Unable to resend OTP at this time.',
        });
        return;
      }

      setResendCooldown(30);
      setOtpInput('');
      setVerifyError(null);
      setActionNotice({
        type: 'success',
        message: `New OTP generated and sent to ${order.customer_name}'s mobile. Previous OTP invalidated.`,
      });
      fetchDeliveries(true);
    } catch (err: any) {
      setActionNotice({ type: 'error', message: 'Failed to resend OTP: ' + err.message });
    } finally {
      setResending(false);
    }
  };

  // 5. Action: Mark Delivery Failed
  const handleMarkFailed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!failModalOrder) return;

    const finalReason = failReason === 'Other' ? customFailReason.trim() : failReason;
    if (!finalReason) {
      alert('Please specify a reason for delivery failure.');
      return;
    }

    setSubmittingFail(true);
    try {
      const res = await fetch('/api/delivery/fail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: failModalOrder.raw_id,
          reason: finalReason,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || 'Failed to update delivery status.');
        return;
      }

      setFailModalOrder(null);
      setSelectedOrder(null);
      setActionNotice({
        type: 'error',
        message: `Order #${failModalOrder.id} marked as delivery failed (${finalReason}).`,
      });
      fetchDeliveries(true);
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    } finally {
      setSubmittingFail(false);
    }
  };

  // 6. Action: Reschedule Delivery
  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleOrder || !newRescheduleDate) {
      alert('Please select a new delivery date.');
      return;
    }

    setSubmittingReschedule(true);
    try {
      const res = await fetch('/api/delivery/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: rescheduleOrder.raw_id,
          new_date: newRescheduleDate,
          reason: rescheduleReason,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || 'Failed to reschedule order.');
        return;
      }

      setRescheduleOrder(null);
      setSelectedOrder(null);
      setActionNotice({
        type: 'success',
        message: `Order #${rescheduleOrder.id} successfully rescheduled to ${newRescheduleDate}.`,
      });
      fetchDeliveries(true);
    } catch (err: any) {
      alert('Error rescheduling: ' + err.message);
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const togglePhoneReveal = (orderId: string) => {
    setRevealedPhones((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Render badge helper
  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            OUT FOR DELIVERY
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
            <Check className="w-3.5 h-3.5 text-emerald-700" />
            DELIVERED
          </span>
        );
      case 'ready_for_delivery':
      case 'confirmed':
      case 'packed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-900 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            READY FOR DELIVERY
          </span>
        );
      case 'failed':
      case 'delivery_failed':
      case 'customer_unavailable':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-900 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            FAILED / ATTEMPTED
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-300">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase">
            {status.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-20">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-sm">
                <Truck className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Delivery Operations
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200">
                Founder Mode
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dispatch orders, trigger secure 4-digit OTPs via MSG91, and verify customer doorstep handovers in Ghatkesar &amp; Pocharam.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => fetchDeliveries(true)}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs min-h-[38px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-700' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Deliveries'}</span>
            </button>
          </div>
        </div>

        {/* NOTICES */}
        {actionNotice && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
              actionNotice.type === 'success'
                ? 'bg-emerald-100 border border-emerald-300 text-emerald-950'
                : 'bg-red-100 border border-red-300 text-red-950'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionNotice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
              )}
              <span>{actionNotice.message}</span>
            </div>
            <button
              onClick={() => setActionNotice(null)}
              className="p-1 hover:bg-black/10 rounded-lg text-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. SUMMARY STATISTICS CARDS (Section 2 & 35) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Card: Today's Deliveries */}
          <div
            onClick={() => setDateFilter('today')}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              dateFilter === 'today'
                ? 'bg-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Today's Total</span>
              <Calendar className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.total_today}</div>
            <span className="text-[10px] text-slate-400 font-medium">Sunday Dispatch</span>
          </div>

          {/* Card: Ready for Delivery */}
          <div
            onClick={() => setStatusTab('READY')}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              statusTab === 'READY'
                ? 'bg-blue-50/50 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Ready to Start</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-900">{stats.ready}</div>
            <span className="text-[10px] text-blue-600 font-bold">Needs "Start Delivery"</span>
          </div>

          {/* Card: Out for Delivery */}
          <div
            onClick={() => setStatusTab('OUT_FOR_DELIVERY')}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              statusTab === 'OUT_FOR_DELIVERY'
                ? 'bg-amber-50/80 border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Out for Delivery</span>
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-900">{stats.out_for_delivery}</div>
            <span className="text-[10px] text-amber-700 font-bold">Waiting Customer OTP</span>
          </div>

          {/* Card: Delivered */}
          <div
            onClick={() => setStatusTab('DELIVERED')}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              statusTab === 'DELIVERED'
                ? 'bg-emerald-50/60 border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Delivered</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-black text-emerald-950">{stats.delivered}</div>
            <span className="text-[10px] text-emerald-700 font-bold">OTP Handover Verified</span>
          </div>

          {/* Card: Failed / Rescheduled */}
          <div
            onClick={() => setStatusTab('FAILED')}
            className={`p-4 rounded-2xl border transition cursor-pointer col-span-2 sm:col-span-1 ${
              statusTab === 'FAILED'
                ? 'bg-red-50/60 border-red-500 shadow-sm ring-2 ring-red-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Failed / Issue</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-black text-red-900">{stats.failed}</div>
            <span className="text-[10px] text-red-600 font-bold">Requires Attention</span>
          </div>
        </div>

        {/* 2. SEARCH AND FILTER BAR (Section 22 & 23) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order ID (EF1024), customer name, phone, area..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date filter dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="today">Today's Deliveries</option>
                <option value="all">All Dates / History</option>
              </select>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs font-bold scrollbar-none">
            {[
              { id: 'ALL', label: 'All Operations' },
              { id: 'READY', label: `Ready (${stats.ready})` },
              { id: 'OUT_FOR_DELIVERY', label: `Out for Delivery (${stats.out_for_delivery})` },
              { id: 'DELIVERED', label: `Delivered (${stats.delivered})` },
              { id: 'FAILED', label: `Failed / Issues (${stats.failed})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition min-h-[36px] ${
                  statusTab === tab.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. TODAY'S DELIVERIES LIST (Section 2 & 24) */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
            <EasyFarmLoader size="md" text="Loading Delivery Operations" subtitle="Synchronizing orders with Supabase" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">No deliveries match this filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no orders matching your current date, search, or status selection. Try changing filters or sync again.
            </p>
            <button
              onClick={() => {
                setStatusTab('ALL');
                setDateFilter('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* DESKTOP TABLE VIEW */}
            <div className="hidden lg:block bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Customer &amp; Phone</th>
                    <th className="py-3.5 px-4">Area &amp; Destination</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Delivery Status</th>
                    <th className="py-3.5 px-4">Delivery Person</th>
                    <th className="py-3.5 px-4 text-right">Operations Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {orders.map((o) => {
                    const isOut = o.status === 'out_for_delivery';
                    const isReady =
                      o.status === 'ready_for_delivery' || o.status === 'confirmed' || o.status === 'packed';
                    const isDelivered = o.status === 'delivered';
                    const isPhoneRevealed = revealedPhones[o.id];

                    return (
                      <tr
                        key={o.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isOut ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Order ID */}
                        <td className="py-4 px-4 font-mono font-black text-slate-900">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="hover:text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            <span>#{o.id}</span>
                          </button>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {new Date(o.delivery_date).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </td>

                        {/* Customer & Phone */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900">{o.customer_name}</div>
                          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] mt-0.5">
                            <span>{isPhoneRevealed ? o.phone : o.masked_phone}</span>
                            <button
                              onClick={() => togglePhoneReveal(o.id)}
                              title={isPhoneRevealed ? 'Mask phone' : 'Reveal phone'}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              {isPhoneRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            {o.phone && (
                              <a
                                href={`tel:${o.phone}`}
                                title="Call customer"
                                className="text-emerald-700 hover:text-emerald-900 p-0.5"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Area & Address */}
                        <td className="py-4 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 truncate">{o.area}</div>
                          <div className="text-[11px] text-slate-500 truncate" title={o.delivery_address}>
                            {o.delivery_address}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-4 font-black text-slate-900">
                          ₹{o.amount.toFixed(0)}
                        </td>

                        {/* Delivery Status */}
                        <td className="py-4 px-4">
                          {renderStatusBadge(o.status)}
                          {isOut && o.otp_expires_at && (
                            <div className="text-[10px] text-amber-800 font-semibold mt-1">
                              Expires:{' '}
                              {new Date(o.otp_expires_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                          {isDelivered && o.delivered_at && (
                            <div className="text-[10px] text-emerald-800 font-semibold mt-1">
                              Delivered:{' '}
                              {new Date(o.delivered_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                        </td>

                        {/* Delivery Person */}
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <UserCheck className="w-3 h-3 text-emerald-700" />
                            {o.delivery_person}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isOut && (
                              <button
                                onClick={() => {
                                  setVerifyModalOrder(o);
                                  setOtpInput('');
                                  setVerifyError(null);
                                  setVerifySuccess(null);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition shadow-xs flex items-center gap-1.5"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Verify OTP
                              </button>
                            )}

                            {isReady && (
                              <button
                                onClick={() => {
                                  setStartModalOrder(o);
                                  setStartError(null);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                Start Delivery
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedOrder(o)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD VIEW (Optimized for Founder on phone at customer door) */}
            <div className="lg:hidden space-y-3">
              {orders.map((o) => {
                const isOut = o.status === 'out_for_delivery';
                const isReady =
                  o.status === 'ready_for_delivery' || o.status === 'confirmed' || o.status === 'packed';
                const isDelivered = o.status === 'delivered';
                const isPhoneRevealed = revealedPhones[o.id];

                return (
                  <div
                    key={o.id}
                    className={`bg-white border rounded-2xl p-4 shadow-xs space-y-3 transition ${
                      isOut ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-400' : 'border-slate-200'
                    }`}
                  >
                    {/* Top Row: Order ID + Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-base text-slate-900">
                          #{o.id}
                        </span>
                        <span className="text-xs font-bold text-slate-500">₹{o.amount.toFixed(0)}</span>
                      </div>
                      <div>{renderStatusBadge(o.status)}</div>
                    </div>

                    {/* Customer & Address */}
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                        <span>{o.customer_name}</span>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {o.area}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600 font-mono pt-0.5">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{isPhoneRevealed ? o.phone : o.masked_phone}</span>
                        <button
                          onClick={() => togglePhoneReveal(o.id)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 ml-1"
                        >
                          {isPhoneRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        {o.phone && (
                          <a
                            href={`tel:${o.phone}`}
                            className="ml-auto px-2 py-1 bg-emerald-100 text-emerald-900 rounded font-bold text-[10px] flex items-center gap-1"
                          >
                            Call
                          </a>
                        )}
                      </div>

                      <div className="flex items-start gap-1.5 text-slate-600 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span className="leading-snug">{o.delivery_address}</span>
                      </div>
                    </div>

                    {/* Contextual Operation Timings */}
                    {isOut && o.otp_expires_at && (
                      <div className="bg-amber-100/70 border border-amber-300/80 rounded-xl p-2 text-xs text-amber-950 font-bold flex items-center justify-between">
                        <span>Secure OTP Active</span>
                        <span className="text-[11px] font-mono">
                          Expires at{' '}
                          {new Date(o.otp_expires_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}

                    {isDelivered && o.delivered_at && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-xs text-emerald-950 font-bold flex items-center justify-between">
                        <span>Handover Confirmed</span>
                        <span className="text-[11px] font-mono">
                          {new Date(o.delivered_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}

                    {/* Operational Action Buttons (Big touch targets for mobile) */}
                    <div className="pt-1 flex items-center gap-2">
                      {isOut && (
                        <button
                          onClick={() => {
                            setVerifyModalOrder(o);
                            setOtpInput('');
                            setVerifyError(null);
                            setVerifySuccess(null);
                          }}
                          className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 min-h-[44px]"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Verify Delivery OTP
                        </button>
                      )}

                      {isReady && (
                        <button
                          onClick={() => {
                            setStartModalOrder(o);
                            setStartError(null);
                          }}
                          className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 min-h-[44px]"
                        >
                          <Truck className="w-4 h-4" />
                          Start Delivery
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition min-h-[44px]"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. MODAL: DEDICATED DELIVERY CONFIRMATION (Section 9 & 29) */}
        {/* ======================================================== */}
        {verifyModalOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Delivery Confirmation</h2>
                    <p className="text-xs text-slate-500 font-mono">Order #{verifyModalOrder.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setVerifyModalOrder(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {verifySuccess ? (
                /* SUCCESS STATE (Section 9) */
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-md">
                    <Check className="w-9 h-9 stroke-[3]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      DELIVERY CONFIRMED
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-2">
                      Order #{verifyModalOrder.id}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Customer: <strong>{verifyModalOrder.customer_name}</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      Delivered at: <strong>{verifySuccess.time}</strong>
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => setVerifyModalOrder(null)}
                      className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl transition shadow-md min-h-[44px]"
                    >
                      Done / Close
                    </button>
                  </div>
                </div>
              ) : (
                /* OTP INPUT FORM (Section 9, 10, 11, 29) */
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Customer:</span>
                      <span>{verifyModalOrder.customer_name}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>Phone:</span>
                      <span>{verifyModalOrder.phone || verifyModalOrder.masked_phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Location:</span>
                      <span className="truncate max-w-[200px] text-right">{verifyModalOrder.delivery_address}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-slate-200">
                      <span>Amount Collected:</span>
                      <span>₹{verifyModalOrder.amount.toFixed(0)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-2 text-center uppercase tracking-wider">
                      Enter Customer 4-Digit Delivery OTP
                    </label>

                    {/* Numeric 4-digit input optimized for touch typing */}
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        autoFocus
                        value={otpInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setOtpInput(val);
                          setVerifyError(null);
                        }}
                        placeholder="• • • •"
                        className="w-full py-3.5 px-4 text-center font-mono font-black text-3xl tracking-[0.5em] rounded-2xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20 focus:outline-none transition"
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                      <span>Max 5 attempts allowed</span>
                      {verifyModalOrder.otp_attempts > 0 && (
                        <span className="text-amber-700 font-semibold">
                          Attempts used: {verifyModalOrder.otp_attempts}/5
                        </span>
                      )}
                    </div>
                  </div>

                  {verifyError && (
                    <div className="p-3 bg-red-100 border border-red-300 text-red-950 rounded-xl text-xs font-bold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                      <span>{verifyError}</span>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={verifying || otpInput.length !== 4}
                      className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white font-black text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 min-h-[48px]"
                    >
                      {verifying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying OTP...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>VERIFY DELIVERY</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleResendOtp(verifyModalOrder)}
                        disabled={resending || resendCooldown > 0}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 disabled:text-slate-400 p-1"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                        <span>
                          {resendCooldown > 0
                            ? `Resend OTP in ${resendCooldown}s`
                            : 'Resend OTP to Customer'}
                        </span>
                      </button>

                      <a
                        href={`tel:${verifyModalOrder.phone}`}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 p-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call Customer</span>
                      </a>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. MODAL: START DELIVERY CONFIRMATION (Section 4 & 15)  */}
        {/* ======================================================== */}
        {startModalOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-black text-slate-900">Start Order Delivery</h2>
                </div>
                <button
                  onClick={() => setStartModalOrder(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <p>
                  You are about to start delivery for <strong>Order #{startModalOrder.id}</strong>.
                </p>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Customer:</span>
                    <span>{startModalOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Dispatch Phone:</span>
                    <span>{startModalOrder.phone || startModalOrder.masked_phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Destination:</span>
                    <span className="truncate max-w-[200px] text-right">{startModalOrder.delivery_address}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Basket:</span>
                    <span className="truncate max-w-[200px] text-right">{startModalOrder.basket_summary}</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 font-medium space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Automated Actions on Start:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800">
                    <li>Generates secure 4-digit customer delivery OTP (1-hour validity)</li>
                    <li>Dispatches SMS notification to customer's registered mobile via MSG91</li>
                    <li>Marks status as <strong>OUT FOR DELIVERY</strong> in live tracker</li>
                  </ul>
                </div>
              </div>

              {startError && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-950 rounded-xl text-xs font-bold">
                  {startError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStartModalOrder(null)}
                  disabled={startingDelivery}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStartDelivery(startModalOrder)}
                  disabled={startingDelivery}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs rounded-xl transition shadow-md flex items-center gap-2 min-h-[40px]"
                >
                  {startingDelivery ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending OTP &amp; Starting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Send OTP</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. DRAWER: ORDER DELIVERY DETAILS (Section 8)            */}
        {/* ======================================================== */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
            <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Delivery Details</span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">Order #{selectedOrder.id}</h2>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
                {/* Status & Timing */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Current Status</span>
                    <div className="mt-1">{renderStatusBadge(selectedOrder.status)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Order Value</span>
                    <div className="text-base font-black text-slate-900 mt-0.5">₹{selectedOrder.amount.toFixed(0)}</div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="space-y-3">
                  <h3 className="font-black text-slate-900 uppercase tracking-wider text-xs">Customer Information</h3>
                  <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Full Name:</span>
                      <span className="font-bold text-slate-900">{selectedOrder.customer_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Phone Number:</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                        <span>{selectedOrder.phone || selectedOrder.masked_phone}</span>
                        {selectedOrder.phone && (
                          <a
                            href={`tel:${selectedOrder.phone}`}
                            className="p-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            title="Call"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Locality:</span>
                      <span className="font-bold text-slate-900">{selectedOrder.area}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-100">
                      <span className="text-slate-500 block mb-0.5">Delivery Address:</span>
                      <p className="font-medium text-slate-800 leading-relaxed">{selectedOrder.full_address}</p>
                    </div>
                  </div>
                </div>

                {/* OTP & Security Status (Section 8) */}
                <div className="space-y-3">
                  <h3 className="font-black text-slate-900 uppercase tracking-wider text-xs">
                    OTP &amp; Security Status
                  </h3>
                  <div className="p-4 rounded-2xl border border-slate-200 space-y-2 bg-slate-50/50">
                    <div className="flex justify-between">
                      <span className="text-slate-500">OTP State:</span>
                      <span className="font-bold text-slate-800">
                        {selectedOrder.otp_verified
                          ? '✓ Verified & Consumed'
                          : selectedOrder.status === 'out_for_delivery'
                          ? 'Waiting for customer verification'
                          : 'Not yet generated'}
                      </span>
                    </div>
                    {selectedOrder.otp_expires_at && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">OTP Validity:</span>
                        <span className="font-mono text-slate-700">
                          Expires {new Date(selectedOrder.otp_expires_at).toLocaleTimeString('en-IN')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Verification Attempts:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {selectedOrder.otp_attempts} / 5
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delivery Assignment (Section 17 & 18) */}
                <div className="space-y-3">
                  <h3 className="font-black text-slate-900 uppercase tracking-wider text-xs">
                    Delivery Assignment
                  </h3>
                  <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Assigned Person:</span>
                      <span className="font-bold text-emerald-950 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        {selectedOrder.delivery_person}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Delivery Model:</span>
                      <span className="font-medium text-slate-700">Founder Direct Delivery</span>
                    </div>
                  </div>
                </div>

                {/* Failure / Reschedule Details (if any) */}
                {selectedOrder.failure_reason && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-950 space-y-1">
                    <span className="font-bold block text-red-900">Delivery Failure Record:</span>
                    <p className="text-xs">{selectedOrder.failure_reason}</p>
                  </div>
                )}
                {selectedOrder.rescheduled_date && (
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 space-y-1">
                    <span className="font-bold block text-blue-900">Rescheduled Delivery Date:</span>
                    <p className="text-xs">{selectedOrder.rescheduled_date}</p>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions (Section 8) */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-2">
                {selectedOrder.status === 'out_for_delivery' && (
                  <>
                    <button
                      onClick={() => {
                        setVerifyModalOrder(selectedOrder);
                        setOtpInput('');
                        setVerifyError(null);
                        setVerifySuccess(null);
                      }}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Verify Delivery OTP
                    </button>

                    <button
                      onClick={() => handleResendOtp(selectedOrder)}
                      disabled={resending || resendCooldown > 0}
                      className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                      <span>{resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP (MSG91)'}</span>
                    </button>
                  </>
                )}

                {selectedOrder.status !== 'delivered' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setFailModalOrder(selectedOrder)}
                      className="py-2.5 px-3 bg-white border border-red-200 text-red-700 hover:bg-red-50 font-bold text-xs rounded-xl transition"
                    >
                      Mark Failed
                    </button>
                    <button
                      onClick={() => {
                        setRescheduleOrder(selectedOrder);
                        setNewRescheduleDate(selectedOrder.delivery_date);
                      }}
                      className="py-2.5 px-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl transition"
                    >
                      Reschedule
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 7. MODAL: MARK DELIVERY FAILED (Section 19)              */}
        {/* ======================================================== */}
        {failModalOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">Mark Delivery as Failed</h3>
                <button onClick={() => setFailModalOrder(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleMarkFailed} className="space-y-4 text-xs">
                <p className="text-slate-600">
                  Record reason why <strong>Order #{failModalOrder.id}</strong> could not be delivered:
                </p>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Failure Reason *</label>
                  <select
                    value={failReason}
                    onChange={(e) => setFailReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Customer unavailable">Customer unavailable at address</option>
                    <option value="Wrong address">Wrong or incomplete address</option>
                    <option value="Customer requested reschedule">Customer requested reschedule</option>
                    <option value="Unable to contact customer">Unable to contact customer (phone unreachable)</option>
                    <option value="Other">Other reason...</option>
                  </select>
                </div>

                {failReason === 'Other' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Specify Details *</label>
                    <textarea
                      required
                      rows={3}
                      value={customFailReason}
                      onChange={(e) => setCustomFailReason(e.target.value)}
                      placeholder="Enter failure explanation..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFailModalOrder(null)}
                    className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFail}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                  >
                    {submittingFail ? 'Saving...' : 'Save Failure Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 8. MODAL: RESCHEDULE DELIVERY (Section 20)               */}
        {/* ======================================================== */}
        {rescheduleOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base">Reschedule Order Delivery</h3>
                <button onClick={() => setRescheduleOrder(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleReschedule} className="space-y-4 text-xs">
                <p className="text-slate-600">
                  Update delivery date and reason for <strong>Order #{rescheduleOrder.id}</strong>:
                </p>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">New Delivery Date *</label>
                  <input
                    type="date"
                    required
                    value={newRescheduleDate}
                    onChange={(e) => setNewRescheduleDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reschedule Reason *</label>
                  <input
                    type="text"
                    required
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="e.g. Customer out of station this Sunday"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleOrder(null)}
                    className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReschedule}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold"
                  >
                    {submittingReschedule ? 'Rescheduling...' : 'Confirm Reschedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
