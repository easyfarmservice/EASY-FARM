'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { RefreshCw, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

interface InventoryRecord {
  id: string;
  product_name: string;
  unit: string;
  available_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          id,
          unit,
          available_quantity,
          reserved_quantity,
          low_stock_threshold,
          products(name)
        `);

      if (error) throw error;

      if (data) {
        const formatted: InventoryRecord[] = data.map((inv: any) => ({
          id: inv.id,
          product_name: inv.products?.name || 'Produce Item',
          unit: inv.unit || 'kg',
          available_quantity: Number(inv.available_quantity || 0),
          reserved_quantity: Number(inv.reserved_quantity || 0),
          low_stock_threshold: Number(inv.low_stock_threshold || 10),
        }));
        setItems(formatted);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Saturday Harvest Inventory Control</h1>
            <p className="text-xs text-slate-500 mt-1">Available produce stock capacity and committed weekly allocations.</p>
          </div>
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-emerald-900 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Stock'}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          {loading ? (
            <div className="py-8">
              <EasyFarmLoader size="sm" text="Loading inventory..." />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No inventory entries found in database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="pb-3">Product Name</th>
                    <th className="pb-3">Unit</th>
                    <th className="pb-3">Available Capacity</th>
                    <th className="pb-3">Reserved (Confirmed Orders)</th>
                    <th className="pb-3 text-right">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {items.map((item) => {
                    const isHigh = item.available_quantity <= item.low_stock_threshold;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 font-bold text-slate-900">{item.product_name}</td>
                        <td className="py-3 text-slate-500">{item.unit}</td>
                        <td className="py-3 font-medium">{item.available_quantity} {item.unit}</td>
                        <td className="py-3 font-bold text-emerald-800">{item.reserved_quantity} {item.unit} reserved</td>
                        <td className="py-3 text-right">
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            isHigh ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-950'
                          }`}>
                            {isHigh ? 'High Demand' : 'Optimal'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
