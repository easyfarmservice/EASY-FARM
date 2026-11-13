'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ShoppingBag, Users, MapPin, RefreshCw, Database, Mail, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  confirmedRevenue: number;
  confirmedOrdersCount: number;
  notConfirmedRevenue: number;
  notConfirmedOrdersCount: number;
  activeCustomers: number;
  waitlistCount: number;
  recentOrders: Array<{
    id: string;
    customer: string;
    location: string;
    status: string;
    isConfirmed: boolean;
    total: number;
    date: string;
  }>;
  lowStockItems: Array<{
    name: string;
    qty: number;
  }>;
  activeZoneName: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resend status
  const [resendStatus, setResendStatus] = useState<{ active: boolean; keyMasked: string; status: string } | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    confirmedRevenue: 0,
    confirmedOrdersCount: 0,
    notConfirmedRevenue: 0,
    notConfirmedOrdersCount: 0,
    activeCustomers: 0,
    waitlistCount: 0,
    recentOrders: [],
    lowStockItems: [],
    activeZoneName: 'Ghatkesar & Pocharam, Hyderabad (Active)',
  });

  const checkResendStatus = async () => {
    setVerifyingEmail(true);
    try {
      const res = await fetch('/api/email/verify');
      const data = await res.json();
      setResendStatus(data);
    } catch (e) {
      console.error('Error verifying Resend API:', e);
    } finally {
      setVerifyingEmail(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch from server-side API route (uses service role key, bypasses RLS)
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) {
        throw new Error(`Dashboard API error: ${res.status}`);
      }
      const data = await res.json();
      setStats({
        totalOrders: data.totalOrders || 0,
        totalRevenue: data.totalRevenue || 0,
        confirmedRevenue: data.confirmedRevenue || 0,
        confirmedOrdersCount: data.confirmedOrdersCount || 0,
        notConfirmedRevenue: data.notConfirmedRevenue || 0,
        notConfirmedOrdersCount: data.notConfirmedOrdersCount || 0,
        activeCustomers: data.activeCustomers || 0,
        waitlistCount: data.waitlistCount || 0,
        recentOrders: data.recentOrders || [],
        lowStockItems: data.lowStockItems || [],
        activeZoneName: data.activeZoneName || 'Ghatkesar & Pocharam, Hyderabad (Active)',
      });
    } catch (err: any) {
      console.error('Error fetching admin dashboard data:', err);
      setError('Could not fetch operations metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    checkResendStatus();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-700" />
              <h1 className="text-2xl font-black text-slate-900">{stats.activeZoneName} Operations Dashboard</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live order volume, subscriber metrics, and weekly harvest fulfillment overview.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/studio"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-xs hover:bg-emerald-100 transition shadow-xs"
            >
              Sanity Studio
            </Link>
            <button
              onClick={() => {
                fetchDashboardData();
                checkResendStatus();
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-emerald-900 transition shadow-sm min-h-[38px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh Operations Data'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-900">
            {error}
          </div>
        )}

        {/* OPERATIONS STATUS & CMS SHORTCUT BANNER */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${resendStatus?.active ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">Customer Notifications &amp; Dispatch</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  resendStatus?.active ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {resendStatus?.active ? <CheckCircle2 className="w-3 h-3 text-emerald-700" /> : <XCircle className="w-3 h-3 text-amber-700" />}
                  {resendStatus?.active ? 'SYSTEM ACTIVE' : 'CONFIGURATION PENDING'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated Sunday delivery notifications, order receipts, and OTP verification are operational.
              </p>
            </div>
          </div>
          <Link
            href="/studio"
            className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shrink-0"
          >
            Manage Content in Sanity Studio →
          </Link>
        </div>

        {/* KPI CARDS: CONFIRMED VS NOT CONFIRMED REVENUE + METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. CONFIRMED AMOUNT (PROMINENT EMERALD) */}
          <div className="bg-white border-2 border-emerald-500/70 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
                Confirmed Amount
              </span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-950">
              {loading ? '...' : `₹${stats.confirmedRevenue.toLocaleString('en-IN')}`}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block shrink-0" />
              <span>{stats.confirmedOrdersCount} confirmed &amp; paid orders</span>
            </div>
          </div>

          {/* 2. NOT CONFIRMED AMOUNT (PROMINENT AMBER) */}
          <div className="bg-white border-2 border-amber-400/80 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider">
                Not Confirmed Amount
              </span>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
                <Clock className="w-4 h-4 text-amber-700" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-950">
              {loading ? '...' : `₹${stats.notConfirmedRevenue.toLocaleString('en-IN')}`}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0" />
              <span>{stats.notConfirmedOrdersCount} pending / awaiting payment</span>
            </div>
          </div>

          {/* 3. TOTAL ORDERS & TOTAL VALUE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Total Orders</span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{loading ? '...' : stats.totalOrders}</div>
            <p className="text-[11px] font-medium text-slate-500">
              Gross: ₹{stats.totalRevenue.toLocaleString('en-IN')}
            </p>
          </div>

          {/* 4. REGISTERED CUSTOMERS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Customers</span>
              <div className="p-2 rounded-xl bg-blue-100 text-blue-800 border border-blue-200">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{loading ? '...' : stats.activeCustomers}</div>
            <p className="text-[11px] font-medium text-slate-500">Active household accounts</p>
          </div>

          {/* 5. WAITLIST DEMAND */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Waitlist Demand</span>
              <div className="p-2 rounded-xl bg-purple-100 text-purple-800 border border-purple-200">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{loading ? '...' : stats.waitlistCount}</div>
            <p className="text-[11px] font-medium text-slate-500">Expansion area requests</p>
          </div>
        </div>

        {/* INVENTORY ALERTS & ORDERS TABLE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* RECENT ORDERS TABLE */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Recent Customer Orders</h2>
                <p className="text-[11px] text-slate-500">Overview of confirmed and pending customer orders</p>
              </div>
              <Link href="/admin/orders" className="text-xs font-bold text-emerald-800 hover:underline">
                View All Orders →
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                Loading recent orders...
              </div>
            ) : stats.recentOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
                <p className="font-bold text-slate-700">0 orders placed yet</p>
                <p className="text-[11px] text-slate-400">Customer basket orders scheduled for upcoming Sunday harvest delivery will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="pb-3">Order Ref</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Location</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Confirmation</th>
                      <th className="pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {stats.recentOrders.map((o) => (
                      <tr
                        key={o.id}
                        onClick={() => {
                          router.push(`/admin/orders?orderId=${encodeURIComponent(o.id)}`);
                        }}
                        className="hover:bg-emerald-50/70 transition cursor-pointer"
                        title="Click to view full order details in Order Management"
                      >
                        <td className="py-3 font-bold text-emerald-900 underline decoration-emerald-300 underline-offset-2">
                          {o.id}
                        </td>
                        <td className="py-3 font-medium">{o.customer}</td>
                        <td className="py-3 text-slate-500">{o.location}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            o.isConfirmed
                              ? 'bg-emerald-100 text-emerald-950 border border-emerald-200'
                              : 'bg-amber-100 text-amber-950 border border-amber-200'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3">
                          {o.isConfirmed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              Not Confirmed
                            </span>
                          )}
                        </td>
                        <td className="py-3 font-bold text-right text-slate-900">₹{o.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT SIDE GEOFENCE STATUS */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-emerald-950 text-white rounded-2xl p-5 space-y-3 shadow-sm">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Geofence Control</span>
              <h3 className="font-bold text-base">{stats.activeZoneName} Active Coverage</h3>
              <p className="text-xs text-emerald-200/80">
                Authoritative boundary perimeter encompassing Singapore Township, Sanskruti Township, and surrounding Ghatkesar &amp; Pocharam communities.
              </p>
              <Link
                href="/admin/delivery-zones"
                className="block text-center w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition"
              >
                Manage Delivery Zone Boundary Map
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
