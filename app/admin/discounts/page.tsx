'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Percent, Plus, Trash2, Check, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DiscountRow {
  id?: string;
  name: string;
  type: 'percent' | 'fixed';
  value: number;
  applicable_type: 'all' | 'baskets';
  min_order_value: number;
  max_discount_amount?: number;
  start_date?: string;
  end_date?: string;
  usage_limit?: number;
  used_count: number;
  active: boolean;
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [dName, setDName] = useState('');
  const [dType, setDType] = useState<'percent' | 'fixed'>('percent');
  const [dValue, setDValue] = useState('');
  const [dMinOrder, setDMinOrder] = useState('0');
  const [dMaxDiscount, setDMaxDiscount] = useState('');
  const [dStartDate, setDStartDate] = useState('');
  const [dEndDate, setDEndDate] = useState('');
  const [dUsageLimit, setDUsageLimit] = useState('');

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });

      setDiscounts(
        (data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          value: Number(d.value),
          applicable_type: d.applicable_type,
          min_order_value: Number(d.min_order_value || 0),
          max_discount_amount: d.max_discount_amount ? Number(d.max_discount_amount) : undefined,
          start_date: d.start_date,
          end_date: d.end_date,
          usage_limit: d.usage_limit,
          used_count: d.used_count ?? 0,
          active: d.active,
        }))
      );
    } catch (e) {
      console.error('Error loading discounts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDiscounts(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dName || !dValue) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from('discounts').insert({
        name: dName,
        type: dType,
        value: Number(dValue),
        applicable_type: 'all',
        min_order_value: Number(dMinOrder) || 0,
        max_discount_amount: dMaxDiscount ? Number(dMaxDiscount) : null,
        start_date: dStartDate || null,
        end_date: dEndDate || null,
        usage_limit: dUsageLimit ? Number(dUsageLimit) : null,
        active: true,
      });
      setMsg(`Discount "${dName}" created successfully!`);
      setShowForm(false);
      setDName(''); setDValue(''); setDMinOrder('0'); setDMaxDiscount(''); setDStartDate(''); setDEndDate(''); setDUsageLimit('');
      fetchDiscounts();
    } catch (err: any) {
      alert('Error creating discount: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const toggleDiscount = async (d: DiscountRow) => {
    if (!d.id) return;
    const newStatus = !d.active;
    setDiscounts((prev) => prev.map((x) => (x.id === d.id ? { ...x, active: newStatus } : x)));
    try {
      const supabase = createClient();
      await supabase.from('discounts').update({ active: newStatus }).eq('id', d.id);
    } catch (e) { console.error(e); }
  };

  const deleteDiscount = async (d: DiscountRow) => {
    if (!d.id || !confirm(`Delete "${d.name}"?`)) return;
    setDiscounts((prev) => prev.filter((x) => x.id !== d.id));
    try {
      const supabase = createClient();
      await supabase.from('discounts').delete().eq('id', d.id);
    } catch (e) { console.error(e); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Percent className="w-6 h-6 text-emerald-800" />
              <h1 className="text-2xl font-black text-slate-900">Discounts Engine</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Create percentage or fixed discounts applicable to all baskets or specific products.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-2xl transition shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Discount Rule
          </button>
        </div>

        {msg && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700" /> {msg}
          </div>
        )}

        {/* CREATE FORM */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-base font-black text-slate-900 mb-5">New Discount Rule</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">Discount Name *</label>
                <input type="text" required placeholder="e.g. Monsoon Season Sale" value={dName} onChange={(e) => setDName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type *</label>
                <select value={dType} onChange={(e) => setDType(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Discount Value *</label>
                <input type="number" required placeholder={dType === 'percent' ? '15 (%)' : '50 (₹)'} value={dValue} onChange={(e) => setDValue(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Min Order Value (₹)</label>
                <input type="number" value={dMinOrder} onChange={(e) => setDMinOrder(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Discount Cap (₹)</label>
                <input type="number" placeholder="Optional" value={dMaxDiscount} onChange={(e) => setDMaxDiscount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Usage Limit</label>
                <input type="number" placeholder="Unlimited" value={dUsageLimit} onChange={(e) => setDUsageLimit(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                <input type="date" value={dStartDate} onChange={(e) => setDStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                <input type="date" value={dEndDate} onChange={(e) => setDEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-md">
                  {saving ? 'Creating...' : 'Create & Activate Discount'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* DISCOUNTS LIST */}
        {loading ? (
          <div className="py-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading discounts...</p>
          </div>
        ) : discounts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
            <Percent className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-semibold">No discounts configured yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Create a discount rule to automatically apply savings to qualifying orders.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discounts.map((d) => (
              <div key={d.id} className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${d.active ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{d.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {d.type === 'percent' ? `${d.value}% off` : `₹${d.value} flat off`}
                      {d.max_discount_amount ? ` (max ₹${d.max_discount_amount})` : ''}
                      {d.min_order_value > 0 ? ` • Min order ₹${d.min_order_value}` : ''}
                    </p>
                    {(d.start_date || d.end_date) && (
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">
                        {d.start_date ? new Date(d.start_date).toLocaleDateString('en-IN') : '—'} →{' '}
                        {d.end_date ? new Date(d.end_date).toLocaleDateString('en-IN') : '∞'}
                      </p>
                    )}
                    {d.usage_limit && (
                      <p className="text-[10px] text-slate-400">Used: {d.used_count} / {d.usage_limit}</p>
                    )}
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${d.active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-600'}`}>
                    {d.active ? 'Active' : 'Off'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4 text-xs">
                  <button onClick={() => toggleDiscount(d)} className="text-emerald-800 font-bold hover:underline flex items-center gap-1">
                    {d.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {d.active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => deleteDiscount(d)} className="text-red-600 font-bold hover:underline flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
