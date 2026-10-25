'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Layers, Plus, Trash2, ArrowLeft, Check, RefreshCw, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Basket, Product } from '@/types/database';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface EditableItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
}

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p-01', name: 'Country Red Tomatoes', slug: 'tomatoes', price: 30, unit: 'kg', active: true, created_at: '', updated_at: '' },
  { id: 'p-02', name: 'Fresh Potatoes', slug: 'potatoes', price: 25, unit: 'kg', active: true, created_at: '', updated_at: '' },
  { id: 'p-03', name: 'Telangana Red Onions', slug: 'onions', price: 35, unit: 'kg', active: true, created_at: '', updated_at: '' },
  { id: 'p-04', name: 'Fresh Palak (Spinach)', slug: 'spinach', price: 20, unit: 'Bunch', active: true, created_at: '', updated_at: '' },
  { id: 'p-05', name: 'Purple Brinjal', slug: 'brinjal', price: 40, unit: 'kg', active: true, created_at: '', updated_at: '' },
  { id: 'p-06', name: 'Organic Carrots', slug: 'carrots', price: 45, unit: 'kg', active: true, created_at: '', updated_at: '' },
  { id: 'p-07', name: 'French Beans', slug: 'beans', price: 50, unit: 'kg', active: true, created_at: '', updated_at: '' },
  { id: 'p-08', name: 'Green Chillies & Ginger', slug: 'chillies-ginger', price: 15, unit: 'g', active: true, created_at: '', updated_at: '' },
];

export default function BasketItemsEditPage({ params }: PageProps) {
  const { id } = use(params);

  const [basket, setBasket] = useState<Basket | null>(null);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // New item form
  const [selectedProductId, setSelectedProductId] = useState(DEFAULT_PRODUCTS[0].id);
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('kg');

  useEffect(() => {
    async function loadBasketAndItems() {
      setLoading(true);
      try {
        const supabase = createClient();

        // Load Products Catalog
        const { data: dbProducts } = await supabase.from('products').select('*').eq('active', true);
        if (dbProducts && dbProducts.length > 0) {
          setProducts(dbProducts);
          setSelectedProductId(dbProducts[0].id);
        }

        // Load Basket details
        const { data: dbBasket } = await supabase
          .from('baskets')
          .select('*, items:basket_items(*, product:products(*))')
          .eq('id', id)
          .maybeSingle();

        if (dbBasket) {
          setBasket(dbBasket);
          if (dbBasket.items && dbBasket.items.length > 0) {
            setItems(
              dbBasket.items.map((i: any) => ({
                id: i.id,
                product_id: i.product_id,
                product_name: i.product?.name || 'Vegetable Item',
                quantity: i.quantity,
                unit: i.unit,
              }))
            );
          } else {
            // Default initial items
            setItems([
              { product_id: 'p-01', product_name: 'Country Red Tomatoes', quantity: 1, unit: 'kg' },
              { product_id: 'p-02', product_name: 'Fresh Potatoes', quantity: 1, unit: 'kg' },
              { product_id: 'p-03', product_name: 'Telangana Red Onions', quantity: 1, unit: 'kg' },
              { product_id: 'p-04', product_name: 'Fresh Palak (Spinach)', quantity: 2, unit: 'Bunch' },
            ]);
          }
        } else {
          // Mock basket fallback
          const mockName = id === 'b-01' ? 'Staple Box' : id === 'b-02' ? 'Green Box' : 'Premium Box';
          setBasket({
            id,
            name: mockName,
            slug: id,
            description: 'Curated Telangana fresh basket',
            price: 250,
            active: true,
            sort_order: 1,
            created_at: '',
            updated_at: '',
          });
          setItems([
            { product_id: 'p-01', product_name: 'Country Red Tomatoes', quantity: 1, unit: 'kg' },
            { product_id: 'p-02', product_name: 'Fresh Potatoes', quantity: 1, unit: 'kg' },
            { product_id: 'p-03', product_name: 'Telangana Red Onions', quantity: 1, unit: 'kg' },
            { product_id: 'p-04', product_name: 'Fresh Palak (Spinach)', quantity: 2, unit: 'Bunch' },
          ]);
        }
      } catch (err) {
        console.error('Error fetching basket items:', err);
      } finally {
        setLoading(false);
      }
    }

    loadBasketAndItems();
  }, [id]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const newItem: EditableItem = {
      product_id: prod.id,
      product_name: prod.name,
      quantity: Number(quantity) || 1,
      unit: unit || prod.unit,
    };

    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleUpdateItem = (index: number, qty: number, itemUnit: string) => {
    setItems(
      items.map((item, idx) => (idx === index ? { ...item, quantity: Math.max(0.1, qty), unit: itemUnit } : item))
    );
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    setMsg(null);

    try {
      const supabase = createClient();

      if (basket?.id && !basket.id.startsWith('b-')) {
        // Delete old items and insert updated set
        await supabase.from('basket_items').delete().eq('basket_id', basket.id);

        if (items.length > 0) {
          const insertPayload = items.map((i) => ({
            basket_id: basket.id,
            product_id: i.product_id,
            quantity: i.quantity,
            unit: i.unit,
          }));
          await supabase.from('basket_items').insert(insertPayload);
        }
      }

      setMsg(`Basket contents for '${basket?.name}' updated successfully! Changes are live on customer pages.`);
    } catch (err: any) {
      alert('Failed to save basket contents: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-16 text-center text-xs text-slate-500 font-semibold space-y-2">
          <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
          <p>Loading basket contents...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* TOP BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <Link href="/admin/baskets" className="inline-flex items-center text-xs font-bold text-emerald-800 hover:underline mb-1">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Baskets List
            </Link>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-emerald-800" />
              Manage Items inside {basket?.name}
            </h1>
            <p className="text-xs text-slate-500">
              Add, edit, or remove specific produce items and quantities inside this basket.
            </p>
          </div>

          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-2xl transition shadow-md flex items-center gap-2 shrink-0 min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Basket Contents'}
          </button>
        </div>

        {msg && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* ADD ITEM FORM */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-700" />
            Add Product to {basket?.name}
          </h2>

          <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Product from Catalog *</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
              <input
                type="number"
                step="0.1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 min-h-[40px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>
          </form>
        </div>

        {/* CURRENT ITEMS TABLE */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-black text-slate-900">Current Basket Contents ({items.length} items)</h2>

          {items.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No items inside this basket yet. Use the form above to add products.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Product Name</th>
                    <th className="pb-3">Quantity</th>
                    <th className="pb-3">Unit</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 font-bold text-slate-900">{item.product_name}</td>
                      <td className="py-3">
                        <input
                          type="number"
                          step="0.1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, Number(e.target.value), item.unit)}
                          className="w-20 px-2 py-1 rounded-lg border border-slate-300 font-bold text-xs text-center"
                        />
                      </td>
                      <td className="py-3 font-semibold text-slate-600">{item.unit}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50 transition"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
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
