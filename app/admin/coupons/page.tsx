'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tag, Plus, Check, ShieldCheck, Trash2, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CouponItem {
  id?: string;
  code: string;
  type: 'flat' | 'percent';
  value: number;
  minOrder: number;
  description: string;
  active: boolean;
}

const INITIAL_COUPONS: CouponItem[] = [
  {
    code: 'EASY50',
    type: 'flat',
    value: 50,
    minOrder: 250,
    description: 'Flat ₹50 off on orders above ₹250',
    active: true,
  },
  {
    code: 'FIRSTFARM',
    type: 'percent',
    value: 10,
    minOrder: 250,
    description: '10% off on your first Easy Farm weekly basket',
    active: true,
  },
  {
    code: 'GHATKESAR100',
    type: 'flat',
    value: 100,
    minOrder: 500,
    description: 'Flat ₹100 off on Premium Box or orders above ₹500',
    active: true,
  },
  {
    code: 'WELCOME20',
    type: 'percent',
    value: 20,
    minOrder: 350,
    description: '20% welcome discount for Ghatkesar & Pocharam residents',
    active: true,
  },
];

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>(INITIAL_COUPONS);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'flat' | 'percent'>('flat');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [description, setDescription] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setCoupons(
          data.map((c: any) => ({
            id: c.id,
            code: c.code,
            type: c.type || 'flat',
            value: Number(c.value),
            minOrder: Number(c.min_order_value || 0),
            description: `${c.type === 'flat' ? `₹${c.value}` : `${c.value}%`} Promo Discount`,
            active: c.active ?? true,
          }))
        );
      }
    } catch (e) {
      console.error('Failed to load coupons from DB:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !value) return;

    const cleanCode = code.trim().toUpperCase();
    const numVal = Number(value);
    const numMin = Number(minOrder) || 0;
    const desc = description || `${type === 'flat' ? `₹${value}` : `${value}%`} Discount`;

    try {
      const supabase = createClient();
      const { data: inserted } = await supabase
        .from('coupons')
        .insert({
          code: cleanCode,
          type,
          value: numVal,
          min_order_value: numMin,
          active: true,
        })
        .select()
        .maybeSingle();

      const newCoupon: CouponItem = {
        id: inserted?.id,
        code: cleanCode,
        type,
        value: numVal,
        minOrder: numMin,
        description: desc,
        active: true,
      };

      setCoupons([newCoupon, ...coupons]);
      setCode('');
      setValue('');
      setMinOrder('');
      setDescription('');
      setSuccessMsg(`Coupon '${cleanCode}' created successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert('Error creating coupon: ' + (err.message || err));
    }
  };

  const toggleCoupon = async (codeToToggle: string) => {
    const target = coupons.find((c) => c.code === codeToToggle);
    if (!target) return;

    const newStatus = !target.active;
    setCoupons(coupons.map((c) => (c.code === codeToToggle ? { ...c, active: newStatus } : c)));

    try {
      const supabase = createClient();
      if (target.id) {
        await supabase.from('coupons').update({ active: newStatus }).eq('id', target.id);
      } else {
        await supabase.from('coupons').update({ active: newStatus }).eq('code', codeToToggle);
      }
    } catch (e) {
      console.error('Failed to toggle coupon:', e);
    }
  };

  const deleteCoupon = async (codeToDelete: string) => {
    const target = coupons.find((c) => c.code === codeToDelete);
    setCoupons(coupons.filter((c) => c.code !== codeToDelete));

    try {
      const supabase = createClient();
      if (target?.id) {
        await supabase.from('coupons').delete().eq('id', target.id);
      } else {
        await supabase.from('coupons').delete().eq('code', codeToDelete);
      }
    } catch (e) {
      console.error('Delete coupon error:', e);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="w-6 h-6 text-amber-500" />
              <h1 className="text-2xl font-black text-slate-900">Promotional Coupon Management</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Create and manage promo codes. Applied real-time during checkout with backend security verification.
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <Check className="w-4 h-4 text-emerald-700" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* CREATE COUPON FORM */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-800" />
            Create New Promotional Coupon
          </h2>

          <form onSubmit={handleAddCoupon} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. MONSOON30"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono uppercase text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'flat' | 'percent')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="flat">Flat Amount (₹)</option>
                <option value="percent">Percentage (%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Discount Value *</label>
              <input
                type="number"
                required
                placeholder={type === 'flat' ? '50 (in Rupees)' : '15 (in %)'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Order Amount (₹)</label>
              <input
                type="number"
                placeholder="250"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Description / Customer Note</label>
              <input
                type="text"
                placeholder="e.g. ₹50 off on orders above ₹250"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3 pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Save & Activate Coupon
              </button>
            </div>
          </form>
        </div>

        {/* ACTIVE COUPONS LIST */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            Active Promotional Coupons ({coupons.length})
          </h2>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500 font-semibold space-y-2">
              <RefreshCw className="w-5 h-5 text-emerald-700 animate-spin mx-auto" />
              <p>Fetching coupons from Supabase database...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coupons.map((c) => (
                <div
                  key={c.code}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    c.active
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono font-black text-lg text-emerald-900 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300 inline-block">
                        {c.code}
                      </span>
                      <p className="text-xs text-slate-600 mt-2 font-medium">{c.description}</p>
                      <div className="text-[11px] text-slate-500 mt-1 space-x-2">
                        <span>Min Order: <strong>₹{c.minOrder}</strong></span>
                        <span>•</span>
                        <span>Discount: <strong>{c.type === 'flat' ? `₹${c.value}` : `${c.value}%`}</strong></span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full ${
                        c.active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {c.active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <button
                      onClick={() => toggleCoupon(c.code)}
                      className="text-emerald-800 hover:underline font-bold"
                    >
                      {c.active ? 'Disable Coupon' : 'Enable Coupon'}
                    </button>
                    <button
                      onClick={() => deleteCoupon(c.code)}
                      className="text-red-600 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

