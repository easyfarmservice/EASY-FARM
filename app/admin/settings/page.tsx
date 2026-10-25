'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ShieldCheck, Save, Check, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState('Easy Farm');
  const [phone, setPhone] = useState('+91 98490 12345');
  const [email, setEmail] = useState('support@easyfarm.in');
  const [allowStacking, setAllowStacking] = useState(false);
  const [currency, setCurrency] = useState('INR (₹)');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.from('business_settings').select('key, value');

      if (data && data.length > 0) {
        const map: Record<string, any> = {};
        data.forEach((r) => (map[r.key] = r.value));

        if (map.support_phone) setPhone(String(map.support_phone).replace(/"/g, ''));
        if (map.support_email) setEmail(String(map.support_email).replace(/"/g, ''));
        if (map.allow_coupon_stacking !== undefined) setAllowStacking(Boolean(map.allow_coupon_stacking));
      }
    } catch (e) {
      console.error('Failed to load business settings:', e);
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
      { key: 'support_phone', value: JSON.stringify(phone), description: 'Support phone number' },
      { key: 'support_email', value: JSON.stringify(email), description: 'Support email address' },
      { key: 'allow_coupon_stacking', value: allowStacking, description: 'Allow coupon stacking' },
    ];

    try {
      const supabase = createClient();
      await supabase.from('business_settings').upsert(payload, { onConflict: 'key' });

      setMsg('Business settings updated successfully!');
    } catch (err: any) {
      alert('Error saving settings: ' + (err.message || err));
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
            <ShieldCheck className="w-6 h-6 text-emerald-800" />
            <h1 className="text-2xl font-black text-slate-900">General Business Settings</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Global business parameters, contact details, and discount stacking controls.
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
            <p>Loading settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
                Store Identity & Support
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    disabled
                    value={businessName}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Operating Currency</label>
                  <input
                    type="text"
                    disabled
                    value={currency}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Support Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Support Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* DISCOUNT RULES CARD */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
                Discount & Stacking Policy
              </h2>

              <div className="flex items-start gap-3 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <input
                  type="checkbox"
                  id="stackingToggle"
                  checked={allowStacking}
                  onChange={(e) => setAllowStacking(e.target.checked)}
                  className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-500 mt-1"
                />
                <div>
                  <label htmlFor="stackingToggle" className="text-xs font-bold text-slate-900 block cursor-pointer">
                    Allow Promo Coupons to Stack with Basket Sale Prices
                  </label>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    When turned OFF (default), only one best discount is applied at checkout to prevent double discounting.
                  </p>
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
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
