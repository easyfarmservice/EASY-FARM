'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MapPin, Plus, Trash2, Check, RefreshCw, Eye, EyeOff, Edit3, Clock, Calendar, Save, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AreaRow {
  id?: string;
  name: string;
  slug: string;
  pincodes: string[];
  delivery_fee?: number;
  active: boolean;
  city: string;
}

const GHATKESAR_AREAS: AreaRow[] = [
  { name: 'Singapore Township (Sanskruti)', slug: 'singapore-township', pincodes: ['500088'], active: true, city: 'Hyderabad' },
  { name: 'Emerald Heights', slug: 'emerald-heights', pincodes: ['500088'], active: true, city: 'Hyderabad' },
  { name: 'Pocharam IT Corridor', slug: 'pocharam', pincodes: ['500088'], active: true, city: 'Hyderabad' },
  { name: 'Narapally Corridor', slug: 'narapally', pincodes: ['500098'], active: true, city: 'Hyderabad' },
  { name: 'Ghatkesar Town Center', slug: 'ghatkesar-town', pincodes: ['501301'], active: true, city: 'Hyderabad' },
  { name: 'Modi Emerald Park', slug: 'modi-emerald-park', pincodes: ['501301'], active: true, city: 'Hyderabad' },
  { name: 'Rajeev Gruha Kalpa', slug: 'rajeev-gruha-kalpa', pincodes: ['501301'], active: true, city: 'Hyderabad' },
  { name: 'Peerzadiguda & Medipally', slug: 'peerzadiguda-medipally', pincodes: ['500092'], active: true, city: 'Hyderabad' },
  { name: 'Boduppal', slug: 'boduppal', pincodes: ['500039'], active: true, city: 'Hyderabad' },
  { name: 'Rampally & Keesara', slug: 'rampally', pincodes: ['501401'], active: true, city: 'Hyderabad' },
];

export default function AdminServiceAreasPage() {
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaRow | null>(null);

  // Cutoff settings state
  const [orderCutoffDay, setOrderCutoffDay] = useState('Saturday');
  const [orderCutoffTime, setOrderCutoffTime] = useState('23:59:59');
  const [deliveryDay, setDeliveryDay] = useState('Sunday');
  const [deliveryPromise, setDeliveryPromise] = useState('Sunday by 6 PM');
  const [savingCutoff, setSavingCutoff] = useState(false);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);

  // New area form state
  const [aName, setAName] = useState('');
  const [aPincodes, setAPincodes] = useState('');

  // Edit area form state
  const [editName, setEditName] = useState('');
  const [editPincodes, setEditPincodes] = useState('');

  const fetchAreasAndCutoff = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Fetch active delivery zones for cutoff settings
      const { data: zones } = await supabase
        .from('delivery_zones')
        .select('id, name, order_cutoff_day, order_cutoff_time, delivery_day, delivery_promise')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (zones && zones.length > 0) {
        const primaryZone = zones[0];
        setActiveZoneId(primaryZone.id);
        if (primaryZone.order_cutoff_day) setOrderCutoffDay(primaryZone.order_cutoff_day);
        if (primaryZone.order_cutoff_time) setOrderCutoffTime(primaryZone.order_cutoff_time);
        if (primaryZone.delivery_day) setDeliveryDay(primaryZone.delivery_day);
        if (primaryZone.delivery_promise) setDeliveryPromise(primaryZone.delivery_promise);
      }

      // 2. Fetch service areas
      const { data: areasData } = await supabase
        .from('delivery_areas')
        .select('id, name, slug, pincodes, active')
        .order('name', { ascending: true });

      if (areasData && areasData.length > 0) {
        setAreas(areasData.map((a) => ({ ...a, city: 'Hyderabad' })));
      } else {
        setAreas(GHATKESAR_AREAS);
      }
    } catch (e) {
      console.error('Error loading service areas & cutoff settings:', e);
      setAreas(GHATKESAR_AREAS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreasAndCutoff();
  }, []);

  const handleSaveCutoff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCutoff(true);
    try {
      const supabase = createClient();

      // Update active delivery zone in delivery_zones
      if (activeZoneId) {
        await supabase
          .from('delivery_zones')
          .update({
            order_cutoff_day: orderCutoffDay,
            order_cutoff_time: orderCutoffTime,
            delivery_day: deliveryDay,
            delivery_promise: deliveryPromise,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeZoneId);
      } else {
        await supabase
          .from('delivery_zones')
          .update({
            order_cutoff_day: orderCutoffDay,
            order_cutoff_time: orderCutoffTime,
            delivery_day: deliveryDay,
            delivery_promise: deliveryPromise,
            updated_at: new Date().toISOString(),
          })
          .eq('active', true);
      }

      // Also persist to business_settings for global synchronization
      await supabase.from('business_settings').upsert([
        { key: 'order_cutoff_day', value: JSON.stringify(orderCutoffDay), description: 'Weekly order cutoff day' },
        { key: 'order_cutoff_time', value: JSON.stringify(orderCutoffTime), description: 'Weekly order cutoff time' },
        { key: 'delivery_day', value: JSON.stringify(deliveryDay), description: 'Weekly delivery day' },
        { key: 'delivery_promise', value: JSON.stringify(deliveryPromise), description: 'Weekly delivery promise' },
      ], { onConflict: 'key' });

      setMsg(`Weekly order cutoff updated to ${orderCutoffDay} at ${orderCutoffTime}. After cutoff, orders automatically deliver the following ${deliveryDay}.`);
    } catch (err: any) {
      alert('Error updating cutoff schedule: ' + (err.message || err));
    } finally {
      setSavingCutoff(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aName || !aPincodes) return;
    setSaving(true);
    try {
      const slug = aName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      const pincodeArr = aPincodes.split(',').map((p) => p.trim()).filter(Boolean);

      const supabase = createClient();
      await supabase.from('delivery_areas').insert({
        name: aName,
        slug,
        pincodes: pincodeArr,
        active: true,
        ...(activeZoneId ? { zone_id: activeZoneId } : {}),
      });

      setMsg(`Service area "${aName}" added successfully!`);
      setShowAddForm(false);
      setAName('');
      setAPincodes('');
      fetchAreasAndCutoff();
    } catch (err: any) {
      alert('Error: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (area: AreaRow) => {
    setEditingArea(area);
    setEditName(area.name);
    setEditPincodes(area.pincodes ? area.pincodes.join(', ') : '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArea || !editName || !editPincodes) return;
    setSaving(true);
    try {
      const pincodeArr = editPincodes.split(',').map((p) => p.trim()).filter(Boolean);
      const supabase = createClient();

      if (editingArea.id) {
        await supabase
          .from('delivery_areas')
          .update({
            name: editName,
            pincodes: pincodeArr,
          })
          .eq('id', editingArea.id);
      }

      setMsg(`Service area "${editName}" updated with PINs: ${pincodeArr.join(', ')}`);
      setEditingArea(null);
      fetchAreasAndCutoff();
    } catch (err: any) {
      alert('Error: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const toggleArea = async (area: AreaRow) => {
    const newStatus = !area.active;
    setAreas((prev) => prev.map((a) => (a.name === area.name ? { ...a, active: newStatus } : a)));
    try {
      const supabase = createClient();
      if (area.id) {
        await supabase.from('delivery_areas').update({ active: newStatus }).eq('id', area.id);
      }
      setMsg(`"${area.name}" is now ${newStatus ? 'ACTIVE' : 'PAUSED'}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-6 h-6 text-emerald-800" />
              <h1 className="text-2xl font-black text-slate-900">Service Area &amp; Cutoff Management</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure delivery locations, serviceable postal codes, and weekly order cutoff timings.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-2xl transition shadow-md flex items-center gap-2 self-start sm:self-auto min-h-[44px]"
          >
            <Plus className="w-4 h-4" /> Add Service Area
          </button>
        </div>

        {msg && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* ── 1. WEEKLY ORDER CUTOFF & DELIVERY TIMINGS CARD ────────────────── */}
        <div className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <Clock className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <h2 className="text-base font-black text-slate-900">Weekly Order Cutoff &amp; Delivery Schedule</h2>
              <p className="text-xs text-slate-500">
                Set when weekly ordering closes. After cutoff, orders automatically move to the following delivery date.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveCutoff} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Order Cutoff Day *</label>
                <select
                  value={orderCutoffDay}
                  onChange={(e) => setOrderCutoffDay(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white min-h-[44px]"
                >
                  {['Saturday', 'Friday', 'Thursday', 'Wednesday', 'Tuesday', 'Monday', 'Sunday'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cutoff Time (24h) *</label>
                <input
                  type="text"
                  required
                  placeholder="23:59:59"
                  value={orderCutoffTime}
                  onChange={(e) => setOrderCutoffTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Weekly Delivery Day *</label>
                <select
                  value={deliveryDay}
                  onChange={(e) => setDeliveryDay(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white min-h-[44px]"
                >
                  {['Sunday', 'Saturday', 'Wednesday', 'Friday'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Promise *</label>
                <input
                  type="text"
                  required
                  value={deliveryPromise}
                  onChange={(e) => setDeliveryPromise(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            {/* CUTOFF RULE SUMMARY BOX */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-950 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  Current Schedule: Orders placed before {orderCutoffDay} 11:59 PM deliver on upcoming {deliveryDay}.
                </p>
                <p className="text-emerald-800 text-[11px]">
                  After 12:00 AM (Sunday), orders automatically schedule for the <strong>following Sunday (7 days later)</strong>.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingCutoff}
                className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition flex items-center gap-2 min-h-[42px]"
              >
                <Save className="w-4 h-4" />
                {savingCutoff ? 'Updating Schedule...' : 'Save Cutoff Schedule'}
              </button>
            </div>
          </form>
        </div>

        {/* ── 2. ADD NEW SERVICE AREA FORM ──────────────────────────────────── */}
        {showAddForm && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-in fade-in">
            <h2 className="text-base font-black text-slate-900 mb-4">Add New Service Area</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Area Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swarnagiri Colony / Narapally"
                  value={aName}
                  onChange={(e) => setAName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pincodes (comma-separated) *</label>
                <input
                  type="text"
                  required
                  placeholder="500088, 501301, 500098"
                  value={aPincodes}
                  onChange={(e) => setAPincodes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition"
                >
                  {saving ? 'Adding...' : 'Add Area'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── 3. EDIT EXISTING SERVICE AREA MODAL ───────────────────────────── */}
        {editingArea && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in">
              <h2 className="text-base font-black text-slate-900">Edit Service Area</h2>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Area Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pincodes (comma-separated) *</label>
                  <input
                    type="text"
                    required
                    value={editPincodes}
                    onChange={(e) => setEditPincodes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingArea(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition"
                  >
                    {saving ? 'Saving...' : 'Update Area'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── 4. LIST OF SERVICEABLE AREAS ─────────────────────────────────── */}
        {loading ? (
          <div className="py-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading service areas...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {areas.map((area) => (
              <div
                key={area.name}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col gap-3 ${
                  area.active ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-4 h-4 ${area.active ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <h3 className="font-black text-slate-900">{area.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                      area.active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {area.active ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <p>
                    City: <strong className="text-slate-800">{area.city || 'Hyderabad'}</strong>
                  </p>
                  <p>
                    Pincodes: <span className="font-mono font-bold text-slate-700">{area.pincodes?.join(', ')}</span>
                  </p>
                  <p>
                    Slug: <span className="font-mono text-slate-400">/{area.slug}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleArea(area)}
                      className="text-emerald-800 hover:underline font-bold flex items-center gap-1"
                    >
                      {area.active ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-600" /> Pause
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600" /> Activate
                        </>
                      )}
                    </button>
                    {area.id && (
                      <button
                        onClick={() => handleOpenEdit(area)}
                        className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Edit
                      </button>
                    )}
                  </div>
                  {area.id && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Are you sure you want to remove "${area.name}"?`)) return;
                        const supabase = createClient();
                        await supabase.from('delivery_areas').delete().eq('id', area.id!);
                        fetchAreasAndCutoff();
                      }}
                      className="text-red-600 hover:underline font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* INFO FOOTER */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 space-y-1">
          <p className="font-bold">📍 Active Corridor: Ghatkesar, Pocharam, Narapally, Medipally, Boduppal &amp; Rampally</p>
          <p className="text-emerald-700">
            Admins can adjust the weekly cutoff day and cutoff time at any time. When updated, customers ordering after the cutoff will automatically have their deliveries scheduled for the subsequent Sunday.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
