'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
  Search,
  ShoppingBag,
  ArrowRight,
  Plus,
  Minus,
  Heart,
  X,
  ChevronDown,
  Sparkles,
  Scale,
  Check,
} from 'lucide-react';
import { Product, Basket } from '@/types/database';
import { useCart } from '@/components/cart/CartProvider';
import { ReviewBasketDrawer } from '@/components/cart/ReviewBasketDrawer';
import { getVegetableImageUrl } from '@/lib/utils/vegetable-images';

interface CustomBoxZeptoViewProps {
  products: Product[];
  customBasket: Basket;
}

export interface NetQuantityOption {
  label: string;
  multiplier: number;
}

/**
 * Returns available net quantity tiers based on product's measurement unit
 */
export function getNetQuantityOptions(unit: string = 'kg'): NetQuantityOption[] {
  const u = (unit || 'kg').toLowerCase().trim();

  // Leafy Greens / Bunches
  if (u.includes('bunch')) {
    return [
      { label: '1 Bunch', multiplier: 1 },
      { label: '2 Bunches', multiplier: 2 },
      { label: '3 Bunches', multiplier: 3 },
      { label: '4 Bunches', multiplier: 4 },
      { label: '5 Bunches', multiplier: 5 },
    ];
  }

  // Pieces / Count based items
  if (u.includes('pcs') || u.includes('piece')) {
    return [
      { label: '1 pc', multiplier: 1 },
      { label: '2 pcs', multiplier: 2 },
      { label: '3 pcs', multiplier: 3 },
      { label: '4 pcs', multiplier: 4 },
      { label: '6 pcs', multiplier: 6 },
    ];
  }

  // Gram items (e.g. Ginger, Garlic, Chillies)
  if (u === 'g' || u === 'gram') {
    return [
      { label: '100 g', multiplier: 0.1 },
      { label: '250 g', multiplier: 0.25 },
      { label: '500 g', multiplier: 0.5 },
      { label: '1 kg', multiplier: 1 },
    ];
  }

  // Standard Vegetables priced per kg
  return [
    { label: '250 g', multiplier: 0.25 },
    { label: '500 g', multiplier: 0.5 },
    { label: '1 kg', multiplier: 1 },
    { label: '1.5 kg', multiplier: 1.5 },
    { label: '2 kg', multiplier: 2 },
    { label: '3 kg', multiplier: 3 },
    { label: '5 kg', multiplier: 5 },
  ];
}

export function getDefaultNetQuantityLabel(unit: string = 'kg'): string {
  const u = (unit || 'kg').toLowerCase().trim();
  if (u.includes('bunch')) return '1 Bunch';
  if (u.includes('pcs') || u.includes('piece')) return '1 pc';
  if (u === 'g') return '250 g';
  return '1 kg';
}

export function calculateNetQuantityPrice(basePrice: number, multiplier: number): number {
  return Math.max(1, Math.round(basePrice * multiplier));
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'greens', label: 'Leafy Greens' },
  { id: 'roots', label: 'Root Vegetables' },
  { id: 'gourds', label: 'Fruits & Gourds' },
  { id: 'others', label: 'Others' },
];

export function CustomBoxZeptoView({ products, customBasket }: CustomBoxZeptoViewProps) {
  const { updateCustomizedBasket, totalItems: cartCount, items: cartItems } = useCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Currently selected Net Quantity label per product (e.g. { 'prod_1': '500 g' })
  const [activeNetQuantities, setActiveNetQuantities] = useState<Record<string, string>>({});

  // Pack counts per product (0 = not added, 1 = 1x pack, 2 = 2x packs)
  const [packCounts, setPackCounts] = useState<Record<string, number>>({});

  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);

  // Restore cart selections on mount if custom box already has items
  useEffect(() => {
    const existingCustomItem = cartItems.find(
      (item) => item.basket.slug?.includes('custom') || item.basket.id.endsWith('4')
    );

    if (existingCustomItem?.customizedItems && existingCustomItem.customizedItems.length > 0) {
      const restoredPacks: Record<string, number> = {};
      const restoredNetQty: Record<string, string> = {};

      existingCustomItem.customizedItems.forEach((it) => {
        restoredPacks[it.productId] = it.quantity || 1;
        if (it.unit) {
          restoredNetQty[it.productId] = it.unit;
        }
      });

      setPackCounts(restoredPacks);
      setActiveNetQuantities((prev) => ({ ...prev, ...restoredNetQty }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Categorize products
  const categorizedProducts = useMemo(() => {
    return products.map((p) => {
      let cat = 'others';
      const s = (p.slug || p.name || '').toLowerCase();
      if (
        s.includes('palak') ||
        s.includes('spinach') ||
        s.includes('thotakura') ||
        s.includes('amaranth') ||
        s.includes('leaves') ||
        s.includes('coriander') ||
        s.includes('curry') ||
        s.includes('greens')
      ) {
        cat = 'greens';
      } else if (
        s.includes('potato') ||
        s.includes('carrot') ||
        s.includes('beetroot') ||
        s.includes('onion') ||
        s.includes('root')
      ) {
        cat = 'roots';
      } else if (
        s.includes('gourd') ||
        s.includes('cucumber') ||
        s.includes('okra') ||
        s.includes('bhendi') ||
        s.includes('bhindi') ||
        s.includes('beans') ||
        s.includes('brinjal') ||
        s.includes('tomato') ||
        s.includes('chilli') ||
        s.includes('capsicum')
      ) {
        cat = 'gourds';
      } else {
        cat = 'others';
      }
      return { ...p, categoryTag: cat };
    });
  }, [products]);

  // Filter products by active status, search and category
  const filteredProducts = useMemo(() => {
    return categorizedProducts.filter((p) => {
      if (p.active === false) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q || p.name.toLowerCase().includes(q) || (p.slug || '').toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'all' || p.categoryTag === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [categorizedProducts, searchQuery, selectedCategory]);

  // Total selected count and dynamic subtotal based on net quantity
  const { totalSelectedItems, totalUnits, subtotal } = useMemo(() => {
    let itemsCount = 0;
    let unitsCount = 0;
    let sum = 0;

    products.forEach((p) => {
      const count = packCounts[p.id] || 0;
      if (count > 0) {
        itemsCount += 1;
        unitsCount += count;

        const options = getNetQuantityOptions(p.unit);
        const currentNetLabel = activeNetQuantities[p.id] || getDefaultNetQuantityLabel(p.unit);
        const selectedOpt = options.find((o) => o.label === currentNetLabel) || options[0];
        const unitPrice = calculateNetQuantityPrice(p.price, selectedOpt.multiplier);

        sum += unitPrice * count;
      }
    });

    return {
      totalSelectedItems: itemsCount,
      totalUnits: unitsCount,
      subtotal: sum,
    };
  }, [products, packCounts, activeNetQuantities]);

  // Sync state changes to global CartProvider
  const syncToCart = (
    currentPacks = packCounts,
    currentNetMap = activeNetQuantities
  ) => {
    const activeProducts = products.filter((p) => (currentPacks[p.id] || 0) > 0);

    let sum = 0;
    const customizedBasketPayload = activeProducts.map((p) => {
      const count = currentPacks[p.id] || 1;
      const options = getNetQuantityOptions(p.unit);
      const currentNetLabel = currentNetMap[p.id] || getDefaultNetQuantityLabel(p.unit);
      const selectedOpt = options.find((o) => o.label === currentNetLabel) || options[0];
      const unitPrice = calculateNetQuantityPrice(p.price, selectedOpt.multiplier);
      const totalItemPrice = unitPrice * count;

      sum += totalItemPrice;

      return {
        productId: p.id,
        productName: p.name,
        quantity: count,
        unit: currentNetLabel, // exact net quantity chosen e.g. "500 g" or "1.5 kg"
        price: unitPrice,      // price for that net quantity tier
        compare_at_price: p.market_price
          ? Math.round(p.market_price * selectedOpt.multiplier)
          : undefined,
        image_url: getVegetableImageUrl(p.image_url, p.slug || p.name),
      };
    });

    const finalBasketObj: Basket = {
      ...customBasket,
      price: sum,
    };

    updateCustomizedBasket(finalBasketObj, customizedBasketPayload);
  };

  // Handle customer changing Net Quantity dropdown (e.g. switching from 1 kg to 500 g)
  const handleNetQuantityChange = (productId: string, newNetLabel: string) => {
    const updatedNetMap = {
      ...activeNetQuantities,
      [productId]: newNetLabel,
    };
    setActiveNetQuantities(updatedNetMap);

    // If already added to box, immediately sync recalculated price to cart
    if ((packCounts[productId] || 0) > 0) {
      syncToCart(packCounts, updatedNetMap);
    }
  };

  // Handle pack count change (+ / - / Add)
  const handlePackCountChange = (productId: string, newCount: number) => {
    const updated = { ...packCounts };
    if (newCount <= 0) {
      delete updated[productId];
    } else {
      updated[productId] = newCount;
    }
    setPackCounts(updated);
    syncToCart(updated, activeNetQuantities);
  };

  // Add all enabled items at once (or clear all)
  const handleAddAllItemsAtOnce = () => {
    const updated: Record<string, number> = { ...packCounts };
    filteredProducts.forEach((p) => {
      if (p.active !== false) {
        updated[p.id] = Math.max(1, updated[p.id] || 1);
      }
    });
    setPackCounts(updated);
    syncToCart(updated, activeNetQuantities);
  };

  const handleClearAllItems = () => {
    setPackCounts({});
    syncToCart({}, activeNetQuantities);
  };

  // Toggle wishlist heart
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const MIN_CUSTOM_BOX_ITEMS = 4;

  const handleReviewBasketClick = () => {
    if (totalSelectedItems < MIN_CUSTOM_BOX_ITEMS) {
      const needed = MIN_CUSTOM_BOX_ITEMS - totalSelectedItems;
      alert(`Minimum 4 items are required in Custom Box. Please select ${needed} more ${needed === 1 ? 'item' : 'items'}.`);
      return;
    }
    syncToCart();
    setReviewDrawerOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA] text-slate-900 pb-32">
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* ── 1. CUSTOM BOX HERO BANNER ─────────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden border border-[#E6DECE] bg-gradient-to-r from-[#FAF6ED] via-[#F5EEE2] to-[#EAE0CF] shadow-xs p-6 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="md:col-span-7 space-y-3">
              <span className="text-sm font-semibold text-[#0C4A34] inline-block">
                Create Your Own Harvest Box
              </span>

              <h1 className="text-3xl sm:text-5xl font-black text-[#0B3B2C] tracking-tight">
                {customBasket.name || 'Custom Box'}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md">
                Select at least <strong>4 items</strong> with your required net quantity (250g, 500g, 1kg, 2kg+). Prices automatically adjust based on authentic Telangana farm rates.
              </p>
            </div>

            {/* Right Banner Image */}
            <div className="md:col-span-5 relative flex items-center justify-center md:justify-end">
              <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-2xl overflow-hidden border border-white/80 shadow-md bg-white">
                <Image
                  src="/images/custom-box-banner.jpg"
                  alt="Fresh Easy Farm Harvest Wooden Crate"
                  fill
                  unoptimized
                  sizes="320px"
                  priority
                  className="object-cover"
                />

                {/* Fresh Farms To You Badge */}
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md rounded-xl py-1 px-2.5 border border-white shadow-md flex items-center gap-1.5 text-[10px] font-black text-[#0C4A34]">
                  <span>🌿 Direct From Farm</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. SEARCH BAR & CATEGORY PILLS ───────────────────────────── */}
        <div className="space-y-3.5">
          {/* Rounded-full Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vegetables by name..."
              className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200/90 rounded-full text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0C4A34]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills & Add All At Once Action */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition shadow-2xs shrink-0 ${isActive
                      ? 'bg-[#0C4A34] text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700'
                      }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {filteredProducts.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddAllItemsAtOnce}
                  className="px-3.5 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#0C4A34] font-black text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add All Items at Once ({filteredProducts.length})</span>
                </button>
              )}
              {totalSelectedItems > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllItems}
                  className="px-3 py-2 rounded-full bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 font-bold text-xs transition cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. ELEGANT PRODUCT CARDS WITH NET QUANTITY SELECTION ───────── */}
        <div>
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {filteredProducts.map((p) => {
                const count = packCounts[p.id] || 0;
                const isFavorited = Boolean(wishlist[p.id]);

                // Net Quantity options for this product
                const netOptions = getNetQuantityOptions(p.unit);
                const currentNetLabel = activeNetQuantities[p.id] || getDefaultNetQuantityLabel(p.unit);
                const currentOpt = netOptions.find((o) => o.label === currentNetLabel) || netOptions[0];

                // Dynamically calculated price for the chosen net quantity
                const calculatedUnitPrice = calculateNetQuantityPrice(p.price, currentOpt.multiplier);
                const totalPriceForProduct = calculatedUnitPrice * count;

                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-3xl border p-3.5 sm:p-4.5 shadow-xs transition-all duration-200 flex flex-col justify-between relative group ${count > 0
                      ? 'border-emerald-500 ring-2 ring-emerald-100 shadow-sm'
                      : 'border-slate-200/90 hover:border-emerald-300 hover:shadow-md'
                      }`}
                  >
                    <div>
                      {/* Top row: Base Rate & Wishlist Heart */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
                          ₹{p.price} / {p.unit || 'kg'} base
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleWishlist(p.id)}
                          className="text-slate-300 hover:text-rose-500 transition p-0.5 -mr-0.5"
                          aria-label="Save to wishlist"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''
                              }`}
                          />
                        </button>
                      </div>

                      {/* Vegetable Photo */}
                      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#FBFBFA] border border-slate-100/90 mb-3 shadow-2xs">
                        <Image
                          src={getVegetableImageUrl(p.image_url, p.slug || p.name)}
                          alt={p.name}
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {count > 0 && (
                          <div className="absolute top-2 left-2 bg-emerald-800 text-white rounded-lg px-2 py-0.5 text-[10px] font-black shadow flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Added</span>
                          </div>
                        )}
                      </div>

                      {/* Product Name */}
                      <div className="space-y-1">
                        <h4
                          className="font-black text-sm sm:text-base text-slate-900 truncate"
                          title={p.name}
                        >
                          {p.name}
                        </h4>
                      </div>

                      {/* ── NET QUANTITY SELECTOR ─────────────────────────── */}
                      <div className="mt-2.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                          Net Quantity:
                        </label>
                        <div className="relative">
                          <select
                            value={currentNetLabel}
                            onChange={(e) => handleNetQuantityChange(p.id, e.target.value)}
                            className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-900 rounded-xl px-2.5 py-1.5 text-xs font-bold appearance-none cursor-pointer pr-7 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition shadow-2xs"
                          >
                            {netOptions.map((opt) => {
                              const optPrice = calculateNetQuantityPrice(p.price, opt.multiplier);
                              return (
                                <option key={opt.label} value={opt.label}>
                                  {opt.label} — ₹{optPrice}
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Automatically Updated Dynamic Price */}
                      <div className="flex items-baseline justify-between pt-2.5 mt-2 border-t border-slate-100">
                        <div>
                          <span className="text-base sm:text-lg font-black text-slate-900">
                            ₹{calculatedUnitPrice}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 ml-1">
                            / {currentNetLabel}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          In stock
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action: Add or Stepper */}
                    <div className="pt-3 mt-1">
                      {count > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-1 text-xs font-black shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handlePackCountChange(p.id, count - 1)}
                              className="w-8 h-8 rounded-lg hover:bg-emerald-200/70 text-emerald-950 flex items-center justify-center transition active:scale-95"
                              aria-label={`Decrease ${p.name}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-sm font-black text-emerald-950">
                              {count} {count === 1 ? 'pack' : 'packs'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handlePackCountChange(p.id, count + 1)}
                              className="w-8 h-8 rounded-lg hover:bg-emerald-200/70 text-emerald-950 flex items-center justify-center transition active:scale-95"
                              aria-label={`Increase ${p.name}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {count > 1 && (
                            <p className="text-[10px] text-center font-bold text-emerald-800">
                              Subtotal: ₹{totalPriceForProduct}
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePackCountChange(p.id, 1)}
                          className="w-full py-2.5 rounded-xl bg-[#0C4A34] hover:bg-[#093928] text-white font-bold text-xs sm:text-sm transition shadow-2xs active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add {currentNetLabel} (₹{calculatedUnitPrice})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center text-xs text-slate-500 border border-slate-200">
              No vegetables matched your search. Try different keywords or select All.
            </div>
          )}
        </div>
      </main>

      {/* ── 4. FIXED BOTTOM BASKET SUMMARY (FLOATING PILL) ───────────────── */}
      <div className="fixed bottom-4 inset-x-4 z-40 max-w-4xl mx-auto pointer-events-none">
        <div className="bg-[#0C4A34] text-white rounded-full sm:rounded-2xl p-2.5 sm:p-3 px-5 sm:px-6 shadow-2xl flex items-center justify-between gap-4 border border-emerald-800/80 pointer-events-auto">
          {/* Left info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-800/80 flex items-center justify-center text-white shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-white">
                {totalSelectedItems} / {MIN_CUSTOM_BOX_ITEMS} min items &nbsp;|&nbsp; ₹{subtotal}
              </div>
              <div className="text-[10px] text-emerald-200/80">
                {totalSelectedItems < MIN_CUSTOM_BOX_ITEMS
                  ? `Select ${MIN_CUSTOM_BOX_ITEMS - totalSelectedItems} more ${MIN_CUSTOM_BOX_ITEMS - totalSelectedItems === 1 ? 'item' : 'items'} (Min. 4 items required)`
                  : 'Direct Farm Harvest • Ready for Sunday Doorstep Delivery'}
              </div>
            </div>
          </div>

          {/* Right action */}
          <button
            type="button"
            onClick={handleReviewBasketClick}
            className={`px-5 sm:px-6 py-2.5 rounded-full font-black text-xs sm:text-sm transition shadow-md flex items-center gap-1.5 active:scale-95 ${
              totalSelectedItems >= MIN_CUSTOM_BOX_ITEMS
                ? 'bg-white hover:bg-emerald-50 text-[#0C4A34]'
                : 'bg-amber-300/90 hover:bg-amber-300 text-amber-950'
            }`}
          >
            <span>
              {totalSelectedItems >= MIN_CUSTOM_BOX_ITEMS
                ? 'Review Basket'
                : `Add ${MIN_CUSTOM_BOX_ITEMS - totalSelectedItems} More`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 5. REVIEW BASKET / CART SLIDE-OVER DRAWER ─────────────────────── */}
      <ReviewBasketDrawer
        isOpen={reviewDrawerOpen}
        onClose={() => setReviewDrawerOpen(false)}
      />
    </div>
  );
}
