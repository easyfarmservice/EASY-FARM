'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { MapPin, RefreshCw, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  pincode: string;
  locality: string;
  apartment?: string;
  created_at: string;
}

export default function AdminWaitlistPage() {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWaitlist = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWaitlist(data || []);
    } catch (err) {
      console.error('Error fetching waitlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlist();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Waitlist Expansion Analytics</h1>
            <p className="text-xs text-slate-500 mt-1">Demand requests from areas beyond current delivery corridors.</p>
          </div>
          <button
            onClick={fetchWaitlist}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-emerald-900 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Waitlist'}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          {loading ? (
            <div className="py-8">
              <EasyFarmLoader size="sm" text="Loading waitlist submissions..." />
            </div>
          ) : waitlist.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <p className="font-bold text-slate-700">No waitlist entries submitted yet</p>
              <p className="text-[11px] text-slate-400">Out-of-zone customer PIN code submissions will appear here in real-time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="pb-3">Customer Name</th>
                    <th className="pb-3">Contact</th>
                    <th className="pb-3">Locality / Area</th>
                    <th className="pb-3">PIN Code</th>
                    <th className="pb-3">Building / Apartment</th>
                    <th className="pb-3 text-right">Date Requested</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {waitlist.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="py-3 font-bold text-slate-900">{w.name}</td>
                      <td className="py-3">
                        <p className="font-medium text-slate-800">{w.email}</p>
                        <p className="text-[11px] text-slate-400">{w.phone}</p>
                      </td>
                      <td className="py-3 font-bold text-emerald-800 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                        {w.locality}
                      </td>
                      <td className="py-3 font-mono text-slate-600">{w.pincode}</td>
                      <td className="py-3 text-slate-500">{w.apartment || 'N/A'}</td>
                      <td className="py-3 text-right text-slate-500">
                        {new Date(w.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
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
