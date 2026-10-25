'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MapPin, Save, Check, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminDeliverySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [baseFee, setBaseFee] = useState('40');
  const [freeThreshold, setFreeThreshold] = useState('499');
  const [minOrder, setMinOrder] = useState('250');
  const [orderCutoffDay, setOrderCutoffDay] = useState('Saturday');
  const [orderCutoffTime, setOrderCutoffTime] = useState('23:00');
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

        if (settingsMap.base_delivery_fee !== undefined) setBaseFee(String(settingsMap.base_delivery_fee));
        if (settingsMap.free_delivery_threshold !== undefined) setFreeThreshold(String(settingsMap.free_delivery_threshold));
        if (settingsMap.minimum_order_value !== undefined) setMinOrder(String(settingsMap.minimum_order_value));
        if (settingsMap.order_cutoff_day) setOrderCutoffDay(String(settingsMap.order_cutoff_day).replace(/"/g, ''));
        if (settingsMap.order_cutoff_time) setOrderCutoffTime(String(settingsMap.order_cutoff_time).replace(/"/g, ''));
        if (settingsMap.delivery_day) setDeliveryDay(String(settingsMap.delivery_day).replace(/"/g, ''));
        if (settingsMap.delivery_promise) setDeliveryPromise(String(settingsMap.delivery_promise).replace(/"/g, ''));
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const payload = [
      { key: 'base_delivery_fee', value: Number(baseFee), description: 'Standard delivery fee' },
      { key: 'free_delivery_threshold', value: Number(freeThreshold), description: 'Free delivery threshold' },
      { key: 'minimum_order_value', value: Number(minOrder), description: 'Minimum order amount' },
      { key: 'order_cutoff_day', value: JSON.stringify(orderCutoffDay), description: 'Order cutoff day' },
      { key: 'order_cutoff_time', value: JSON.stringify(orderCutoffTime), description: 'Order cutoff time' },
      { key: 'delivery_day', value: JSON.stringify(deliveryDay), description: 'Delivery day' },
      { key: 'delivery_promise', value: JSON.stringify(deliveryPromise), description: 'Delivery promise text' },
    ];

    try {
      const supabase = createClient();
      await supabase.from('business_settings').upsert(payload, { onConflict: 'key' });

      setMsg('Delivery & Cutoff settings saved successfully! Instantly active at checkout.');
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
            <MapPin className="w-6 h-6 text-emerald-800" />
            <h1 className="text-2xl font-black text-slate-900">Delivery Fees & Cutoff Settings</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure delivery fees, free delivery threshold (e.g. ₹499 → ₹599), and weekly order cutoff schedules without modifying code.
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
            {/* DELIVERY FEES CARD */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
                Delivery Charges & Thresholds
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Delivery Fee (₹) *</label>
                  <input
                    type="number"
                    required
                    value={baseFee}
                    onChange={(e) => setBaseFee(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Fee charged on orders below threshold</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Free Delivery Threshold (₹) *</label>
                  <input
                    type="number"
                    required
                    value={freeThreshold}
                    onChange={(e) => setFreeThreshold(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Orders above this get FREE delivery</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Order Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Enforced at checkout</p>
                </div>
              </div>
            </div>

            {/* WEEKLY CUTOFF CARD */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
                Weekly Cutoff & Delivery Promise
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
                {saving ? 'Saving Settings...' : 'Save & Update Checkout Rules'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
