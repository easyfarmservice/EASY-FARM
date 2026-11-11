'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Sprout,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  RefreshCw,
  Search,
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Sparkles,
  Link as LinkIcon,
  Filter,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Product } from '@/types/database';

const PRESET_VEGETABLE_IMAGES = [
  { name: 'Tomato', url: '/images/vegetables/tomato.jpg' },
  { name: 'Potato', url: '/images/vegetables/potato.jpg' },
  { name: 'Onion', url: '/images/vegetables/onion.jpg' },
  { name: 'Palak (Spinach)', url: '/images/vegetables/palak.jpg' },
  { name: 'Carrot', url: '/images/vegetables/carrot.jpg' },
  { name: 'French Beans', url: '/images/vegetables/beans.jpg' },
  { name: 'Brinjal', url: '/images/vegetables/brinjal.jpg' },
  { name: 'Capsicum', url: '/images/vegetables/capsicum.jpg' },
  { name: 'Green Chilli', url: '/images/vegetables/green-chilli.jpg' },
  { name: 'Cauliflower', url: '/images/vegetables/cauliflower.jpg' },
  { name: 'Coriander', url: '/images/vegetables/coriander.jpg' },
  { name: 'Cucumber', url: '/images/vegetables/cucumber.jpg' },
  { name: 'Curry Leaves', url: '/images/vegetables/curry-leaves.jpg' },
  { name: 'Bhindi (Okra)', url: '/images/vegetables/bhindi.jpg' },
  { name: 'Bottle Gourd', url: '/images/vegetables/bottle-gourd.jpg' },
  { name: 'Ridge Gourd', url: '/images/vegetables/ridge-gourd.jpg' },
  { name: 'Beetroot', url: '/images/vegetables/beetroot.jpg' },
  { name: 'Thotakura', url: '/images/vegetables/thotakura.jpg' },
  { name: 'Mushroom', url: '/images/vegetables/mushroom.jpg' },
  { name: 'Sweet Corn', url: '/images/vegetables/sweet-corn.jpg' },
  { name: 'Broccoli', url: '/images/vegetables/broccoli.jpg' },
  { name: 'Green Peas', url: '/images/vegetables/green-peas.jpg' },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('30');
  const [imageUrl, setImageUrl] = useState('');
  const [active, setActive] = useState(true);
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [isSwapEligible, setIsSwapEligible] = useState(true);

  // Image selection mode: 'upload' | 'preset' | 'url'
  const [imageMode, setImageMode] = useState<'upload' | 'preset' | 'url'>('upload');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.products) && data.products.length > 0) {
        setProducts(data.products);
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
    setDescription('');
    setUnit('kg');
    setPrice('35');
    setImageUrl('/images/vegetables/tomato.jpg');
    setActive(true);
    setIsSeasonal(false);
    setIsSwapEligible(true);
    setImageMode('upload');
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description || '');
    setUnit(p.unit);
    setPrice(String(p.price));
    setImageUrl(p.image_url || '');
    setActive(p.active);
    setIsSeasonal(Boolean(p.is_seasonal));
    setIsSwapEligible(p.is_swap_eligible !== false);
    setImageMode('upload');
    setShowModal(true);
  };

  // Image file upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }

    setUploadingImage(true);
    setMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/products/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setImageUrl(data.url);
      setMsg({ type: 'success', text: 'Picture uploaded and attached successfully!' });
    } catch (err: any) {
      alert(`Image upload error: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setMsg(null);

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const numPrice = Number(price) || 0;
    const finalImageUrl = imageUrl.trim() || '/images/vegetables/tomato.jpg';

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct?.id,
          name: name.trim(),
          slug,
          description: description.trim(),
          unit,
          price: numPrice,
          image_url: finalImageUrl,
          active,
          is_seasonal: isSeasonal,
          is_swap_eligible: isSwapEligible,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save product');
      }

      setMsg({ type: 'success', text: `Product '${name}' and its picture were saved to the catalog.` });
      setShowModal(false);
      await fetchProducts();
    } catch (err: any) {
      alert('Failed to save product: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkStatusUpdate = async (ids: string[], nextActive: boolean, label?: string) => {
    if (ids.length === 0) return;
    setBulkProcessing(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, active: nextActive }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
        setSelectedIds([]);
        setMsg({
          type: 'success',
          text:
            label ||
            `${nextActive ? 'Enabled' : 'Disabled'} ${data.updatedCount} vegetable item(s) across the store.`,
        });
      }
    } catch (e: any) {
      console.error('Bulk status update error:', e);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleToggleActive = async (p: Product) => {
    const updatedStatus = !p.active;
    await handleBulkStatusUpdate(
      [p.id],
      updatedStatus,
      `Product '${p.name}' is now ${updatedStatus ? 'Enabled (Active)' : 'Disabled'}.`
    );
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Are you sure you want to delete '${p.name}' from the catalog?`)) return;

    setProducts(products.filter((item) => item.id !== p.id));
    try {
      await fetch(`/api/admin/products?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
      setMsg({ type: 'success', text: `Deleted '${p.name}' from catalog.` });
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterActive === 'all' ||
      (filterActive === 'active' && p.active) ||
      (filterActive === 'inactive' && !p.active);

    return matchesSearch && matchesStatus;
  });

  const activeCount = products.filter((p) => p.active).length;
  const seasonalCount = products.filter((p) => p.is_seasonal).length;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-xs shrink-0">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Master Product Catalog
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Add, manage, and attach pictures of farm produce for weekly vegetable boxes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchProducts}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              title="Refresh Catalog"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product &amp; Photo</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {msg && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border shadow-xs animate-in fade-in duration-200 ${
              msg.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{msg.text}</span>
            </div>
            <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-700 ml-4">
              ✕
            </button>
          </div>
        )}

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Products</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{products.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Vegetables in catalog database</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Harvest Crops</span>
            <p className="text-2xl font-black text-emerald-800 mt-1">{activeCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Available for customer selection</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Seasonal Items</span>
            <p className="text-2xl font-black text-amber-600 mt-1">{seasonalCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Subject to local weather cycles</p>
          </div>
        </div>

        {/* 1-CLICK ENABLE / DISABLE ALL ITEMS AT ONCE BANNER */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                Global Produce Availability Access
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-emerald-100">
                {activeCount} / {products.length} Enabled
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 mt-1">
              Enable or disable all vegetable items at once for customer Custom Box &amp; Basket selection, or toggle individual items below.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                handleBulkStatusUpdate(
                  ['ALL'],
                  true,
                  `All ${products.length} vegetable items are now Enabled for customers to purchase!`
                )
              }
              disabled={bulkProcessing || products.length === 0}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Enable All Items at Once ({products.length})</span>
            </button>
            <button
              type="button"
              onClick={() =>
                handleBulkStatusUpdate(
                  ['ALL'],
                  false,
                  `All ${products.length} vegetable items have been Disabled.`
                )
              }
              disabled={bulkProcessing || products.length === 0}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              <span>Disable All Items</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vegetable name or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setFilterActive('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterActive === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                All ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterActive('active')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterActive === 'active' ? 'bg-white text-emerald-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterActive('inactive')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterActive === 'inactive' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Disabled ({products.length - activeCount})
              </button>
            </div>
          </div>
        </div>

        {/* MULTI-SELECT BULK BAR */}
        {selectedIds.length > 0 && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-950 bg-emerald-200/80 px-2.5 py-1 rounded-lg">
                {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
              </span>
              <span className="text-slate-600 font-medium">Apply status to selected items:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkStatusUpdate(selectedIds, true)}
                disabled={bulkProcessing}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold transition"
              >
                Enable Selected
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatusUpdate(selectedIds, false)}
                disabled={bulkProcessing}
                className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold transition"
              >
                Disable Selected
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 font-semibold"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* PRODUCTS TABLE */}
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500 font-semibold space-y-2 bg-white rounded-3xl border border-slate-200 shadow-xs">
            <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
            <p>Loading master product catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-3 bg-white rounded-3xl border border-slate-200 shadow-xs">
            <Sprout className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No products found</p>
            <p className="text-slate-500 max-w-sm mx-auto">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Click "Add New Product & Photo" to add your first vegetable item.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto scrollbar-none no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredProducts.length > 0 &&
                          selectedIds.length === filteredProducts.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded accent-emerald-700 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4">Item &amp; Picture</th>
                    <th className="py-3.5 px-4">Unit</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Badges</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredProducts.map((p) => {
                    const fallbackImg = '/images/vegetables/tomato.jpg';
                    const displayImg = p.image_url || fallbackImg;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(p.id)}
                            onChange={() => toggleSelectOne(p.id)}
                            className="rounded accent-emerald-700 cursor-pointer"
                          />
                        </td>
                        {/* ITEM & PICTURE */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative shrink-0 shadow-2xs">
                              <Image
                                src={displayImg}
                                alt={p.name}
                                fill
                                sizes="48px"
                                className="object-cover"
                                onError={(e: any) => {
                                  // Fallback to placeholder if broken link
                                  e.currentTarget.src = fallbackImg;
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-sm truncate">{p.name}</p>
                              {p.description && (
                                <p className="text-[11px] text-slate-500 truncate max-w-xs">{p.description}</p>
                              )}
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">slug: {p.slug}</p>
                            </div>
                          </div>
                        </td>

                        {/* UNIT */}
                        <td className="py-3 px-4 font-semibold text-slate-600">
                          per <span className="text-slate-900 font-bold">{p.unit}</span>
                        </td>

                        {/* PRICE */}
                        <td className="py-3 px-4">
                          <span className="font-black text-slate-900 text-sm">₹{p.price}</span>
                        </td>

                        {/* BADGES */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {p.is_seasonal && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-900">
                                Seasonal
                              </span>
                            )}
                            {p.is_swap_eligible && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                Swap Eligible
                              </span>
                            )}
                          </div>
                        </td>

                        {/* STATUS TOGGLE */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(p)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition ${
                              p.active
                                ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                            title="Click to toggle active status"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                p.active ? 'bg-emerald-600' : 'bg-slate-400'
                              }`}
                            />
                            <span>{p.active ? 'Active' : 'Disabled'}</span>
                          </button>
                        </td>

                        {/* ACTIONS */}
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-2 text-slate-600 hover:text-emerald-800 rounded-xl hover:bg-emerald-50 transition border border-transparent hover:border-emerald-200"
                            title="Edit Product & Picture"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-2 text-rose-600 hover:text-rose-800 rounded-xl hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ADD / EDIT PRODUCT MODAL ───────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Sprout className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {editingProduct ? `Edit '${editingProduct.name}'` : 'Add New Produce Item'}
                    </h3>
                    <p className="text-[11px] text-slate-400">Attach photo, pricing, and harvest parameters</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4">
                {/* 1. PRODUCT NAME */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Country Red Tomatoes"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* 2. DESCRIPTION */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Short Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Freshly plucked local tomatoes from Chevella farms"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* 3. PICTURE OF THE ITEM SECTION */}
                <div className="border border-emerald-100 bg-emerald-50/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                      Picture of the Item
                    </label>
                    <span className="text-[10px] text-slate-500">Live preview &amp; upload</span>
                  </div>

                  <div className="flex items-start gap-4">
                    {/* Live Thumbnail Preview */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-slate-200 overflow-hidden relative shrink-0 shadow-sm flex items-center justify-center">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt="Product preview"
                          fill
                          sizes="96px"
                          className="object-cover"
                          onError={(e: any) => {
                            e.currentTarget.src = '/images/vegetables/tomato.jpg';
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      )}
                    </div>

                    {/* Image Source Mode Buttons */}
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setImageMode('upload')}
                          className={`flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 ${
                            imageMode === 'upload' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload File</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageMode('preset')}
                          className={`flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 ${
                            imageMode === 'preset' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Gallery</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageMode('url')}
                          className={`flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 ${
                            imageMode === 'url' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span>Link URL</span>
                        </button>
                      </div>

                      {/* MODE 1: FILE UPLOAD */}
                      {imageMode === 'upload' && (
                        <div>
                          <label className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white cursor-pointer transition text-xs font-bold text-emerald-800 shadow-2xs">
                            <Upload className={`w-4 h-4 ${uploadingImage ? 'animate-bounce' : ''}`} />
                            <span>{uploadingImage ? 'Uploading image...' : 'Choose JPG / PNG from device'}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={uploadingImage}
                              onChange={handleFileUpload}
                            />
                          </label>
                          <p className="text-[10px] text-slate-400 mt-1">Upload high-res crop photo (&lt; 5MB).</p>
                        </div>
                      )}

                      {/* MODE 2: GALLERY PRESET SELECTION */}
                      {imageMode === 'preset' && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-slate-500">
                            Select standard Telangana harvest photo:
                          </p>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200">
                            {PRESET_VEGETABLE_IMAGES.map((preset) => (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => setImageUrl(preset.url)}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                                  imageUrl === preset.url
                                    ? 'border-emerald-600 ring-2 ring-emerald-300'
                                    : 'border-transparent hover:border-slate-300'
                                }`}
                                title={preset.name}
                              >
                                <Image
                                  src={preset.url}
                                  alt={preset.name}
                                  fill
                                  sizes="36px"
                                  className="object-cover"
                                />
                                {imageUrl === preset.url && (
                                  <div className="absolute inset-0 bg-emerald-900/40 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* MODE 3: DIRECT IMAGE URL */}
                      {imageMode === 'url' && (
                        <div>
                          <input
                            type="text"
                            placeholder="https://example.com/vegetables/carrot.jpg"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. UNIT & PRICE */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Measurement Unit *</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="kg">kg (Kilogram)</option>
                      <option value="g">g (Gram - e.g. 100g, 250g)</option>
                      <option value="Bunch">Bunch (Leafy Greens)</option>
                      <option value="pcs">pcs (Pieces)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Base Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 5. TOGGLES: ACTIVE, SEASONAL, SWAP ELIGIBLE */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-500"
                    />
                    <span>Active in Product Catalog (Customers can view/order)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={isSeasonal}
                      onChange={(e) => setIsSeasonal(e.target.checked)}
                      className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-500"
                    />
                    <span>Seasonal Harvest Crop (Subject to seasonal climate availability)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={isSwapEligible}
                      onChange={(e) => setIsSwapEligible(e.target.checked)}
                      className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-500"
                    />
                    <span>Eligible for Staple Box Swapping</span>
                  </label>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploadingImage}
                    className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-md disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingProduct ? 'Save Product & Photo' : 'Add to Catalog'}
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
