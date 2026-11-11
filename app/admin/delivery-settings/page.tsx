'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MapPin, Save, Check, RefreshCw, Truck, Sparkles, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminDeliverySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Delivery Pricing Mode: 'free' (100% Free delivery for all) | 'paid' (Charged delivery fee)
  const [deliveryMode, setDeliveryMode] = useState<'free' | 'paid'>('paid');
  const [baseFee, setBaseFee] = useState('40');
  const [freeThreshold, setFreeThreshold] = useState('499');
  const [minOrder, setMinOrder] = useState('100');
  const [orderCutoffDay, setOrderCutoffDay] = useState('Thursday');
  const [orderCutoffTime, setOrderCutoffTime] = useState('23:59');
  const [deliveryDay, setDeliveryDay] = useState('Sunday');
  const [deliveryPromise, setDeliveryPromise] = useState('Sunday by 6 PM');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.from('business_settings').select('key, value');

      if (data && data.length > 0) {
        const settingsMap: Record<string, any> = {};
        data.forEach((row) => {
          settingsMap[row.key] = row.value;
        });

        const isFree =
          settingsMap.is_delivery_free === true ||
          settingsMap.is_delivery_free === 'true' ||
          Number(settingsMap.base_delivery_fee) === 0;

        setDeliveryMode(isFree ? 'free' : 'paid');

        if (settingsMap.base_delivery_fee !== undefined && Number(settingsMap.base_delivery_fee) > 0) {
          setBaseFee(String(settingsMap.base_delivery_fee));
        } else if (settingsMap.saved_base_delivery_fee !== undefined) {
          setBaseFee(String(settingsMap.saved_base_delivery_fee));
        }

        if (settingsMap.free_delivery_threshold !== undefined) {
          setFreeThreshold(String(settingsMap.free_delivery_threshold));
        }
        if (settingsMap.minimum_order_value !== undefined) {
          setMinOrder(String(settingsMap.minimum_order_value));
        }
        if (settingsMap.order_cutoff_day) {
          setOrderCutoffDay(String(settingsMap.order_cutoff_day).replace(/"/g, ''));
        }
        if (settingsMap.order_cutoff_time) {
          setOrderCutoffTime(String(settingsMap.order_cutoff_time).replace(/"/g, ''));
        }
        if (settingsMap.delivery_day) {
          setDeliveryDay(String(settingsMap.delivery_day).replace(/"/g, ''));
        }
        if (settingsMap.delivery_promise) {
          setDeliveryPromise(String(settingsMap.delivery_promise).replace(/"/g, ''));
        }
      }
    } catch (e) {
      console.error('Failed to load delivery settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleApplyPreset = (preset: 'free' | 'standard_40' | 'flat_30' | 'flat_50') => {
    if (preset === 'free') {
      setDeliveryMode('free');
    } else if (preset === 'standard_40') {
      setDeliveryMode('paid');
      setBaseFee('40');
      setFreeThreshold('499');
    } else if (preset === 'flat_30') {
      setDeliveryMode('paid');
      setBaseFee('30');
      setFreeThreshold('99999');
    } else if (preset === 'flat_50') {
      setDeliveryMode('paid');
      setBaseFee('50');
      setFreeThreshold('99999');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const isFree = deliveryMode === 'free';
    const effectiveFee = isFree ? 0 : Math.max(0, Number(baseFee) || 0);

    const payload = [
      { key: 'is_delivery_free', value: isFree, description: 'Whether all customer deliveries are completely free' },
      { key: 'base_delivery_fee', value: effectiveFee, description: 'Active delivery fee charged at checkout in INR' },
      { key: 'saved_base_delivery_fee', value: Math.max(1, Number(baseFee) || 40), description: 'Preserved delivery fee when toggled between free and paid' },
      { key: 'free_delivery_threshold', value: Number(freeThreshold) || 499, description: 'Minimum subtotal for free delivery' },
      { key: 'minimum_order_value', value: Number(minOrder) || 100, description: 'Minimum order amount in INR' },
      { key: 'order_cutoff_day', value: JSON.stringify(orderCutoffDay), description: 'Weekly order cutoff day' },
      { key: 'order_cutoff_time', value: JSON.stringify(orderCutoffTime), description: 'Weekly order cutoff time' },
      { key: 'delivery_day', value: JSON.stringify(deliveryDay), description: 'Weekly delivery day' },
      { key: 'delivery_promise', value: JSON.stringify(deliveryPromise), description: 'Customer delivery promise text' },
    ];

    try {
      const supabase = createClient();
      await supabase.from('business_settings').upsert(payload, { onConflict: 'key' });

      setMsg(
        isFree
          ? '🎉 Free Delivery Mode activated! All customers now receive 100% Free Delivery at checkout.'
          : `✅ Paid Delivery Mode saved! Customers are charged ₹${effectiveFee} (Free above ₹${freeThreshold}).`
      );
    } catch (err: any) {
      alert('Failed to save delivery settings: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-800" />
            <h1 className="text-2xl font-black text-slate-900">Delivery Charges & Cutoff Control</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Toggle between 100% Free Delivery or Paid Delivery with custom fees and free thresholds. Changes apply instantly to cart and checkout.
          </p>
        </div>

        {msg && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-semibold space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
            <p>Loading delivery settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">

            {/* LIVE CUSTOMER STATUS PREVIEW BANNER */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              deliveryMode === 'free'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                  deliveryMode === 'free' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {deliveryMode === 'free' ? 'FREE' : `₹${baseFee}`}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {deliveryMode === 'free' ? 'Current Customer Rule: 100% FREE DELIVERY' : 'Current Customer Rule: PAID DELIVERY'}
                  </h4>
                  <p className="text-xs opacity-90">
                    {deliveryMode === 'free'
                      ? 'No delivery charges are added. Every customer gets free delivery on all orders.'
                      : `Standard fee of ₹${baseFee} is charged. Orders above ₹${freeThreshold} get free delivery.`}
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 ${
                deliveryMode === 'free' ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
              }`}>
                {deliveryMode === 'free' ? 'Active: Free' : 'Active: Paid'}
              </span>
            </div>

            {/* QUICK PRESET BUTTONS */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Quick Delivery Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('free')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    deliveryMode === 'free'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  100% Free Delivery (₹0)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('standard_40')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    deliveryMode === 'paid' && baseFee === '40' && freeThreshold === '499'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Standard (₹40, Free over ₹499)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('flat_30')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    deliveryMode === 'paid' && baseFee === '30' && Number(freeThreshold) > 1000
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Flat ₹30 Delivery
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('flat_50')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    deliveryMode === 'paid' && baseFee === '50' && Number(freeThreshold) > 1000
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Flat ₹50 Delivery
                </button>
              </div>
            </div>

            {/* DELIVERY MODE SELECTION CARDS */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
                1. Select Delivery Pricing Model
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* OPTION 1: 100% FREE DELIVERY */}
                <div
                  onClick={() => setDeliveryMode('free')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between space-y-3 ${
                    deliveryMode === 'free'
                      ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        deliveryMode === 'free' ? 'border-emerald-600' : 'border-slate-400'
                      }`}>
                        {deliveryMode === 'free' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                      </div>
                      <span className="font-extrabold text-sm text-slate-900">100% Free Delivery</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                      ₹0 / Free
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Zero delivery charge added for all customers. Encourages higher basket conversion and volume.
                  </p>
                </div>

                {/* OPTION 2: PAID DELIVERY */}
                <div
                  onClick={() => setDeliveryMode('paid')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between space-y-3 ${
                    deliveryMode === 'paid'
                      ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        deliveryMode === 'paid' ? 'border-emerald-600' : 'border-slate-400'
                      }`}>
                        {deliveryMode === 'paid' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                      </div>
                      <span className="font-extrabold text-sm text-slate-900">Paid Delivery (Custom Fee)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                      Fee + Threshold
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Charge a standard delivery fee (e.g. ₹40), and waive it for orders meeting your free delivery threshold.
                  </p>
                </div>
              </div>

              {/* PAID DELIVERY CONFIGURATION INPUTS */}
              {deliveryMode === 'paid' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Paid Delivery Parameters:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Base Delivery Fee (₹) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={baseFee}
                        onChange={(e) => setBaseFee(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Fee charged when order is below threshold</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Free Delivery Threshold (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={freeThreshold}
                        onChange={(e) => setFreeThreshold(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Orders at or above this amount get FREE delivery</p>
                    </div>
                  </div>
                </div>
              )}

              {/* MINIMUM ORDER AMOUNT */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Store Minimum Order Amount (₹) *
                </label>
                <div className="max-w-xs">
                  <input
                    type="number"
                    min="1"
                    required
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Checkout requires cart subtotal to meet or exceed this amount (default: ₹100).
                </p>
              </div>
            </div>

            {/* WEEKLY CUTOFF CARD */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
                2. Weekly Cutoff & Delivery Promise
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Weekly Order Cutoff Day</label>
                  <select
                    value={orderCutoffDay}
                    onChange={(e) => setOrderCutoffDay(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cutoff Time (24h format)</label>
                  <input
                    type="text"
                    value={orderCutoffTime}
                    onChange={(e) => setOrderCutoffTime(e.target.value)}
                    placeholder="23:59"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Weekly Delivery Day</label>
                  <input
                    type="text"
                    value={deliveryDay}
                    onChange={(e) => setDeliveryDay(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Delivery Promise Banner</label>
                  <input
                    type="text"
                    value={deliveryPromise}
                    onChange={(e) => setDeliveryPromise(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-2xl transition shadow-md flex items-center gap-2 min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving Settings...' : 'Save & Apply Delivery Rules'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
