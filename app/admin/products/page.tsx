'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Sprout, Plus, Edit3, Trash2, CheckCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Product } from '@/types/database';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('30');
  const [active, setActive] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (data && data.length > 0) {
        setProducts(data);
      } else {
        setProducts([
          { id: 'p-01', name: 'Country Red Tomatoes', slug: 'tomatoes', price: 30, unit: 'kg', active: true, created_at: '', updated_at: '' },
          { id: 'p-02', name: 'Fresh Potatoes', slug: 'potatoes', price: 25, unit: 'kg', active: true, created_at: '', updated_at: '' },
          { id: 'p-03', name: 'Telangana Red Onions', slug: 'onions', price: 35, unit: 'kg', active: true, created_at: '', updated_at: '' },
          { id: 'p-04', name: 'Fresh Palak (Spinach)', slug: 'spinach', price: 20, unit: 'Bunch', active: true, created_at: '', updated_at: '' },
          { id: 'p-05', name: 'Purple Brinjal', slug: 'brinjal', price: 40, unit: 'kg', active: true, created_at: '', updated_at: '' },
          { id: 'p-06', name: 'Organic Carrots', slug: 'carrots', price: 45, unit: 'kg', active: true, created_at: '', updated_at: '' },
          { id: 'p-07', name: 'French Beans', slug: 'beans', price: 50, unit: 'kg', active: true, created_at: '', updated_at: '' },
          { id: 'p-08', name: 'Green Chillies & Ginger', slug: 'chillies-ginger', price: 15, unit: 'g', active: true, created_at: '', updated_at: '' },
        ]);
      }
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setUnit('kg');
    setPrice('30');
    setActive(true);
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setUnit(p.unit);
    setPrice(String(p.price));
    setActive(p.active);
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSaving(true);
    setMsg(null);

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const numPrice = Number(price) || 0;

    try {
      const supabase = createClient();
      if (editingProduct && !editingProduct.id.startsWith('p-')) {
        await supabase
          .from('products')
          .update({ name, slug, unit, price: numPrice, active, updated_at: new Date().toISOString() })
          .eq('id', editingProduct.id);
      } else {
        await supabase.from('products').insert({
          name,
          slug,
          unit,
          price: numPrice,
          active,
        });
      }

      setMsg(`Product '${name}' saved to catalog.`);
      setShowModal(false);
      fetchProducts();
    } catch (err: any) {
      alert('Failed to save product: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete product '${p.name}' from catalog?`)) return;

    setProducts(products.filter((item) => item.id !== p.id));
    try {
      const supabase = createClient();
      if (!p.id.startsWith('p-')) {
        await supabase.from('products').delete().eq('id', p.id);
      }
      setMsg(`Deleted '${p.name}'`);
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Sprout className="w-6 h-6 text-emerald-800" />
              <h1 className="text-2xl font-black text-slate-900">Master Product Catalog</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage individual vegetable & produce items used to assemble weekly baskets.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-2xl transition shadow-md flex items-center gap-2 shrink-0 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Add Master Product
          </button>
        </div>

        {msg && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 font-semibold space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
            <p>Loading master product catalog...</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Product Name</th>
                    <th className="pb-3">Unit</th>
                    <th className="pb-3">Base Unit Price</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3.5 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3.5 font-medium text-slate-600">{p.unit}</td>
                      <td className="py-3.5 font-black text-slate-900">₹{p.price}</td>
                      <td className="py-3.5">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            p.active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {p.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-600 hover:text-emerald-800 rounded-lg hover:bg-slate-100 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-black text-slate-900">
                  {editingProduct ? `Edit ${editingProduct.name}` : 'Add Master Product'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 font-bold text-sm">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Purple Brinjal"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Measurement Unit *</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="kg">kg (Kilogram)</option>
                      <option value="g">g (Gram)</option>
                      <option value="Bunch">Bunch</option>
                      <option value="pcs">pcs (Pieces)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Unit Price (₹)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-md"
                  >
                    {saving ? 'Saving...' : 'Save Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
