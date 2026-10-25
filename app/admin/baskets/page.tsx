'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  ShoppingBag,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Layers,
  Sparkles,
  ArrowRightLeft,
  Check,
  X,
  Lock,
  Unlock,
  Save,
  Tag,
  Scale,
  Calendar,
  Percent,
} from 'lucide-react';
import { Basket, Product, BasketItem } from '@/types/database';
import {
  BasketPricingSummary,
  formatCurrency,
} from '@/lib/pricing-calculator';

export default function AdminBasketsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Core Data
  const [basketsData, setBasketsData] = useState<Array<{ basket: Basket; pricing: BasketPricingSummary }>>([]);
  const [selectedBasketId, setSelectedBasketId] = useState<string>('33333333-0000-0000-0000-000000000001');

  // Local Editable Items for the currently selected basket (8 items)
  const [editableItems, setEditableItems] = useState<BasketItem[]>([]);
  const [manualComparePrice, setManualComparePrice] = useState<string>('');

  const fetchBaskets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/baskets/unified');
      const data = await res.json();
      if (data.success && data.baskets?.length > 0) {
        setBasketsData(data.baskets);

        // Load currently selected basket items
        const current = data.baskets.find((b: any) => b.basket.id === selectedBasketId) || data.baskets[0];
        if (current) {
          setSelectedBasketId(current.basket.id);
          const items = current.basket.items || [];
          setEditableItems(JSON.parse(JSON.stringify(items)));
          setManualComparePrice(String(current.basket.compare_at_price || ''));
        }
      }
    } catch (e: any) {
      console.error('Failed to load baskets:', e);
      setFeedbackMsg({ type: 'error', text: 'Error loading basket data: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaskets();
  }, []);

  // When selected basket changes, sync editable items
  const currentBasketData = basketsData.find((b) => b.basket.id === selectedBasketId) || basketsData[0];

  useEffect(() => {
    if (currentBasketData) {
      const items = currentBasketData.basket.items || [];
      setEditableItems(JSON.parse(JSON.stringify(items)));
      setManualComparePrice(String(currentBasketData.basket.compare_at_price || ''));
    }
  }, [selectedBasketId, basketsData]);

  // Real-time calculation: Sum of prices of the fixed items
  const fixedItems = editableItems.filter((it) => it.is_fixed !== false);
  const swapItems = editableItems.filter((it) => it.is_fixed === false);

  const calculatedDailyPrice = fixedItems.reduce(
    (sum, it) => sum + (Number(it.item_price) || 0),
    0
  );

  const calculatedComparePrice = fixedItems.reduce(
    (sum, it) => sum + (Number(it.compare_at_price) || 0),
    0
  );

  const effectiveComparePrice = manualComparePrice !== '' && !isNaN(Number(manualComparePrice))
    ? Number(manualComparePrice)
    : calculatedComparePrice;

  const savingsAmount = Math.max(0, effectiveComparePrice - calculatedDailyPrice);
  const savingsPct = effectiveComparePrice > 0
    ? Math.round((savingsAmount / effectiveComparePrice) * 100)
    : 0;

  // Toggle an item between Fixed (Default) and Swap Option
  const handleToggleFixed = (index: number) => {
    const updated = [...editableItems];
    const target = updated[index];
    const currentlyFixed = target.is_fixed !== false;

    if (!currentlyFixed) {
      // Trying to make it fixed: ensure there are not more than 5 fixed
      const currentFixedCount = updated.filter((it) => it.is_fixed !== false).length;
      if (currentFixedCount >= 5) {
        // Swap with the last fixed item so there are always exactly 5 fixed
        const lastFixedIdx = updated.findLastIndex((it) => it.is_fixed !== false);
        if (lastFixedIdx !== -1) {
          updated[lastFixedIdx].is_fixed = false;
          updated[lastFixedIdx].is_default = false;
        }
      }
      target.is_fixed = true;
      target.is_default = true;
    } else {
      // Trying to make it a swap item: make sure at least 1 remains fixed
      const currentFixedCount = updated.filter((it) => it.is_fixed !== false).length;
      if (currentFixedCount <= 1) {
        alert('You must have at least 1 fixed item in the basket.');
        return;
      }
      target.is_fixed = false;
      target.is_default = false;
    }

    setEditableItems(updated);
  };

  // Update item field (price, compare price, quantity, unit)
  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...editableItems];
    updated[index] = {
      ...updated[index],
      [field]: val,
    };
    setEditableItems(updated);
  };

  // Save changes to basket and all 8 items
  const handleSaveBasket = async () => {
    if (fixedItems.length !== 5 && !selectedBasketId.endsWith('4')) {
      alert(`Please select exactly 5 Fixed items for this basket. Currently ${fixedItems.length} are fixed.`);
      return;
    }

    setSaving(true);
    setFeedbackMsg(null);

    try {
      // 1. Save all 8 items with item_price, compare_at_price, is_fixed
      const itemsRes = await fetch('/api/admin/baskets/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basketId: selectedBasketId,
          items: editableItems.map((it, idx) => ({
            product_id: it.product_id,
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'kg',
            item_price: Number(it.item_price) || 0,
            compare_at_price: Number(it.compare_at_price) || 0,
            sort_order: idx + 1,
            is_fixed: it.is_fixed !== false,
            is_default: it.is_fixed !== false,
          })),
        }),
      });

      const itemsData = await itemsRes.json();
      if (!itemsRes.ok || !itemsData.success) {
        throw new Error(itemsData.error || 'Failed to save basket items');
      }

      // 2. Save basket price for the day & compare price
      const basketRes = await fetch('/api/admin/baskets/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basketId: selectedBasketId,
          price: calculatedDailyPrice,
          compare_at_price: effectiveComparePrice,
          max_swaps: 3,
        }),
      });

      const basketData = await basketRes.json();
      if (!basketRes.ok || !basketData.success) {
        throw new Error(basketData.error || 'Failed to update basket price');
      }

      setFeedbackMsg({
        type: 'success',
        text: `Basket updated successfully! Daily Basket Price is ₹${calculatedDailyPrice} (Compare At: ₹${effectiveComparePrice}). Changes are live!`,
      });

      fetchBaskets();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error saving basket' });
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active / Archived status without deleting historical records
  const handleToggleActive = async (basketId: string, currentActive: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/admin/baskets/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basketId,
          active: !currentActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg({
          type: 'success',
          text: `Basket status updated to ${!currentActive ? 'ACTIVE (Visible on customer site)' : 'ARCHIVED (Hidden from customers)'}. Historical records preserved.`,
        });
        fetchBaskets();
      } else {
        throw new Error(data.error || 'Failed to update status');
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  const activeBaskets = basketsData.filter((b) => b.basket.active !== false);
  const archivedBaskets = basketsData.filter((b) => b.basket.active === false);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-emerald-800 text-white rounded-2xl shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Basket Pricing &amp; Daily Item Management
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exactly 2 active boxes are displayed to customers: Staple Box and Custom Box. Manage items, daily prices, and safely archive/unarchive boxes without deleting database records.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchBaskets}
              disabled={loading}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl transition shadow-2xs"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
            </button>
            <button
              onClick={handleSaveBasket}
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs rounded-2xl transition shadow-md flex items-center gap-2 min-h-[42px]"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Basket for the Day'}</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 shadow-xs ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ACTIVE BASKETS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              Active Customer Boxes (Live on Website):
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">{activeBaskets.length} Active Boxes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBaskets.map(({ basket }) => {
              const isSelected = basket.id === selectedBasketId;
              const isCustom = basket.id.endsWith('4') || basket.slug?.includes('custom');
              const items = basket.items || [];
              const bFixed = items.filter((it) => it.is_fixed !== false);
              const bDailyPrice = bFixed.reduce((sum, it) => sum + (Number(it.item_price) || 0), 0) || basket.price;
              const bComparePrice = bFixed.reduce((sum, it) => sum + (Number(it.compare_at_price) || 0), 0) || basket.compare_at_price || Math.round(bDailyPrice * 1.25);
              const bDiscount = Math.max(0, bComparePrice - bDailyPrice);

              return (
                <div
                  key={basket.id}
                  onClick={() => setSelectedBasketId(basket.id)}
                  className={`p-5 rounded-3xl border transition cursor-pointer relative bg-white flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          {isCustom ? '24 Crops Catalogue' : '8 Crops (5 Fixed + 3 Swaps)'}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-700 text-white text-[10px] font-bold rounded-md">
                          Live on Store
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded-md">
                            Selected
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleToggleActive(basket.id, true, e)}
                          className="text-[10px] font-bold text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                        >
                          Archive
                        </button>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 mt-2">{basket.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{basket.description}</p>

                    {/* PRICING METRICS */}
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Daily Box Price</span>
                        <span className="text-xl font-black text-emerald-800">
                          {formatCurrency(isSelected ? calculatedDailyPrice : bDailyPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Compare Price</span>
                        <span className="text-sm font-black text-slate-400 line-through">
                          {formatCurrency(isSelected ? effectiveComparePrice : bComparePrice)}
                        </span>
                      </div>
                    </div>

                    {/* SAVINGS BADGE */}
                    <div className="mt-3 bg-emerald-50 rounded-xl p-2.5 flex items-center justify-between text-xs font-bold text-emerald-900 border border-emerald-100">
                      <span>Customer Savings:</span>
                      <span className="font-black text-emerald-700">
                        {formatCurrency(isSelected ? savingsAmount : bDiscount)} ({isSelected ? savingsPct : Math.round((bDiscount / bComparePrice) * 100)}% OFF)
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
                    <span>{isCustom ? 'Full Catalogue' : '5 Fixed Items • 3 Swappable'}</span>
                    <span className="text-emerald-800 font-black">Configure &rarr;</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ARCHIVED / DEACTIVATED BASKETS (PRESERVED FOR HISTORICAL ORDERS) */}
        {archivedBaskets.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                Archived Baskets (Hidden from Customers, Orders Preserved):
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">{archivedBaskets.length} Inactive</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archivedBaskets.map(({ basket }) => {
                const isSelected = basket.id === selectedBasketId;
                const items = basket.items || [];
                const bFixed = items.filter((it) => it.is_fixed !== false);
                const bDailyPrice = bFixed.reduce((sum, it) => sum + (Number(it.item_price) || 0), 0) || basket.price;

                return (
                  <div
                    key={basket.id}
                    onClick={() => setSelectedBasketId(basket.id)}
                    className={`p-4 rounded-3xl border transition cursor-pointer relative bg-slate-50 flex items-center justify-between opacity-80 hover:opacity-100 ${
                      isSelected ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                          Archived
                        </span>
                        <h4 className="text-sm font-black text-slate-800">{basket.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{basket.description}</p>
                      <div className="text-xs font-bold text-slate-600 mt-1">₹{bDailyPrice} / delivery</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleActive(basket.id, false, e)}
                        className="text-xs font-bold text-emerald-800 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white shadow-2xs"
                      >
                        Re-Activate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HERO CONFIGURATION & DAILY PRICING SUMMARY FOR CURRENT BASKET */}
        {currentBasketData && (
          <div className="bg-white rounded-3xl border border-emerald-100 p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div>
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                  Configuring {currentBasketData.basket.name}
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Daily Basket Price &amp; 8-Item Roster
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust item prices and compare prices below. The daily basket price is automatically calculated by summing the prices of the 5 fixed items.
                </p>
              </div>

              {/* STAT CARDS ROW */}
              <div className="flex flex-wrap items-center gap-4">
                {/* BASKET PRICE FOR THE DAY */}
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 min-w-[170px]">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                    Basket Price for the Day
                  </span>
                  <span className="text-3xl font-black text-emerald-950 block mt-1">
                    {formatCurrency(calculatedDailyPrice)}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                    = Sum of 5 Fixed Items
                  </span>
                </div>

                {/* COMPARE PRICE */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 min-w-[170px]">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Compare Price (Market MRP)
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-2xl font-black text-slate-700">₹</span>
                    <input
                      type="number"
                      value={manualComparePrice}
                      placeholder={String(calculatedComparePrice)}
                      onChange={(e) => setManualComparePrice(e.target.value)}
                      className="w-24 text-2xl font-black text-slate-700 bg-transparent border-b border-slate-300 focus:outline-emerald-600"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                    Default sum: ₹{calculatedComparePrice}
                  </span>
                </div>

                {/* SAVINGS BADGE */}
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 min-w-[160px]">
                  <span className="text-[10px] font-black text-purple-800 uppercase tracking-wider block">
                    Customer Savings
                  </span>
                  <span className="text-2xl font-black text-purple-950 block mt-1">
                    {formatCurrency(savingsAmount)}
                  </span>
                  <span className="text-[10px] text-purple-700 font-bold block mt-0.5">
                    {savingsPct}% Discount
                  </span>
                </div>
              </div>
            </div>

            {/* STATUS BADGES & INSTRUCTION */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-xl font-black flex items-center gap-1.5 ${
                  fixedItems.length === 5
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  <Lock className="w-3.5 h-3.5" />
                  <span>{fixedItems.length} of 5 Fixed Items Selected</span>
                </div>

                <div className="px-3 py-1.5 rounded-xl font-black bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{swapItems.length} Swap Alternatives for Customer</span>
                </div>
              </div>

              <span className="text-slate-500 font-medium">
                Admin fixes 5 items &bull; User can swap up to 3 of them
              </span>
            </div>

            {/* THE 8 ITEMS TABLE */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                      <th className="p-3.5 w-12 text-center">#</th>
                      <th className="p-3.5">Crop Name</th>
                      <th className="p-3.5">Net Quantity</th>
                      <th className="p-3.5">Unit</th>
                      <th className="p-3.5">Item Price (₹)</th>
                      <th className="p-3.5">Compare Price (₹)</th>
                      <th className="p-3.5">Basket Role</th>
                      <th className="p-3.5 text-right">Fixed / Swap Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editableItems.map((item, idx) => {
                      const isFixed = item.is_fixed !== false;

                      return (
                        <tr
                          key={idx}
                          className={`transition ${
                            isFixed ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3.5 text-center font-black text-slate-400">
                            {idx + 1}
                          </td>

                          {/* NAME */}
                          <td className="p-3.5">
                            <span className="font-black text-slate-900 text-sm block">
                              {(item.product as any)?.name || 'Crop'}
                            </span>
                            <span className="text-[10px] text-slate-400">Fresh Telangana Harvest</span>
                          </td>

                          {/* QUANTITY */}
                          <td className="p-3.5">
                            <input
                              type="number"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                              className="w-16 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-black text-slate-800 text-xs focus:outline-emerald-600"
                            />
                          </td>

                          {/* UNIT */}
                          <td className="p-3.5">
                            <select
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              className="px-2 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-xs focus:outline-emerald-600"
                            >
                              <option value="kg">kg</option>
                              <option value="g">g</option>
                              <option value="500g">500g</option>
                              <option value="250g">250g</option>
                              <option value="200g">200g</option>
                              <option value="bunch">bunch</option>
                              <option value="piece">piece</option>
                              <option value="pack">pack</option>
                            </select>
                          </td>

                          {/* ITEM PRICE (₹) */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1">
                              <span className="font-black text-emerald-800">₹</span>
                              <input
                                type="number"
                                value={item.item_price ?? 35}
                                onChange={(e) => handleItemChange(idx, 'item_price', Number(e.target.value))}
                                className="w-20 px-2.5 py-1.5 bg-white border border-emerald-300 rounded-xl font-black text-emerald-900 text-sm focus:outline-emerald-600 shadow-2xs"
                              />
                            </div>
                          </td>

                          {/* COMPARE PRICE (₹) */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                value={item.compare_at_price ?? 45}
                                onChange={(e) => handleItemChange(idx, 'compare_at_price', Number(e.target.value))}
                                className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-black text-slate-700 text-sm focus:outline-emerald-600"
                              />
                            </div>
                          </td>

                          {/* ROLE BADGE */}
                          <td className="p-3.5">
                            {isFixed ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-[10px] font-black flex items-center gap-1 w-fit">
                                <Lock className="w-3 h-3 text-emerald-700" />
                                <span>FIXED (In Basket)</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-[10px] font-black flex items-center gap-1 w-fit">
                                <ArrowRightLeft className="w-3 h-3 text-purple-700" />
                                <span>SWAP OPTION</span>
                              </span>
                            )}
                          </td>

                          {/* TOGGLE BUTTON */}
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleFixed(idx)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border ${
                                isFixed
                                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                  : 'bg-emerald-800 text-white border-emerald-800 hover:bg-emerald-900 shadow-2xs'
                              }`}
                            >
                              {isFixed ? 'Change to Swap' : 'Make Fixed (Default)'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BOTTOM SUMMARY & FORMULA BREAKDOWN */}
            <div className="p-5 bg-emerald-950 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-emerald-300 font-bold uppercase tracking-wider block">
                  Today's Price Formula Calculation
                </span>
                <p className="text-sm font-semibold mt-1 text-emerald-100">
                  Fixed 5 Items: {fixedItems.map((it) => `₹${it.item_price || 0}`).join(' + ')} ={' '}
                  <strong className="text-white text-base font-black">₹{calculatedDailyPrice}</strong>
                </p>
                <p className="text-xs text-emerald-300 mt-0.5">
                  Compare Price: {fixedItems.map((it) => `₹${it.compare_at_price || 0}`).join(' + ')} ={' '}
                  <strong className="text-white font-bold">₹{effectiveComparePrice}</strong> &bull; Customer saves ₹{savingsAmount}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveBasket}
                disabled={saving}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 shrink-0 min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save & Publish Basket for the Day'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
