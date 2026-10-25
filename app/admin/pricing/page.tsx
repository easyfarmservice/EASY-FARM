'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { BarChart3, Search, RefreshCw, TrendingUp, TrendingDown, Save, Check, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PricingService } from '@/services/pricing.service';

interface BasketPriceRow {
  id: string;
  name: string;
  slug: string;
  currentPrice: number;
  compareAtPrice?: number;
  newPrice: string;
  newCompareAt: string;
  dirty: boolean;
}

interface PriceHistoryRow {
  id: string;
  entity_type: string;
  entity_name: string;
  old_price: number;
  new_price: number;
  changed_by: string;
  created_at: string;
}

export default function AdminPricingPage() {
  const [baskets, setBaskets] = useState<BasketPriceRow[]>([]);
  const [history, setHistory] = useState<PriceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: bData, error: bErr } = await supabase
        .from('baskets')
        .select('id, name, slug, price')
        .order('sort_order', { ascending: true });

      if (bErr) console.error('Error fetching baskets in admin pricing:', bErr);

      if (bData && bData.length > 0) {
        setBaskets(
          bData.map((b: any) => ({
            id: b.id,
            name: b.name,
            slug: b.slug,
            currentPrice: Number(b.price),
            compareAtPrice: Math.round(Number(b.price) * 1.2),
            newPrice: String(b.price),
            newCompareAt: String(Math.round(Number(b.price) * 1.2)),
            dirty: false,
          }))
        );
      } else {
        // Fallback demo matching real Supabase UUIDs
        setBaskets([
          { id: '33333333-0000-0000-0000-000000000001', name: 'Staple Box', slug: 'staple-box', currentPrice: 250, compareAtPrice: 299, newPrice: '250', newCompareAt: '299', dirty: false },
          { id: '33333333-0000-0000-0000-000000000002', name: 'Green Box', slug: 'green-box', currentPrice: 350, compareAtPrice: 420, newPrice: '350', newCompareAt: '420', dirty: false },
          { id: '33333333-0000-0000-0000-000000000003', name: 'Premium Box', slug: 'premium-box', currentPrice: 500, compareAtPrice: 600, newPrice: '500', newCompareAt: '600', dirty: false },
        ]);
      }

      const { data: hData } = await supabase
        .from('price_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setHistory(hData || []);
    } catch (e) {
      console.error('Error loading pricing data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const markDirty = (id: string, field: 'newPrice' | 'newCompareAt', val: string) => {
    setBaskets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: val, dirty: true } : b))
    );
  };

  const handleSavePrice = async (basket: BasketPriceRow) => {
    const newPriceNum = Number(basket.newPrice);
    const newCompareAtNum = basket.newCompareAt ? Number(basket.newCompareAt) : undefined;

    if (!newPriceNum || isNaN(newPriceNum) || newPriceNum <= 0) {
      alert('Please enter a valid price');
      return;
    }

    setSaving(basket.id);
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basketId: basket.id,
          slug: basket.slug,
          name: basket.name,
          price: newPriceNum,
          compareAtPrice: newCompareAtNum,
          oldPrice: basket.currentPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save price');
      }

      setBaskets((prev) =>
        prev.map((b) =>
          b.id === basket.id
            ? { ...b, currentPrice: newPriceNum, compareAtPrice: newCompareAtNum, dirty: false }
            : b
        )
      );

      setMsg(`Price updated for ${basket.name}: ₹${basket.currentPrice} → ₹${newPriceNum}. Changes are live!`);
      fetchData();
    } catch (err: any) {
      alert('Failed to save price: ' + (err.message || err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-800" />
            <h1 className="text-2xl font-black text-slate-900">Quick Price Editor & Price History</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Update basket prices in real time. All changes go live on the customer website instantly and are logged.
          </p>
        </div>

        {msg && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading pricing data...</p>
          </div>
        ) : (
          <>
            {/* PRICE EDITOR TABLE */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h2 className="font-black text-base text-slate-900">Live Basket Prices</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Change prices without touching code. Changes apply at next page load on customer site.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wide text-[10px]">
                      <th className="px-6 py-3 text-left">Basket</th>
                      <th className="px-4 py-3 text-right">Current Price</th>
                      <th className="px-4 py-3 text-right">Compare-At</th>
                      <th className="px-4 py-3 text-right">New Price (₹)</th>
                      <th className="px-4 py-3 text-right">New Compare-At (₹)</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {baskets.map((b) => {
                      const priceChanged = Number(b.newPrice) !== b.currentPrice;
                      return (
                        <tr key={b.id} className={`${b.dirty ? 'bg-amber-50/40' : ''}`}>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{b.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">/{b.slug}</p>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="font-bold text-slate-900">₹{b.currentPrice}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-slate-500 line-through">₹{b.compareAtPrice ?? '—'}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <input
                              type="number"
                              value={b.newPrice}
                              onChange={(e) => markDirty(b.id, 'newPrice', e.target.value)}
                              className={`w-24 px-3 py-1.5 rounded-xl border font-bold text-right focus:ring-2 focus:ring-emerald-500 focus:outline-none ${priceChanged ? 'border-amber-400 bg-amber-50' : 'border-slate-300'}`}
                            />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <input
                              type="number"
                              value={b.newCompareAt}
                              onChange={(e) => markDirty(b.id, 'newCompareAt', e.target.value)}
                              placeholder="Optional"
                              className="w-24 px-3 py-1.5 rounded-xl border border-slate-300 text-right font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleSavePrice(b)}
                              disabled={saving === b.id}
                              className={`px-4 py-1.5 rounded-xl font-bold text-xs transition ${b.dirty ? 'bg-emerald-800 text-white hover:bg-emerald-900' : 'bg-slate-100 text-slate-500 cursor-not-allowed'}`}
                            >
                              {saving === b.id ? '...' : 'Update'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PRICE HISTORY LOG */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h2 className="font-black text-base text-slate-900">Price Change Audit Log</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Immutable log of all price modifications. Historical orders are unaffected.</p>
              </div>

              {history.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-semibold">
                  No price changes logged yet. Apply a price update above to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wide text-[10px]">
                        <th className="px-6 py-3 text-left">Item</th>
                        <th className="px-4 py-3 text-right">Old Price</th>
                        <th className="px-4 py-3 text-right">New Price</th>
                        <th className="px-4 py-3 text-center">Change</th>
                        <th className="px-4 py-3 text-left">Changed By</th>
                        <th className="px-4 py-3 text-left">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.map((h) => {
                        const diff = h.new_price - h.old_price;
                        return (
                          <tr key={h.id}>
                            <td className="px-6 py-3">
                              <p className="font-bold text-slate-900">{h.entity_name}</p>
                              <p className="text-[10px] text-slate-400">{h.entity_type}</p>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-600">₹{h.old_price}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">₹{h.new_price}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`flex items-center justify-center gap-1 font-bold ${diff > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{h.changed_by}</td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">
                              {new Date(h.created_at).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
