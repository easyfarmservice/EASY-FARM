'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Users, Search, RefreshCw, Mail, Phone, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CustomerRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
  order_count?: number;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, created_at')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        // Fetch order counts
        const enriched: CustomerRow[] = await Promise.all(
          data.map(async (c) => {
            const { count } = await supabase
              .from('orders')
              .select('*', { count: 'exact', head: true })
              .eq('customer_id', c.id);
            return { ...c, order_count: count ?? 0 };
          })
        );
        setCustomers(enriched);
      } else {
        // Demo fallback
        setCustomers([
          { id: '1', full_name: 'Ramesh Kumar', email: 'ramesh@example.com', phone: '9849012345', role: 'customer', created_at: new Date().toISOString(), order_count: 3 },
          { id: '2', full_name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210', role: 'customer', created_at: new Date().toISOString(), order_count: 1 },
        ]);
      }
    } catch (e) {
      console.error('Error loading customers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-800" />
              <h1 className="text-2xl font-black text-slate-900">Customer Base</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              View all registered customers, their contact details, and order activity.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 text-xs outline-none font-medium text-slate-700 bg-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading customer data...</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">{filtered.length} customers</span>
              <button onClick={fetchCustomers} className="text-xs text-emerald-800 font-bold hover:underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wide text-[10px]">
                    <th className="px-6 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Contact</th>
                    <th className="px-4 py-3 text-center">Orders</th>
                    <th className="px-4 py-3 text-left">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-semibold text-xs">
                        No customers found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-900 font-black text-xs">
                              {c.full_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{c.full_name || 'Unknown'}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{c.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-0.5">
                            <p className="flex items-center gap-1 text-slate-600">
                              <Mail className="w-3 h-3 shrink-0" /> {c.email}
                            </p>
                            <p className="flex items-center gap-1 text-slate-500">
                              <Phone className="w-3 h-3 shrink-0" /> {c.phone}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 font-bold px-2.5 py-0.5 rounded-full">
                            <ShoppingBag className="w-3 h-3" /> {c.order_count ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-500 font-mono text-[10px]">
                          {new Date(c.created_at).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
