'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MapPin, Plus, Check, RefreshCw, Eye, EyeOff, Trash2, Edit3, ShieldAlert, Sparkles } from 'lucide-react';
import type { ZoneItem } from '@/components/admin/ZoneMapEditor';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

const ZoneMapEditor = dynamic(
  () => import('@/components/admin/ZoneMapEditor').then((mod) => mod.ZoneMapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] w-full rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
        <EasyFarmLoader size="sm" text="Loading Delivery Zones Map..." />
      </div>
    ),
  }
);

export default function AdminDeliveryZonesPage() {
  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form & drawing states
  const [showForm, setShowForm] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);

  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    city: 'Hyderabad',
    state: 'Telangana',
    delivery_day: 'Sunday',
    order_cutoff_day: 'Thursday',
    order_cutoff_time: '23:59:50',
    delivery_promise: 'Sunday by 6 PM',
    delivery_fee: 0,
    minimum_order: 250,
    active: true,
  });

  const fetchZones = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/delivery-zones');
      const data = await res.json();
      if (data.zones) {
        setZones(data.zones);
      }
    } catch (err: any) {
      console.error('Failed to load delivery zones:', err);
      setMsg({ text: 'Failed to load delivery zones from database.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleStartCreate = () => {
    setEditingZoneId(null);
    setFormData({
      name: '',
      slug: '',
      city: 'Hyderabad',
      state: 'Telangana',
      delivery_day: 'Sunday',
      order_cutoff_day: 'Thursday',
      order_cutoff_time: '23:59:50',
      delivery_promise: 'Sunday by 6 PM',
      delivery_fee: 0,
      minimum_order: 250,
      active: true,
    });
    setDrawnPoints([]);
    setIsDrawingMode(true);
    setShowForm(true);
  };

  const handleEditZone = (zone: ZoneItem) => {
    setEditingZoneId(zone.id || null);
    setFormData({
      name: zone.name,
      slug: zone.slug,
      city: zone.city,
      state: zone.state,
      delivery_day: zone.delivery_day,
      order_cutoff_day: zone.order_cutoff_day,
      order_cutoff_time: zone.order_cutoff_time,
      delivery_promise: zone.delivery_promise,
      delivery_fee: zone.delivery_fee,
      minimum_order: zone.minimum_order,
      active: zone.active,
    });

    // Load existing polygon vertices for drawing editor
    const ring = zone.polygon?.coordinates?.[0] || [];
    const pts: [number, number][] = ring.slice(0, -1).map((pt) => [pt[1], pt[0]]);
    setDrawnPoints(pts);
    setIsDrawingMode(true);
    setShowForm(true);
  };

  const handleApplyPreset = (presetName: string) => {
    if (presetName === 'ghatkesar') {
      setFormData((prev) => ({
        ...prev,
        name: 'Ghatkesar & Pocharam',
        slug: 'ghatkesar-pocharam',
      }));
      setDrawnPoints([
        [17.4100, 78.6300],
        [17.4100, 78.7200],
        [17.4800, 78.7200],
        [17.4800, 78.6300],
      ]);
    } else if (presetName === 'uppal') {
      setFormData((prev) => ({
        ...prev,
        name: 'Uppal & Boduppal',
        slug: 'uppal-boduppal',
      }));
      setDrawnPoints([
        [17.3800, 78.5400],
        [17.3800, 78.6100],
        [17.4300, 78.6100],
        [17.4300, 78.5400],
      ]);
    }
  };

  const handleToggleZoneActive = async (zone: ZoneItem) => {
    if (!zone.id) return;
    try {
      const res = await fetch(`/api/admin/delivery-zones/${zone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !zone.active }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({
          text: `Zone "${zone.name}" is now ${!zone.active ? 'ACTIVE' : 'INACTIVE'}.`,
          type: 'success',
        });
        fetchZones();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to update zone status', type: 'error' });
    }
  };

  const handleDeleteZone = async (zone: ZoneItem) => {
    if (!zone.id) return;
    if (!confirm(`Are you sure you want to remove zone "${zone.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/delivery-zones/${zone.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ text: data.message || 'Zone deleted successfully.', type: 'success' });
        fetchZones();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to delete zone', type: 'error' });
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (drawnPoints.length < 3) {
      setMsg({ text: 'Please define at least 3 points on the map to form a polygon.', type: 'error' });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      // Build GeoJSON coordinates ring: [ [lng, lat], ... ]
      const ring = drawnPoints.map((pt) => [pt[1], pt[0]]);
      ring.push([drawnPoints[0][1], drawnPoints[0][0]]); // Close ring

      const polygonGeoJson = {
        type: 'Polygon',
        coordinates: [ring],
      };

      const payload = {
        ...formData,
        polygon: polygonGeoJson,
      };

      let res: Response;
      if (editingZoneId) {
        res = await fetch(`/api/admin/delivery-zones/${editingZoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/delivery-zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save delivery zone.');
      }

      setMsg({
        text: `Delivery zone "${formData.name}" saved successfully!`,
        type: 'success',
      });
      setShowForm(false);
      setIsDrawingMode(false);
      fetchZones();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to save zone.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Delivery Zones &amp; Coverage Areas</h1>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative geofenced delivery zones. Customer locations are validated against these active boundaries in real time.
            </p>
          </div>
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Delivery Zone
          </button>
        </div>

        {/* FEEDBACK MSG */}
        {msg && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 border ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {msg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-red-600" />}
              <span>{msg.text}</span>
            </div>
            <button onClick={() => setMsg(null)} className="underline text-[11px] opacity-80 hover:opacity-100">
              Dismiss
            </button>
          </div>
        )}

        {/* MAP VISUALIZATION & DRAWING TOOL */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-700" />
                Live Delivery Coverage Map
              </h2>
              <p className="text-[11px] text-slate-400">
                Green represents ACTIVE serviceable boundaries. Gray/dashed represents paused/future expansion zones.
              </p>
            </div>
            {isDrawingMode && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-extrabold">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                Drawing Mode Active
              </span>
            )}
          </div>

          <ZoneMapEditor
            zones={zones}
            selectedZoneId={editingZoneId}
            onSelectZone={handleEditZone}
            isDrawingMode={isDrawingMode}
            drawnPoints={drawnPoints}
            onDrawnPointsChange={setDrawnPoints}
          />
        </div>

        {/* ZONE CREATION / EDIT FORM */}
        {showForm && (
          <div className="bg-white border-2 border-emerald-600 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingZoneId ? 'Edit Delivery Zone & Geofence' : 'Create New Delivery Zone'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click on the map above to define boundary vertices, or select a preset corridor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setIsDrawingMode(false);
                }}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>

            {/* PRESET SHORTCUTS */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Quick Bounding Presets:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('ghatkesar')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-xs font-bold border border-slate-200 transition"
                >
                  📍 Ghatkesar & Pocharam Preset
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('uppal')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-xs font-bold border border-slate-200 transition"
                >
                  📍 Uppal & Boduppal Preset
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Zone Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ghatkesar & Pocharam"
                    value={formData.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        name: val,
                        slug: formData.slug || val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                      });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Slug (Identifier) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ghatkesar-pocharam"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Day</label>
                  <select
                    value={formData.delivery_day}
                    onChange={(e) => setFormData({ ...formData, delivery_day: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    {['Sunday', 'Saturday', 'Wednesday', 'Friday'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Order Cutoff Day</label>
                  <select
                    value={formData.order_cutoff_day}
                    onChange={(e) => setFormData({ ...formData, order_cutoff_day: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    {['Thursday', 'Wednesday', 'Tuesday', 'Monday'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cutoff Time</label>
                  <input
                    type="text"
                    value={formData.order_cutoff_time}
                    onChange={(e) => setFormData({ ...formData, order_cutoff_time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={formData.delivery_fee}
                    onChange={(e) => setFormData({ ...formData, delivery_fee: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.minimum_order}
                    onChange={(e) => setFormData({ ...formData, minimum_order: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Status</label>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-500"
                      />
                      Active for Ordering
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setIsDrawingMode(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || drawnPoints.length < 3}
                  className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {saving ? 'Saving Zone...' : editingZoneId ? 'Update Delivery Zone' : 'Create & Activate Zone'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CONFIGURED ZONES LIST */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900 text-base">Configured Delivery Zones Matrix</h2>
            <button
              onClick={fetchZones}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-8">
              <EasyFarmLoader size="sm" text="Loading delivery zones..." />
            </div>
          ) : zones.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No delivery zones configured yet. Click "Add New Delivery Zone" above to define your first boundary.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="pb-3">Zone Name & Slug</th>
                    <th className="pb-3">City / State</th>
                    <th className="pb-3">Delivery Day</th>
                    <th className="pb-3">Cutoff</th>
                    <th className="pb-3">Min Order / Fee</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {zones.map((zone) => (
                    <tr key={zone.id || zone.slug} className={`hover:bg-slate-50 ${zone.active ? '' : 'opacity-60 bg-slate-50/50'}`}>
                      <td className="py-3">
                        <p className="font-extrabold text-slate-900 text-sm">{zone.name}</p>
                        <p className="font-mono text-slate-400 text-[10px]">/{zone.slug}</p>
                      </td>
                      <td className="py-3 font-medium text-slate-600">
                        {zone.city}, {zone.state}
                      </td>
                      <td className="py-3 font-semibold text-emerald-900">
                        {zone.delivery_day}
                      </td>
                      <td className="py-3 font-medium text-slate-600">
                        {zone.order_cutoff_day} ({zone.order_cutoff_time.slice(0, 5)})
                      </td>
                      <td className="py-3 font-medium text-slate-700">
                        ₹{zone.minimum_order} min / {zone.delivery_fee === 0 ? 'FREE' : `₹${zone.delivery_fee}`}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                            zone.active
                              ? 'bg-emerald-100 text-emerald-950'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${zone.active ? 'bg-emerald-600' : 'bg-slate-500'}`} />
                          {zone.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleZoneActive(zone)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-1"
                        >
                          {zone.active ? <EyeOff className="w-3 h-3 text-amber-600" /> : <Eye className="w-3 h-3 text-emerald-600" />}
                          {zone.active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditZone(zone)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteZone(zone)}
                          className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-[11px] font-bold hover:bg-red-100 transition inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
