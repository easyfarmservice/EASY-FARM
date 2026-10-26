'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Gift,
  Coins,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Package,
  Users,
  ShieldCheck,
  RefreshCw,
  Save,
  ChevronRight,
  Filter,
  DollarSign,
  Truck,
  X,
  Upload,
  Archive,
  CheckSquare,
  Square,
  ImageIcon,
  ArrowUpDown,
  Tag,
  Boxes,
} from 'lucide-react';
import {
  EasyCoinsSettings,
  RewardProduct,
  RewardCategory,
  RewardClaim,
  EasyCoinsLedgerEntry,
} from '@/types/easy-coins';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

export default function AdminEasyCoinsPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'settings' | 'customers' | 'fulfillment' | 'analytics'>('catalog');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Settings State
  const [settings, setSettings] = useState<EasyCoinsSettings>({
    id: 'default-settings',
    is_enabled: true,
    earn_rate_per_100_inr: 10,
    min_qualifying_order: 100,
    max_rewards_per_order: 1,
    coin_expiry_days: 365,
    bonus_first_order_coins: 20,
    bonus_repeat_order_coins: 0,
    allow_promotions: true,
  });

  // Catalog State
  const [categories, setCategories] = useState<RewardCategory[]>([]);
  const [products, setProducts] = useState<RewardProduct[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'archived'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [sortOption, setSortOption] = useState<'coin_asc' | 'coin_desc' | 'name_asc'>('coin_asc');

  // Bulk Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showBulkStockModal, setShowBulkStockModal] = useState(false);
  const [bulkStockValue, setBulkStockValue] = useState<number>(50);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Product Modal & Image Upload State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<RewardProduct> | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fulfillment State
  const [claims, setClaims] = useState<any[]>([]);
  const [claimStatusFilter, setClaimStatusFilter] = useState('all');

  // Analytics State
  const [analytics, setAnalytics] = useState<any>(null);

  // Customer Management State
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerResult, setCustomerResult] = useState<any>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number>(50);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // 1. Data Loader
  const loadAllData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [settRes, catRes, claimRes, anaRes] = await Promise.all([
        fetch('/api/admin/easy-coins/settings').then((r) => r.json()),
        fetch('/api/admin/easy-coins/products').then((r) => r.json()),
        fetch('/api/admin/easy-coins/claims').then((r) => r.json()),
        fetch('/api/admin/easy-coins/analytics').then((r) => r.json()),
      ]);

      if (settRes.success) setSettings(settRes.settings);
      if (catRes.success) {
        setCategories(catRes.categories || []);
        setProducts(catRes.products || []);
      }
      if (claimRes.success) setClaims(claimRes.claims || []);
      if (anaRes.success) setAnalytics(anaRes);
    } catch (err: any) {
      console.error('Failed to load Easy Coins admin data:', err);
      setFeedback({ type: 'error', message: 'Failed to load initial data. Using persistent catalog.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // 2. Image Upload Handler (Connects to /api/admin/easy-coins/upload -> Supabase Storage reward-products)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Product images must be under 5MB.');
      return;
    }

    // Validate MIME
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Invalid file format. Only JPG, PNG, and WebP are supported.');
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server and Supabase storage
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/easy-coins/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.url) {
        setEditingProduct((prev) => ({
          ...prev,
          image_url: data.url,
        }));
        setImagePreview(data.url);
        setFeedback({ type: 'success', message: 'Image uploaded and linked successfully!' });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err: any) {
      alert(err.message || 'Image upload failed. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // 3. Save Settings Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/easy-coins/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setFeedback({ type: 'success', message: 'Program rules & configuration saved successfully!' });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save program settings.' });
    } finally {
      setSaving(false);
    }
  };

  // 4. Save Product Handler
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.package_size) {
      alert('Please fill in Product Name and Package Size.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/easy-coins/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct),
      });
      const data = await res.json();
      if (data.success) {
        setShowProductModal(false);
        setEditingProduct(null);
        setImagePreview(null);
        await loadAllData();
        setFeedback({ type: 'success', message: `Product "${data.product.name}" updated in catalog successfully!` });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  // 5. Delete or Archive Product Handler
  const handleDeleteOrArchiveProduct = async (product: RewardProduct) => {
    const confirmMsg = `Are you sure you want to remove "${product.name}" from the active catalog? If it has historical order claims, it will be safely archived to protect order records.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/easy-coins/products?id=${product.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
        setFeedback({
          type: 'success',
          message: data.message || `Product ${data.archived ? 'safely archived' : 'removed'} successfully.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove product.');
    }
  };

  // 6. Bulk Operations Handlers
  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'update_stock', stock_quantity?: number) => {
    if (selectedProductIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const res = await fetch('/api/admin/easy-coins/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedProductIds,
          action,
          stock_quantity,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowBulkStockModal(false);
        setSelectedProductIds([]);
        await loadAllData();
        setFeedback({
          type: 'success',
          message: `Bulk update applied to ${data.updatedCount} products successfully!`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || 'Bulk operation failed.');
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 7. Customer Search Handler
  const handleSearchCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerSearchQuery.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/easy-coins/balance?customerId=${encodeURIComponent(customerSearchQuery.trim())}`);
      const data = await res.json();
      if (data.success) {
        setCustomerResult(data);
      } else {
        setCustomerResult(null);
        alert('No matching customer profile found.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 8. Manual Adjustment Handler
  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustReason || adjustReason.trim().length < 5) {
      alert('A detailed audit reason (at least 5 characters) is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/easy-coins/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerResult?.customerId || customerSearchQuery,
          amount: adjustAmount,
          reason: adjustReason,
          adminEmail: 'admin@easyfarm.in',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAdjustModal(false);
        setAdjustReason('');
        const refreshed = await fetch(`/api/easy-coins/balance?customerId=${customerResult?.customerId || customerSearchQuery}`).then((r) => r.json());
        if (refreshed.success) setCustomerResult(refreshed);
        setFeedback({ type: 'success', message: 'Manual coin adjustment recorded to audit ledger.' });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to adjust balance.');
    } finally {
      setSaving(false);
    }
  };

  // 9. Update Claim Status Handler
  const handleUpdateClaimStatus = async (claimId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/easy-coins/claims', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setClaims((prev) =>
          prev.map((c) => (c.id === claimId ? { ...c, claim_status: status } : c))
        );
      }
    } catch (err) {
      console.error('Failed to update claim status:', err);
    }
  };

  // Filtered & Sorted Products
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchSearch =
      !catalogSearch ||
      p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.brand?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(catalogSearch.toLowerCase());

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.is_active && !p.is_archived) ||
      (statusFilter === 'inactive' && !p.is_active && !p.is_archived) ||
      (statusFilter === 'archived' && p.is_archived);

    const matchStock =
      stockFilter === 'all' ||
      (stockFilter === 'in_stock' && p.stock_quantity > 0) ||
      (stockFilter === 'out_of_stock' && p.stock_quantity <= 0);

    return matchCat && matchSearch && matchStatus && matchStock;
  }).sort((a, b) => {
    if (sortOption === 'coin_desc') return b.coin_cost - a.coin_cost;
    if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
    return a.coin_cost - b.coin_cost;
  });

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-emerald-950 font-black shadow-lg shadow-amber-500/20">
              <Gift className="w-6 h-6 text-emerald-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Easy Coins &amp; Rewards Management
                </h1>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    settings.is_enabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {settings.is_enabled ? 'Program Live' : 'Program Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage physical essentials catalog, upload images to Supabase storage, monitor stock, customer balances, and packing fulfillment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-800 hover:bg-slate-50 transition"
              title="Refresh all data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                setImagePreview(null);
                setEditingProduct({
                  name: '',
                  brand: 'Easy Farm',
                  category_id: categories[0]?.id || 'cat-1',
                  package_size: '1 Unit',
                  coin_cost: 30,
                  stock_quantity: 50,
                  cost_price_inr: 25.0,
                  supplier_name: 'Wholesale Depot',
                  image_url: '/images/rewards/neem-comb.jpg',
                  is_active: true,
                  availability_status: 'available',
                  sku: '',
                  bundle_components: [],
                  min_order_value: 0,
                  max_claims_per_customer: 2,
                });
                setShowProductModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Reward Product</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SEGMENTED NAVIGATION TABS */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded-2xl overflow-x-auto shadow-xs">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'catalog'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Reward Products ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('fulfillment')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'fulfillment'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Fulfillment Queue ({claims.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'customers'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer Balances</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Program Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Analytics &amp; Liabilities</span>
          </button>
        </div>

        {/* ── TAB 1: REWARD CATALOG ────────────────────────────────────────── */}
        {activeTab === 'catalog' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            {/* Filter toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 border-b border-slate-100 pb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search name, brand, SKU..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
                >
                  <option value="all">All Categories ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive / Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
                >
                  <option value="all">All Stock Levels</option>
                  <option value="in_stock">In Stock (&gt;0)</option>
                  <option value="out_of_stock">Out of Stock (0)</option>
                </select>
              </div>

              <div>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
                >
                  <option value="coin_asc">Coin Cost: Low to High</option>
                  <option value="coin_desc">Coin Cost: High to Low</option>
                  <option value="name_asc">Product Name: A to Z</option>
                </select>
              </div>
            </div>

            {/* BULK ACTIONS BAR */}
            {selectedProductIds.length > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-950 bg-emerald-200/80 px-2.5 py-1 rounded-lg">
                    {selectedProductIds.length} item{selectedProductIds.length > 1 ? 's' : ''} selected
                  </span>
                  <span className="text-slate-500">Perform batch operations across catalog:</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBulkAction('activate')}
                    disabled={bulkProcessing}
                    className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white font-bold hover:bg-emerald-900 transition"
                  >
                    Activate Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkAction('deactivate')}
                    disabled={bulkProcessing}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-800 transition"
                  >
                    Deactivate Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkStockModal(true)}
                    disabled={bulkProcessing}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 transition"
                  >
                    Update Stock Quantity
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProductIds([])}
                    className="px-2 py-1.5 text-slate-500 hover:text-slate-800"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={
                          filteredProducts.length > 0 &&
                          selectedProductIds.length === filteredProducts.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded accent-emerald-700"
                      />
                    </th>
                    <th className="py-3 px-3">Product &amp; Brand</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Package Size</th>
                    <th className="py-3 px-3 text-right">Coin Cost</th>
                    <th className="py-3 px-3 text-right">Available Stock</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No reward products match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(prod.id)}
                            onChange={() => toggleSelectProduct(prod.id)}
                            className="rounded accent-emerald-700"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative shrink-0">
                              <Image
                                src={prod.image_url || '/images/rewards/neem-comb.jpg'}
                                alt={prod.name}
                                fill
                                sizes="44px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{prod.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {prod.brand || 'Easy Farm'}
                                </span>
                                {prod.sku && (
                                  <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 rounded">
                                    {prod.sku}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {prod.category_name || 'Essentials'}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {prod.package_size}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-amber-700 text-sm">
                          🪙 {prod.coin_cost}
                        </td>
                        <td className="py-3 px-3 text-right font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-md ${
                              prod.stock_quantity === 0
                                ? 'bg-rose-100 text-rose-800'
                                : prod.stock_quantity < 15
                                ? 'bg-amber-100 text-amber-800'
                                : 'text-slate-800'
                            }`}
                          >
                            {prod.stock_quantity}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {prod.is_archived ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                              Archived
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                prod.is_active
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {prod.is_active ? 'Active' : 'Inactive (Draft)'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setImagePreview(prod.image_url || null);
                                setEditingProduct({ ...prod });
                                setShowProductModal(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-600 hover:text-emerald-800 text-slate-700 font-bold text-xs transition"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrArchiveProduct(prod)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:border-rose-400 hover:text-rose-600 text-slate-400 transition"
                              title="Archive or safely delete product"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: FULFILLMENT QUEUE ─────────────────────────────────────── */}
        {activeTab === 'fulfillment' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Physical Reward Claims Fulfillment
                </h3>
                <p className="text-xs text-slate-500">
                  Track rewards claimed alongside weekly vegetable orders to pack in Sunday delivery boxes.
                </p>
              </div>

              <select
                value={claimStatusFilter}
                onChange={(e) => setClaimStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="reserved">Reserved</option>
                <option value="confirmed">Confirmed</option>
                <option value="packed">Packed</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {claims.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No physical reward claims found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-3 px-3">Order Ref</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Reward Item</th>
                      <th className="py-3 px-3">Coin Cost</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Update Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {claims
                      .filter((c) => claimStatusFilter === 'all' || c.claim_status === claimStatusFilter)
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            #{c.order_id?.slice(-8) || 'N/A'}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">{c.customer_name || 'Resident'}</p>
                            <p className="text-[10px] text-slate-400">{c.customer_phone || c.customer_email}</p>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">{c.reward_name_snapshot}</p>
                            <p className="text-[10px] text-slate-500">{c.package_size_snapshot}</p>
                          </td>
                          <td className="py-3 px-3 font-bold text-amber-800">
                            🪙 {c.coin_cost_snapshot} Coins
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                c.claim_status === 'delivered'
                                  ? 'bg-emerald-700 text-white'
                                  : c.claim_status === 'packed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : c.claim_status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.claim_status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {c.claim_status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <select
                              value={c.claim_status}
                              onChange={(e) => handleUpdateClaimStatus(c.id, e.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                            >
                              <option value="reserved">Reserved</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="packed">Packed</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: CUSTOMER BALANCES & ADJUSTMENTS ────────────────────────── */}
        {activeTab === 'customers' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-900">
                Customer Easy Coins Management &amp; Audit
              </h3>
              <p className="text-xs text-slate-500">
                Search customers by Profile ID or Email to inspect balances and perform audited manual adjustments.
              </p>
            </div>

            <form onSubmit={handleSearchCustomer} className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Enter Customer Profile ID or Email..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition"
              >
                Search
              </button>
            </form>

            {customerResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      Customer: {customerResult.customerId}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Available Balance:{' '}
                      <strong className="text-emerald-800 text-sm font-black">
                        {customerResult.available_balance} Easy Coins
                      </strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs transition shadow-sm"
                  >
                    Adjust Balance
                  </button>
                </div>

                <h5 className="text-xs font-bold text-slate-700">Recent Customer Transactions:</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                        <th className="py-2 px-2">Date</th>
                        <th className="py-2 px-2">Description</th>
                        <th className="py-2 px-2">Type</th>
                        <th className="py-2 px-2 text-right">Delta</th>
                        <th className="py-2 px-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(customerResult.recent_transactions || []).map((t: any) => (
                        <tr key={t.id}>
                          <td className="py-2 px-2 text-slate-500">
                            {new Date(t.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-2 font-medium text-slate-800">{t.description}</td>
                          <td className="py-2 px-2 text-[10px] font-bold text-slate-600">
                            {t.transaction_type}
                          </td>
                          <td className={`py-2 px-2 text-right font-black ${t.amount > 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                            {t.amount > 0 ? `+${t.amount}` : t.amount}
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-slate-800">
                            {t.balance_after}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: PROGRAM RULES & SETTINGS ──────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-900">
                Easy Coins Program Configuration
              </h3>
              <p className="text-xs text-slate-500">
                Define the loyalty coin generation algorithm, minimum qualifying order values, and redemption boundaries.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5 max-w-2xl">
              <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <input
                  type="checkbox"
                  id="prog_active"
                  checked={settings.is_enabled}
                  onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
                  className="w-4 h-4 text-emerald-800 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="prog_active" className="text-xs font-bold text-slate-900">
                  Enable Easy Coins Loyalty Program (Customers earn and redeem coins)
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Earn Rate (Coins per ₹100 Order)</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.earn_rate_per_100_inr}
                    onChange={(e) => setSettings({ ...settings, earn_rate_per_100_inr: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Default: 10 coins per ₹100 of vegetable order</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Min Qualifying Order Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.min_qualifying_order}
                    onChange={(e) => setSettings({ ...settings, min_qualifying_order: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Orders below this do not earn or redeem coins</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Max Physical Rewards per Order</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.max_rewards_per_order}
                    onChange={(e) => setSettings({ ...settings, max_rewards_per_order: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">Restricts claims to 1 physical essential per delivery</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Coin Validity (Days)</label>
                  <input
                    type="number"
                    min="30"
                    value={settings.coin_expiry_days}
                    onChange={(e) => setSettings({ ...settings, coin_expiry_days: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400">365 days rolling expiration for unused coins</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition"
                >
                  {saving ? 'Saving...' : 'Save Configuration Rules'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB 5: ANALYTICS & LIABILITIES ───────────────────────────────── */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Total Coins Awarded
                </span>
                <span className="text-3xl font-black text-emerald-800 mt-2 block">
                  {analytics.total_coins_earned}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Lifetime coins earned across all orders
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Total Coins Redeemed
                </span>
                <span className="text-3xl font-black text-amber-700 mt-2 block">
                  {analytics.total_coins_redeemed}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Spent on physical daily essentials
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Outstanding Liability
                </span>
                <span className="text-3xl font-black text-slate-900 mt-2 block">
                  {analytics.outstanding_liability_coins} Coins
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Estimated balance held by active customers
                </span>
              </div>
            </div>

            {/* Top Claimed Items */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">
                Most Frequently Claimed Reward Products
              </h3>

              <div className="space-y-2">
                {(analytics.top_claimed_rewards || []).map((r: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">{r.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800">{r.claims_count} Claims</span>
                      <span className="text-slate-400 text-[11px] ml-2 font-mono">
                        ({r.coins_spent} Coins)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: ADD / EDIT REWARD PRODUCT ─────────────────────────────── */}
        {showProductModal && editingProduct && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {editingProduct.id ? 'Edit Reward Product' : 'Add New Reward Product'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Changes update the live customer catalog instantly without requiring redeployment.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4">
                {/* IMAGE UPLOAD & PREVIEW SECTION */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <label className="text-xs font-bold text-slate-800 block">
                    Product Image (Upload from Computer)
                  </label>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 overflow-hidden relative shrink-0 shadow-xs flex items-center justify-center">
                      {(imagePreview || editingProduct.image_url) ? (
                        <Image
                          src={imagePreview || editingProduct.image_url || '/images/rewards/neem-comb.jpg'}
                          alt="Preview"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      )}
                    </div>

                    <div className="space-y-2 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-bold shadow-xs flex items-center gap-2 transition"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{uploadingImage ? 'Uploading to Supabase...' : (editingProduct.image_url ? 'Replace Image' : 'Upload Image')}</span>
                        </button>

                        {(imagePreview || editingProduct.image_url) && (
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              setEditingProduct({ ...editingProduct, image_url: '' });
                            }}
                            className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition"
                          >
                            Remove Image
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-500">
                        Supports JPG, PNG, and WebP up to 5MB. Uploaded directly to Supabase Storage (<code className="text-emerald-700 font-mono">reward-products</code>).
                      </p>

                      <input
                        type="text"
                        value={editingProduct.image_url || ''}
                        onChange={(e) => {
                          setEditingProduct({ ...editingProduct, image_url: e.target.value });
                          setImagePreview(e.target.value);
                        }}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-600 focus:outline-none focus:border-emerald-600"
                        placeholder="Or enter existing image URL / storage path"
                      />
                    </div>
                  </div>
                </div>

                {/* BASIC INFO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                      placeholder="e.g. Colgate Strong Teeth Toothpaste"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Brand Name</label>
                    <input
                      type="text"
                      value={editingProduct.brand || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                      placeholder="e.g. Colgate"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Category *</label>
                    <select
                      value={editingProduct.category_id || categories[0]?.id}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Package Size *</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.package_size || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, package_size: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                      placeholder="e.g. 100g Tube / Pack of 2"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Product SKU (Optional)</label>
                    <input
                      type="text"
                      value={editingProduct.sku || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-600"
                      placeholder="e.g. OC-COL-100"
                    />
                  </div>
                </div>

                {/* PRICING & INVENTORY */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Easy Coins Cost *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editingProduct.coin_cost || 30}
                      onChange={(e) => setEditingProduct({ ...editingProduct, coin_cost: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-black text-amber-700 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Available Stock *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingProduct.stock_quantity ?? 50}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Internal Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct.cost_price_inr || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, cost_price_inr: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Availability Status</label>
                    <select
                      value={editingProduct.availability_status || 'available'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, availability_status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    >
                      <option value="available">Available (In Stock)</option>
                      <option value="low_stock">Low Stock Warning</option>
                      <option value="out_of_stock">Out of Stock</option>
                      <option value="temporarily_unavailable">Temporarily Unavailable</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Min Qualifying Vegetable Order (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingProduct.min_order_value || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, min_order_value: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600"
                      placeholder="0 for any eligible order"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Product Description</label>
                  <textarea
                    rows={2}
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                    placeholder="Brief description of product benefits..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Bundle Components (Optional for Bundle sets)</label>
                  <input
                    type="text"
                    value={Array.isArray(editingProduct.bundle_components) ? editingProduct.bundle_components.join(', ') : (editingProduct.bundle_components || '')}
                    onChange={(e) => setEditingProduct({ ...editingProduct, bundle_components: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                    placeholder="e.g. Dabur Red Toothpaste 100g, Colgate ZigZag 2pk"
                  />
                  <p className="text-[10px] text-slate-400">Separate included products with commas</p>
                </div>

                <div className="flex items-center gap-2 pt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="is_active_check"
                    checked={editingProduct.is_active ?? true}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-500 w-4 h-4"
                  />
                  <label htmlFor="is_active_check" className="text-xs font-bold text-slate-800">
                    Product is Active and eligible to be redeemed in customer checkout
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploadingImage}
                    className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-md"
                  >
                    {saving ? 'Saving...' : 'Save Reward Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: BULK STOCK UPDATE ────────────────────────────────────── */}
        {showBulkStockModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">
                  Bulk Stock Update
                </h3>
                <button
                  onClick={() => setShowBulkStockModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Set available inventory quantity for all {selectedProductIds.length} selected reward products:
                </p>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={bulkStockValue}
                    onChange={(e) => setBulkStockValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkStockModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkAction('update_stock', bulkStockValue)}
                    disabled={bulkProcessing}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-black shadow-md"
                  >
                    {bulkProcessing ? 'Updating...' : 'Apply Stock Update'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: MANUAL BALANCE ADJUSTMENT ─────────────────────────────── */}
        {showAdjustModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">
                  Manual Coin Adjustment
                </h3>
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleManualAdjust} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Coins Delta (Amount)</label>
                  <input
                    type="number"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-black focus:outline-none"
                    placeholder="e.g. 50 (to add) or -30 (to deduct)"
                  />
                  <p className="text-[10px] text-slate-400">
                    Enter positive value to grant coins, or negative value to deduct.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Mandatory Audit Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                    placeholder="Detailed reason for administrative audit record (min 5 chars)..."
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs font-black shadow-md"
                  >
                    {saving ? 'Processing...' : 'Confirm Adjustment'}
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
