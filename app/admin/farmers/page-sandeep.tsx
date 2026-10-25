'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Sprout, Plus, Edit3, Trash2, RefreshCw, Check, Phone, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface FarmerRow {
  id?: string;
  name: string;
  phone: string;
  village: string;
  district: string;
  state: string;
  description?: string;
  photo_url?: string;
  active: boolean;
}

const DEMO_FARMERS: FarmerRow[] = [
  { name: 'Ranga Reddy', phone: '9849055001', village: 'Chevella', district: 'Rangareddy', state: 'Telangana', description: 'Tomatoes, Brinjal, Bitter Gourd — naturally grown', active: true },
  { name: 'Venkataiah', phone: '9912345678', village: 'Shankarpally', district: 'Rangareddy', state: 'Telangana', description: 'Leafy greens, Coriander, Spinach specialist', active: true },
  { name: 'Lakshmi Bai', phone: '8885550099', village: 'Parigi', district: 'Vikarabad', state: 'Telangana', description: 'Turmeric, Drumstick, Pumpkin, Bottle Gourd', active: true },
];

export default function AdminFarmersPage() {
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FarmerRow | null>(null);

  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fVillage, setFVillage] = useState('');
  const [fDistrict, setFDistrict] = useState('Rangareddy');
  const [fDesc, setFDesc] = useState('');

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('farmers')
        .select('id, name, phone, village, district, state, description, photo_url, active')
        .order('name', { ascending: true });

      setFarmers(data && data.length > 0 ? data : DEMO_FARMERS);
    } catch (e) {
      console.error('Error loading farmers:', e);
      setFarmers(DEMO_FARMERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFarmers(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFName(''); setFPhone(''); setFVillage(''); setFDistrict('Rangareddy'); setFDesc('');
    setShowForm(true);
  };

  const openEdit = (f: FarmerRow) => {
    setEditing(f);
    setFName(f.name); setFPhone(f.phone); setFVillage(f.village);
    setFDistrict(f.district); setFDesc(f.description || '');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName || !fPhone || !fVillage) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = { name: fName, phone: fPhone, village: fVillage, district: fDistrict, state: 'Telangana', description: fDesc, active: true };

      if (editing?.id) {
        await supabase.from('farmers').update(payload).eq('id', editing.id);
        setMsg(`Farmer "${fName}" updated!`);
      } else {
        await supabase.from('farmers').insert(payload);
        setMsg(`Farmer partner "${fName}" added!`);
      }
      setShowForm(false);
      fetchFarmers();
    } catch (err: any) {
      alert('Error saving farmer: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const toggleFarmer = async (f: FarmerRow) => {
    if (!f.id) return;
    const newStatus = !f.active;
    setFarmers((prev) => prev.map((x) => (x.id === f.id ? { ...x, active: newStatus } : x)));
    try {
      const supabase = createClient();
      await supabase.from('farmers').update({ active: newStatus }).eq('id', f.id);
    } catch (e) { console.error(e); }
  };

  const deleteFarmer = async (f: FarmerRow) => {
    if (!f.id || !confirm(`Remove farmer "${f.name}"?`)) return;
    setFarmers((prev) => prev.filter((x) => x.id !== f.id));
    try {
      const supabase = createClient();
      await supabase.from('farmers').delete().eq('id', f.id);
    } catch (e) { console.error(e); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Sprout className="w-6 h-6 text-emerald-800" />
              <h1 className="text-2xl font-black text-slate-900">Farmer Partners</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage Telangana farmers who supply fresh vegetables to Easy Farm.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-2xl transition shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Farmer Partner
          </button>
        </div>

        {msg && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700" /> {msg}
          </div>
        )}

        {/* FORM */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-base font-black text-slate-900 mb-5">
              {editing ? `Edit ${editing.name}` : 'Register New Farmer Partner'}
            </h2>
            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Farmer Full Name *</label>
                <input type="text" required placeholder="e.g. Ranga Reddy" value={fName} onChange={(e) => setFName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                <input type="tel" required placeholder="9849012345" value={fPhone} onChange={(e) => setFPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Village *</label>
                <input type="text" required placeholder="e.g. Chevella" value={fVillage} onChange={(e) => setFVillage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
                <select value={fDistrict} onChange={(e) => setFDistrict(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                  <option>Rangareddy</option>
                  <option>Vikarabad</option>
                  <option>Nalgonda</option>
                  <option>Medak</option>
                  <option>Sangareddy</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Crops / Description</label>
                <textarea rows={2} placeholder="e.g. Tomatoes, Brinjal, Bitter Gourd — naturally grown without pesticides" value={fDesc} onChange={(e) => setFDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition">
                  {saving ? 'Saving...' : editing ? 'Update Farmer' : 'Register Farmer Partner'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading farmer data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {farmers.map((f) => (
              <div
                key={f.id || f.name}
                className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col gap-3 transition-all ${f.active ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-900 font-black text-lg">
                    {f.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-slate-900">{f.name}</p>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${f.active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-600'}`}>
                      {f.active ? 'Active Partner' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {f.phone}</p>
                  <p className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {f.village}, {f.district} Dist., {f.state}</p>
                  {f.description && <p className="text-[11px] text-slate-500 leading-relaxed italic">&ldquo;{f.description}&rdquo;</p>}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <button onClick={() => openEdit(f)} className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => toggleFarmer(f)} className="text-emerald-800 hover:underline font-bold">
                    {f.active ? 'Deactivate' : 'Activate'}
                  </button>
                  {f.id && (
                    <button onClick={() => deleteFarmer(f)} className="text-red-600 hover:underline font-bold flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
