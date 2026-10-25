'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MapPin, Plus, Trash2, Check, RefreshCw, Eye, EyeOff } from 'lucide-react';
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
  { name: 'Ghatkesar Town Center', slug: 'ghatkesar-town', pincodes: ['501301'], active: true, city: 'Hyderabad' },
  { name: 'Modi Emerald Park', slug: 'modi-emerald-park', pincodes: ['501301'], active: true, city: 'Hyderabad' },
  { name: 'Narapally (Expansion)', slug: 'narapally', pincodes: ['500088'], active: false, city: 'Hyderabad' },
  { name: 'Uppal (Expansion)', slug: 'uppal', pincodes: ['500039'], active: false, city: 'Hyderabad' },
];

export default function AdminServiceAreasPage() {
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [aName, setAName] = useState('');
  const [aPincodes, setAPincodes] = useState('');
  const [aCity, setACity] = useState('Hyderabad');

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('delivery_areas')
        .select('id, name, slug, pincodes, active')
        .order('name', { ascending: true });

      if (data && data.length > 0) {
        setAreas(data.map((a) => ({ ...a, city: 'Hyderabad' })));
      } else {
        setAreas(GHATKESAR_AREAS);
      }
    } catch (e) {
      console.error('Error loading service areas:', e);
      setAreas(GHATKESAR_AREAS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAreas(); }, []);

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
        // Temporarily use first delivery_zone row as parent if available
      });

      setMsg(`Service area "${aName}" added!`);
      setShowForm(false);
      setAName(''); setAPincodes('');
      fetchAreas();
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
    } catch (e) { console.error(e); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-6 h-6 text-emerald-800" />
              <h1 className="text-2xl font-black text-slate-900">Service Area Management</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Control which Ghatkesar localities receive Easy Farm deliveries. Active areas are live for customers.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-2xl transition shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Service Area
          </button>
        </div>

        {msg && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700" /> {msg}
          </div>
        )}

        {showForm && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-black text-slate-900 mb-4">Add New Service Area</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Area Name *</label>
                <input type="text" required placeholder="e.g. Tellapur" value={aName} onChange={(e) => setAName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pincodes (comma-separated) *</label>
                <input type="text" required placeholder="500032, 500084" value={aPincodes} onChange={(e) => setAPincodes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition">
                  {saving ? 'Adding...' : 'Add Area'}
                </button>
              </div>
            </form>
          </div>
        )}

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
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col gap-3 ${area.active ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-4 h-4 ${area.active ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <h3 className="font-black text-slate-900">{area.name}</h3>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${area.active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-600'}`}>
                    {area.active ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <p>City: <strong className="text-slate-800">{area.city || 'Hyderabad'}</strong></p>
                  <p>Pincodes: <span className="font-mono font-bold text-slate-700">{area.pincodes?.join(', ')}</span></p>
                  <p>Slug: <span className="font-mono text-slate-400">/{area.slug}</span></p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <button
                    onClick={() => toggleArea(area)}
                    className="text-emerald-800 hover:underline font-bold flex items-center gap-1"
                  >
                    {area.active ? <><EyeOff className="w-3.5 h-3.5 text-amber-600" /> Pause Area</> : <><Eye className="w-3.5 h-3.5 text-emerald-600" /> Activate Area</>}
                  </button>
                  {area.id && (
                    <button
                      onClick={async () => {
                        const supabase = createClient();
                        await supabase.from('delivery_areas').delete().eq('id', area.id!);
                        fetchAreas();
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

        {/* INFO CARD */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 space-y-1">
          <p className="font-bold">📍 Current Launch Zone: Ghatkesar, Hyderabad</p>
          <p className="text-emerald-700">Only ACTIVE areas are available for delivery selection during customer checkout. Paused areas are hidden from the customer website.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
