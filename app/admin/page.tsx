'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ShoppingBag, Users, MapPin, AlertTriangle, DollarSign, RefreshCw, Database, Mail, CheckCircle2, XCircle } from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  activeCustomers: number;
  waitlistCount: number;
  recentOrders: Array<{
    id: string;
    customer: string;
    location: string;
    status: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resend status
  const [resendStatus, setResendStatus] = useState<{ active: boolean; keyMasked: string; status: string } | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    activeCustomers: 0,
    waitlistCount: 0,
    recentOrders: [],
    lowStockItems: [],
    activeZoneName: 'Ghatkesar',
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
      // This is independent of customer session state
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) {
        throw new Error(`Dashboard API error: ${res.status}`);
      }
      const data = await res.json();
      setStats({
        totalOrders: data.totalOrders || 0,
        totalRevenue: data.totalRevenue || 0,
        activeCustomers: data.activeCustomers || 0,
        waitlistCount: data.waitlistCount || 0,
        recentOrders: data.recentOrders || [],
        lowStockItems: data.lowStockItems || [],
        activeZoneName: data.activeZoneName || 'Ghatkesar & Pocharam',
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

  const kpis = [
    { label: "Total Orders", value: `${stats.totalOrders}`, change: 'Confirmed customer orders', icon: ShoppingBag, color: 'text-emerald-700 bg-emerald-100' },
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, change: 'Gross harvest revenue', icon: DollarSign, color: 'text-emerald-800 bg-emerald-100' },
    { label: 'Registered Customers', value: `${stats.activeCustomers}`, change: 'Active household accounts', icon: Users, color: 'text-blue-700 bg-blue-100' },
    { label: 'Waitlist Demand', value: `${stats.waitlistCount}`, change: 'Expansion area requests', icon: MapPin, color: 'text-amber-700 bg-amber-100' },
  ];

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

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">{kpi.label}</span>
                  <div className={`p-2 rounded-xl ${kpi.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">{loading ? '...' : kpi.value}</div>
                <p className="text-[11px] font-medium text-slate-400">{kpi.change}</p>
              </div>
            );
          })}
        </div>

        {/* INVENTORY ALERTS & ORDERS TABLE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* RECENT ORDERS TABLE */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900 text-base">Recent Customer Orders</h2>
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
                      <th className="pb-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {stats.recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="py-3 font-bold text-slate-900">{o.id}</td>
                        <td className="py-3 font-medium">{o.customer}</td>
                        <td className="py-3 text-slate-500">{o.location}</td>
                        <td className="py-3">
                          <span className="bg-emerald-100 text-emerald-950 font-bold px-2 py-0.5 rounded-full text-[10px] capitalize">
                            {o.status}
                          </span>
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
                Authoritative boundary perimeter encompassing Singapore Township, Sanskruti Township, and surrounding Ghatkesar communities.
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
