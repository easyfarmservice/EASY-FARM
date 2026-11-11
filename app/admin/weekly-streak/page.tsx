'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Flame,
  Award,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Users,
  ShieldCheck,
  RefreshCw,
  Save,
  Filter,
  DollarSign,
  X,
  History,
  Calendar,
  Lock,
  Gift,
  HelpCircle,
} from 'lucide-react';
import {
  WeeklyStreakSettings,
  WeeklyStreakMilestone,
  CustomerWeeklyStreak,
  WeeklyStreakAuditLog,
} from '@/types/weekly-streak';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

export default function AdminWeeklyStreakPage() {
  const [activeTab, setActiveTab] = useState<'milestones' | 'customers' | 'settings' | 'reports' | 'audit'>('milestones');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Settings State
  const [settings, setSettings] = useState<WeeklyStreakSettings>({
    id: 'default-streak-settings',
    is_enabled: true,
    cycle_start_day: 'Monday',
    cycle_end_day: 'Sunday',
    order_cutoff_day: 'Saturday',
    order_cutoff_time: '23:00',
    timezone: 'Asia/Kolkata',
    min_order_value: 0,
    qualifying_statuses: ['delivered'],
    auto_reset_missed: true,
    allow_coupon_stacking: false,
    notifications_enabled: true,
  });

  // Milestones State
  const [milestones, setMilestones] = useState<WeeklyStreakMilestone[]>([]);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Partial<WeeklyStreakMilestone> | null>(null);

  // Customers State
  const [customers, setCustomers] = useState<CustomerWeeklyStreak[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [inspectCustomer, setInspectCustomer] = useState<any | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<CustomerWeeklyStreak | null>(null);
  const [newStreakVal, setNewStreakVal] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Analytics & Audit
  const [analytics, setAnalytics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<WeeklyStreakAuditLog[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Settings
      const setRes = await fetch('/api/admin/weekly-streak/settings');
      const setData = await setRes.json();
      if (setData.success && setData.settings) setSettings(setData.settings);

      // 2. Milestones
      const mRes = await fetch('/api/admin/weekly-streak/milestones');
      const mData = await mRes.json();
      if (mData.success && mData.milestones) setMilestones(mData.milestones);

      // 3. Customers
      const cRes = await fetch('/api/admin/weekly-streak/customers');
      const cData = await cRes.json();
      if (cData.success && cData.customers) setCustomers(cData.customers);

      // 4. Analytics & Audit
      const aRes = await fetch('/api/admin/weekly-streak/analytics');
      const aData = await aRes.json();
      if (aData.success) {
        setAnalytics(aData.analytics);
        setAuditLogs(aData.auditLogs || []);
      }
    } catch (err) {
      console.error('Error loading weekly streak admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/weekly-streak/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setFeedback({ type: 'success', message: 'Weekly Streak settings saved successfully.' });
        setTimeout(() => setFeedback(null), 3500);
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone) return;
    setSaving(true);
    try {
      const isEdit = !!editingMilestone.id;
      const url = '/api/admin/weekly-streak/milestones';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMilestone),
      });
      const data = await res.json();
      if (data.success) {
        setShowMilestoneModal(false);
        setEditingMilestone(null);
        fetchData();
      } else {
        alert(data.error || 'Failed to save milestone');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate or remove this milestone?')) return;
    try {
      const res = await fetch(`/api/admin/weekly-streak/milestones?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Failed to delete milestone');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleInspectCustomer = async (customerId: string) => {
    try {
      const res = await fetch(`/api/admin/weekly-streak/customers?customerId=${customerId}`);
      const data = await res.json();
      if (data.success) {
        setInspectCustomer(data);
      }
    } catch (err) {
      alert('Could not inspect customer details');
    }
  };

  const handleAdjustStreak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget || !adjustReason) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/weekly-streak/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: adjustTarget.customer_id,
          newStreak: newStreakVal,
          reason: adjustReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAdjustModal(false);
        setAdjustTarget(null);
        setAdjustReason('');
        fetchData();
        if (inspectCustomer && inspectCustomer.streak.customer_id === adjustTarget.customer_id) {
          handleInspectCustomer(adjustTarget.customer_id);
        }
      } else {
        alert(data.error || 'Adjustment failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const s = customerSearch.toLowerCase();
    const matchSearch =
      !s ||
      c.customer_name?.toLowerCase().includes(s) ||
      c.customer_email?.toLowerCase().includes(s) ||
      c.customer_phone?.includes(s);

    const matchFilter =
      customerFilter === 'all' ||
      (customerFilter === 'active' && c.current_streak > 0) ||
      (customerFilter === 'inactive' && c.current_streak === 0);

    return matchSearch && matchFilter;
  });

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Flame className="w-5 h-5 fill-emerald-600 text-emerald-700" />
              </span>
              <h1 className="text-2xl font-black text-slate-900">
                Weekly Streak Loyalty Management
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure consecutive weekly order milestones, customer stamps, automatic discount vouchers, and audit trails.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 ${
                settings.is_enabled
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-red-100 text-red-900 border border-red-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${settings.is_enabled ? 'bg-emerald-600' : 'bg-red-600'}`} />
              {settings.is_enabled ? 'Streak Active' : 'Streak Disabled'}
            </span>
          </div>
        </div>

        {/* FEEDBACK ALERT */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* TABS */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('milestones')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'milestones'
                ? 'bg-emerald-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4" />
            Milestones ({milestones.length})
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-emerald-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Customer Streaks ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-emerald-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Reports &amp; Metrics
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-emerald-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            General Settings
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-emerald-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Logs ({auditLogs.length})
          </button>
        </div>

        {/* TAB 1: MILESTONES CRUD */}
        {activeTab === 'milestones' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Configured Streak Milestones
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set the consecutive weekly orders required and corresponding discount rewards.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingMilestone({
                    title: '',
                    required_weeks: 2,
                    discount_type: 'percentage',
                    discount_value: 5,
                    min_order_amount: 299,
                    max_discount_cap: 100,
                    applicable_baskets: ['all'],
                    reward_expiry_days: 30,
                    is_active: true,
                    description: '',
                    badge_icon: 'flame',
                    sort_order: milestones.length + 1,
                  });
                  setShowMilestoneModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition shadow"
              >
                <Plus className="w-4 h-4" />
                Add Milestone
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Milestone</th>
                    <th className="py-3.5 px-4">Weeks Req</th>
                    <th className="py-3.5 px-4">Discount</th>
                    <th className="py-3.5 px-4">Min Order</th>
                    <th className="py-3.5 px-4">Max Cap</th>
                    <th className="py-3.5 px-4">Expiry</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {milestones.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="p-1 bg-emerald-100 text-emerald-800 rounded-lg">
                            <Flame className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <p>{m.title}</p>
                            <p className="text-[10px] text-slate-400 font-normal">{m.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-800">
                        {m.required_weeks} Weeks
                      </td>
                      <td className="py-3.5 px-4 font-black">
                        {m.discount_type === 'percentage' ? `${m.discount_value}%` : `₹${m.discount_value}`}
                      </td>
                      <td className="py-3.5 px-4">₹{m.min_order_amount}</td>
                      <td className="py-3.5 px-4">{m.max_discount_cap ? `₹${m.max_discount_cap}` : 'None'}</td>
                      <td className="py-3.5 px-4">{m.reward_expiry_days ? `${m.reward_expiry_days} Days` : 'No Expiry'}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            m.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {m.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMilestone(m);
                            setShowMilestoneModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMilestone(m.id)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 text-red-600 transition"
                          title="Deactivate / Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMER STREAK MANAGEMENT */}
        {activeTab === 'customers' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Customer Streak Directory
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect customer consecutive weeks, audit stamps, and execute authorized corrections with reason logging.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, phone, email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={customerFilter}
                  onChange={(e: any) => setCustomerFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="all">All Streaks</option>
                  <option value="active">Active Streaks (&gt;0)</option>
                  <option value="inactive">Inactive / Reset (0)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Current Streak</th>
                    <th className="py-3.5 px-4">Best Streak</th>
                    <th className="py-3.5 px-4">Total Stamps</th>
                    <th className="py-3.5 px-4">Last Cycle</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>
                            <p>{c.customer_name}</p>
                            <p className="text-[10px] text-slate-400 font-normal">
                              {c.customer_phone || c.customer_email || c.customer_id.slice(0, 8)}
                            </p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-black text-emerald-800">
                          {c.current_streak > 0 ? `🔥 ${c.current_streak} Weeks` : '0 Weeks'}
                        </td>
                        <td className="py-3.5 px-4 font-bold">{c.best_streak} Weeks</td>
                        <td className="py-3.5 px-4 font-bold">{c.total_stamps}</td>
                        <td className="py-3.5 px-4">{c.last_qualifying_cycle || 'None'}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              c.current_streak > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {c.current_streak > 0 ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleInspectCustomer(c.customer_id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[11px] transition"
                          >
                            Inspect History
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustTarget(c);
                              setNewStreakVal(c.current_streak);
                              setAdjustReason('');
                              setShowAdjustModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] transition"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No customer streak records match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: REPORTS & METRICS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Streak Customers</p>
                <p className="text-3xl font-black text-emerald-900">
                  {analytics?.totalActiveStreakCustomers ?? 0}
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold">Customers with &gt;0 active weeks</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Longest Active Streak</p>
                <p className="text-3xl font-black text-emerald-900">
                  {analytics?.longestActiveStreak ?? 0} <span className="text-base font-bold text-slate-500">Weeks</span>
                </p>
                <p className="text-[11px] text-slate-500">Consecutive weekly deliveries</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Milestone Rewards Claimed</p>
                <p className="text-3xl font-black text-emerald-900">
                  {analytics?.totalRewardsRedeemed ?? 0} / {analytics?.totalRewardsIssued ?? 0}
                </p>
                <p className="text-[11px] text-slate-500">Redeemed vs Total Issued</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Discounts Granted</p>
                <p className="text-3xl font-black text-emerald-900">
                  ₹{Number(analytics?.totalDiscountGrantedInr ?? 0).toFixed(2)}
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold">Saved by customers at checkout</p>
              </div>
            </div>

            {/* MILESTONE DISTRIBUTION CARD */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-700" />
                Customer Distribution Across Milestones
              </h2>
              <p className="text-xs text-slate-500">
                Number of unique milestone achievements earned by customers:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                {milestones.map((m) => {
                  const count = analytics?.milestoneReachingCounts?.[m.title] || 0;
                  return (
                    <div key={m.id} className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-1">
                      <p className="text-xs font-bold text-slate-900">{m.title}</p>
                      <p className="text-2xl font-black text-emerald-900">{count}</p>
                      <p className="text-[10px] text-slate-500">{m.discount_value}% Discount ({m.required_weeks} Wks)</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GENERAL SETTINGS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Weekly Streak Program Rules
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure weekly cycle cutoff, reset rules, and qualifying order requirements.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition shadow"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Program Enabled */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-extrabold text-slate-900">Enable Weekly Streak Loyalty</span>
                  <input
                    type="checkbox"
                    checked={settings.is_enabled}
                    onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
                <p className="text-slate-500 leading-relaxed">
                  When active, customers earn stamps on every delivered weekly basket and can unlock discount vouchers.
                </p>
              </div>

              {/* Auto Reset Missed Weeks */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-extrabold text-slate-900">Auto-Reset on Missed Weekly Cycle</span>
                  <input
                    type="checkbox"
                    checked={settings.auto_reset_missed}
                    onChange={(e) => setSettings({ ...settings, auto_reset_missed: e.target.checked })}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
                <p className="text-slate-500 leading-relaxed">
                  If customer does not place an order in a cycle, streak resets to 0 while preserving previous vouchers and stamps.
                </p>
              </div>

              {/* Cycle Start Day & Cutoff */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800">Weekly Cycle Start &amp; End Days</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={settings.cycle_start_day}
                    onChange={(e) => setSettings({ ...settings, cycle_start_day: e.target.value })}
                    placeholder="Monday"
                    className="p-3 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={settings.cycle_end_day}
                    onChange={(e) => setSettings({ ...settings, cycle_end_day: e.target.value })}
                    placeholder="Sunday"
                    className="p-3 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Order Cutoff Time */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800">Order Cutoff Day &amp; Time</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={settings.order_cutoff_day}
                    onChange={(e) => setSettings({ ...settings, order_cutoff_day: e.target.value })}
                    placeholder="Saturday"
                    className="p-3 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={settings.order_cutoff_time}
                    onChange={(e) => setSettings({ ...settings, order_cutoff_time: e.target.value })}
                    placeholder="23:00"
                    className="p-3 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Timezone */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800">Operating Timezone</label>
                <input
                  type="text"
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Min Order Value */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800">Min Qualifying Order Value (₹)</label>
                <input
                  type="number"
                  value={settings.min_order_value}
                  onChange={(e) => setSettings({ ...settings, min_order_value: Number(e.target.value) })}
                  className="w-full p-3 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Coupon Stacking */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 md:col-span-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-extrabold text-slate-900">Allow Stacking with Coupons</span>
                  <input
                    type="checkbox"
                    checked={settings.allow_coupon_stacking}
                    onChange={(e) => setSettings({ ...settings, allow_coupon_stacking: e.target.checked })}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
                <p className="text-slate-500 leading-relaxed">
                  When disabled (recommended), customers can apply either a promo coupon code OR a streak milestone discount at checkout, avoiding discount stacking.
                </p>
              </div>
            </div>
          </form>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Immutable System Audit Logs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chronological log of all stamp issuances, streak resets, milestone unlocks, redemptions, and manual corrections.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Admin / Operator</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {new Date(log.created_at).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] uppercase font-black">
                            {log.action_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">{log.admin_email || 'System automated'}</td>
                        <td className="py-3 px-4 text-slate-600">{log.reason || JSON.stringify(log.details)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No audit records logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT MILESTONE */}
        {showMilestoneModal && editingMilestone && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-700" />
                  {editingMilestone.id ? 'Edit Milestone' : 'Create New Milestone'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveMilestone} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Milestone Title</label>
                  <input
                    type="text"
                    required
                    value={editingMilestone.title || ''}
                    onChange={(e) => setEditingMilestone({ ...editingMilestone, title: e.target.value })}
                    placeholder="e.g. 4-Week Harvest Habit"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Required Consecutive Weeks</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={editingMilestone.required_weeks || 1}
                      onChange={(e) => setEditingMilestone({ ...editingMilestone, required_weeks: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Discount Type</label>
                    <select
                      value={editingMilestone.discount_type || 'percentage'}
                      onChange={(e: any) => setEditingMilestone({ ...editingMilestone, discount_type: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-bold"
                    >
                      <option value="percentage">Percentage Discount (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Discount Value</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingMilestone.discount_value || ''}
                      onChange={(e) => setEditingMilestone({ ...editingMilestone, discount_value: Number(e.target.value) })}
                      placeholder="e.g. 5 for 5%"
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Max Discount Cap (₹)</label>
                    <input
                      type="number"
                      value={editingMilestone.max_discount_cap ?? ''}
                      onChange={(e) => setEditingMilestone({ ...editingMilestone, max_discount_cap: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 100"
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Min Order Amount (₹)</label>
                    <input
                      type="number"
                      value={editingMilestone.min_order_amount || 0}
                      onChange={(e) => setEditingMilestone({ ...editingMilestone, min_order_amount: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Voucher Expiry (Days)</label>
                    <input
                      type="number"
                      value={editingMilestone.reward_expiry_days ?? ''}
                      onChange={(e) => setEditingMilestone({ ...editingMilestone, reward_expiry_days: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 30"
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Customer Description</label>
                  <textarea
                    rows={2}
                    value={editingMilestone.description || ''}
                    onChange={(e) => setEditingMilestone({ ...editingMilestone, description: e.target.value })}
                    placeholder="Short description displayed on customer streak page..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowMilestoneModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
                  >
                    {saving ? 'Saving...' : 'Save Milestone'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: INSPECT CUSTOMER STREAK */}
        {inspectCustomer && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-emerald-700" />
                    Customer Streak Profile: {inspectCustomer.streak.customer_name || 'Customer'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ID: {inspectCustomer.streak.customer_id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectCustomer(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* QUICK STATS */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <p className="text-[10px] text-emerald-800 uppercase font-bold">Current Streak</p>
                  <p className="text-2xl font-black text-emerald-950 mt-1">
                    {inspectCustomer.streak.current_streak} Wks
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Best Streak</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {inspectCustomer.streak.best_streak} Wks
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Total Stamps</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {inspectCustomer.streak.total_stamps}
                  </p>
                </div>
              </div>

              {/* STAMPS HISTORY */}
              <div className="space-y-2 text-xs">
                <h4 className="font-extrabold text-slate-900">Stamp History ({inspectCustomer.recentStamps.length})</h4>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                  {inspectCustomer.recentStamps.length > 0 ? (
                    inspectCustomer.recentStamps.map((s: any) => (
                      <div key={s.id} className="p-3 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900">{s.cycle_id}</span>
                          <span className="text-slate-400 text-[10px] ml-2">
                            Order {s.order_id.slice(0, 8)} • Delivery: {s.order_delivery_date}
                          </span>
                        </div>
                        <span className="font-bold text-emerald-800">
                          Streak after: {s.streak_count_after}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400">No stamp records found.</div>
                  )}
                </div>
              </div>

              {/* REWARDS HISTORY */}
              <div className="space-y-2 text-xs">
                <h4 className="font-extrabold text-slate-900">Milestone Rewards ({inspectCustomer.allRewards.length})</h4>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                  {inspectCustomer.allRewards.length > 0 ? (
                    inspectCustomer.allRewards.map((r: any) => (
                      <div key={r.id} className="p-3 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900">{r.milestone_title}</span>
                          <span className="text-emerald-800 text-[11px] font-bold ml-2">
                            {r.discount_type === 'percentage' ? `${r.discount_value}% OFF` : `₹${r.discount_value} OFF`}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            r.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'redeemed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400">No rewards unlocked yet.</div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: MANUAL STREAK ADJUSTMENT */}
        {showAdjustModal && adjustTarget && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  Manual Streak Correction
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdjustStreak} className="space-y-4 text-xs">
                <p className="text-slate-600">
                  Target Customer: <strong>{adjustTarget.customer_name}</strong> ({adjustTarget.customer_email || adjustTarget.customer_phone})
                </p>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">New Consecutive Streak (Weeks)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newStreakVal}
                    onChange={(e) => setNewStreakVal(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">
                    Mandatory Audit Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    minLength={5}
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Provide official operational reason for manual adjustment..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    This reason is permanently logged in the system audit trail with your admin credentials.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !adjustReason || adjustReason.trim().length < 5}
                    className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Apply Correction'}
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

