'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { BarChart3, Save, Check, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface WeeklyBasketRow {
  id?: string;
  basketId: string;
  basketName: string;
  weekLabel: string;
  availableCapacity: number;
  orderedCapacity: number;
  price: number;
  status: 'available' | 'sold_out' | 'closed';
}

function getWeekLabel() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function AdminWeeklyCapacityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<WeeklyBasketRow[]>([]);
  const [weekLabel, setWeekLabel] = useState(getWeekLabel());

  const fetchCapacity = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Load active baskets
      const { data: baskets } = await supabase
        .from('baskets')
        .select('id, name, price')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (!baskets || baskets.length === 0) {
        // Fallback demo rows
        setRows([
          { basketId: 'b-01', basketName: 'Staple Box', weekLabel, availableCapacity: 100, orderedCapacity: 73, price: 250, status: 'available' },
          { basketId: 'b-02', basketName: 'Green Box', weekLabel, availableCapacity: 80, orderedCapacity: 80, price: 350, status: 'sold_out' },
          { basketId: 'b-03', basketName: 'Premium Box', weekLabel, availableCapacity: 50, orderedCapacity: 21, price: 500, status: 'available' },
        ]);
        setLoading(false);
        return;
      }

      // Load weekly_baskets rows for this week
      const { data: weekly } = await supabase
        .from('weekly_baskets')
        .select('*')
        .eq('week_label', weekLabel);

      const weeklyMap: Record<string, any> = {};
      if (weekly) weekly.forEach((w) => (weeklyMap[w.basket_id] = w));

      const builtRows: WeeklyBasketRow[] = baskets.map((b) => {
        const w = weeklyMap[b.id];
        return {
          id: w?.id,
          basketId: b.id,
          basketName: b.name,
          weekLabel,
          availableCapacity: w?.available_capacity ?? 100,
          orderedCapacity: w?.ordered_capacity ?? 0,
          price: w?.price ?? Number(b.price),
          status: w?.status ?? 'available',
        };
      });

      setRows(builtRows);
    } catch (e) {
      console.error('Error fetching weekly capacity:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapacity();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekLabel]);

  const updateRow = (basketId: string, updates: Partial<WeeklyBasketRow>) => {
    setRows((prev) => prev.map((r) => (r.basketId === basketId ? { ...r, ...updates } : r)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const supabase = createClient();

      for (const row of rows) {
        // Auto-set status based on capacity
        const computedStatus: WeeklyBasketRow['status'] =
          row.status !== 'closed'
            ? row.orderedCapacity >= row.availableCapacity
              ? 'sold_out'
              : 'available'
            : 'closed';

        const payload = {
          basket_id: row.basketId,
          week_label: weekLabel,
          available_capacity: row.availableCapacity,
          ordered_capacity: row.orderedCapacity,
          price: row.price,
          status: row.status === 'closed' ? 'closed' : computedStatus,
          updated_at: new Date().toISOString(),
        };

        if (row.id) {
          await supabase.from('weekly_baskets').update(payload).eq('id', row.id);
        } else {
          const { data: inserted } = await supabase
            .from('weekly_baskets')
            .insert(payload)
            .select()
            .maybeSingle();
          if (inserted?.id) {
            updateRow(row.basketId, { id: inserted.id, status: computedStatus });
          }
        }
      }

      setMsg(`Weekly capacities for "${weekLabel}" saved! Customer store now reflects current availability.`);
      fetchCapacity();
    } catch (err: any) {
      alert('Failed to save capacities: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'available') return 'bg-emerald-100 text-emerald-900';
    if (status === 'sold_out') return 'bg-amber-100 text-amber-900';
    return 'bg-slate-200 text-slate-700';
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-800" />
            <h1 className="text-2xl font-black text-slate-900">Weekly Basket Capacity & Sold-Out Control</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage weekly capacity caps per basket. When full, the customer store shows &quot;SOLD OUT&quot; automatically.
          </p>
        </div>

        {/* WEEK SELECTOR */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-700">Week:</span>
          <input
            type="text"
            value={weekLabel}
            onChange={(e) => setWeekLabel(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setWeekLabel(getWeekLabel())}
            className="px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 border border-emerald-200 rounded-xl"
          >
            Reset to Current Week
          </button>
          <span className="text-[11px] text-slate-400">Format: Sep 07 – Sep 13</span>
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
            <p>Loading weekly capacity from database...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {rows.map((row) => {
                const remaining = Math.max(0, row.availableCapacity - row.orderedCapacity);
                const pct = row.availableCapacity > 0 ? (row.orderedCapacity / row.availableCapacity) * 100 : 0;

                return (
                  <div key={row.basketId} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-black text-lg text-slate-900">{row.basketName}</h3>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${statusColor(row.status)}`}>
                        {row.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                        <span>{row.orderedCapacity} ordered</span>
                        <span>{remaining} remaining</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-amber-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 text-right">{Math.round(pct)}% full</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Max Weekly Capacity</label>
                        <input
                          type="number"
                          min={0}
                          value={row.availableCapacity}
                          onChange={(e) => updateRow(row.basketId, { availableCapacity: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Orders Placed This Week</label>
                        <input
                          type="number"
                          min={0}
                          value={row.orderedCapacity}
                          onChange={(e) => updateRow(row.basketId, { orderedCapacity: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">This Week Price (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={row.price}
                          onChange={(e) => updateRow(row.basketId, { price: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Status Override</label>
                        <select
                          value={row.status}
                          onChange={(e) => updateRow(row.basketId, { status: e.target.value as any })}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="available">Available</option>
                          <option value="sold_out">Sold Out</option>
                          <option value="closed">Closed for Week</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-2xl transition shadow-md flex items-center gap-2 min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Weekly Capacities & Publish'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
