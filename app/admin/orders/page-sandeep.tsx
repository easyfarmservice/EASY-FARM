'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Search, Filter, RefreshCw, ShoppingBag, CheckCircle, Database } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AdminOrder {
  id: string;
  raw_id: string;
  customer_name: string;
  phone: string;
  location: string;
  basket_name: string;
  status: string;
  total: number;
  date: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Query Orders Table directly from Supabase Database
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          status,
          created_at,
          profiles(full_name, phone),
          customer_addresses(locality, apartment),
          order_items(basket_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders from Supabase:', error);
      }

      if (data && data.length > 0) {
        const dbOrders: AdminOrder[] = data.map((o: any) => ({
          id: `ORD-${o.id.slice(0, 6).toUpperCase()}`,
          raw_id: o.id,
          customer_name: o.profiles?.full_name || 'Registered Customer',
          phone: o.profiles?.phone || '+91 98490 12345',
          location: o.customer_addresses
            ? `${o.customer_addresses.apartment || ''} ${o.customer_addresses.locality}`.trim()
            : 'Ghatkesar & Pocharam',
          basket_name: o.order_items?.[0]?.basket_name || 'Weekly Harvest Basket',
          status: o.status || 'confirmed',
          total: Number(o.total || 0),
          date: new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        }));
        setOrders(dbOrders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Failed to query orders from database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.raw_id === orderId || o.id === orderId ? { ...o, status: newStatus } : o))
      );
      setUpdateMsg(`Order ${orderId} status updated in database to "${newStatus.replace('_', ' ')}"`);
      setTimeout(() => setUpdateMsg(null), 3000);
    } catch (err: any) {
      alert('Could not update status in database: ' + err.message);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-700" />
              <h1 className="text-2xl font-black text-slate-900">Database Orders Table (`orders`)</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">Live customer basket orders queried directly from your Supabase database table.</p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-emerald-900 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Querying...' : 'Fetch Live Database Orders'}
          </button>
        </div>

        {updateMsg && (
          <div className="p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold rounded-2xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-700" />
            <span>{updateMsg}</span>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search order ref, customer, building..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[38px]"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-slate-500">Status Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="packed">Packed</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              Querying `orders` table from database...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
              <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">0 orders found in Supabase database</p>
              <p className="text-[11px] text-slate-400">Customer checkout submissions stored in Supabase will be displayed here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="pb-3">Order Ref</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3">Basket</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Total</th>
                    <th className="pb-3 text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="py-3 font-bold text-slate-900">{o.id}</td>
                      <td className="py-3">
                        <p className="font-bold text-slate-900">{o.customer_name}</p>
                        <p className="text-[11px] text-slate-400">{o.phone}</p>
                      </td>
                      <td className="py-3 text-slate-600 max-w-[180px] truncate">{o.location}</td>
                      <td className="py-3 font-medium">{o.basket_name}</td>
                      <td className="py-3">
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] capitalize ${
                          o.status === 'delivered'
                            ? 'bg-blue-100 text-blue-900'
                            : o.status === 'out_for_delivery'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-950'
                        }`}>
                          {o.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-right text-slate-900">₹{o.total}</td>
                      <td className="py-3 text-right">
                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateStatus(o.raw_id, e.target.value)}
                          className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="packed">Mark Packed</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Mark Delivered</option>
                        </select>
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
