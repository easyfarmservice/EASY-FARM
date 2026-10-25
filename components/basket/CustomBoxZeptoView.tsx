'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Search,
  ShoppingBag,
  ArrowRight,
  Plus,
  Minus,
  Heart,
  X,
  AlertCircle
} from 'lucide-react';
import { Product, Basket } from '@/types/database';
import { useCart } from '@/components/cart/CartProvider';
import { ReviewBasketDrawer } from '@/components/cart/ReviewBasketDrawer';
import { getVegetableImageUrl } from '@/lib/utils/vegetable-images';

interface CustomBoxZeptoViewProps {
  products: Product[];
  customBasket: Basket;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'greens', label: 'Leafy Greens' },
  { id: 'roots', label: 'Root Vegetables' },
  { id: 'gourds', label: 'Fruits & Gourds' },
  { id: 'others', label: 'Others' },
];

export function CustomBoxZeptoView({ products, customBasket }: CustomBoxZeptoViewProps) {
  const { updateCustomizedBasket, totalItems: cartCount } = useCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // INITIALLY NO ITEMS SELECTED (empty record)
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  // Cart / Review Drawer state
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);

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

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return categorizedProducts.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q || p.name.toLowerCase().includes(q) || (p.slug || '').toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'all' || p.categoryTag === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [categorizedProducts, searchQuery, selectedCategory]);

  // Total selected count and dynamic subtotal
  const { totalSelectedItems, totalUnits, subtotal } = useMemo(() => {
    let itemsCount = 0;
    let unitsCount = 0;
    let sum = 0;

    products.forEach((p) => {
      const qty = quantities[p.id] || 0;
      if (qty > 0) {
        itemsCount += 1;
        unitsCount += qty;
        sum += p.price * qty;
      }
    });

    return {
      totalSelectedItems: itemsCount,
      totalUnits: unitsCount,
      subtotal: sum,
    };
  }, [products, quantities]);

  // Quantity control
  const handleQuantityChange = (productId: string, newQty: number) => {
    const updated = { ...quantities };
    if (newQty <= 0) {
      delete updated[productId];
    } else {
      updated[productId] = newQty;
    }
    setQuantities(updated);
    syncToCart(updated);
  };

  // Toggle wishlist heart
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // Sync to cart
  const syncToCart = (currentQuantities = quantities) => {
    const activeProducts = products.filter((p) => (currentQuantities[p.id] || 0) > 0);
    const sum = activeProducts.reduce((acc, p) => acc + p.price * currentQuantities[p.id], 0);

    const customizedBasketPayload = activeProducts.map((p) => ({
      productId: p.id,
      productName: p.name,
      quantity: currentQuantities[p.id],
      unit: p.unit || 'kg',
      price: p.price,
      compare_at_price: p.market_price,
      image_url: getVegetableImageUrl(p.image_url, p.slug || p.name),
    }));

    const finalBasketObj: Basket = {
      ...customBasket,
      price: sum,
    };

    updateCustomizedBasket(finalBasketObj, customizedBasketPayload);
  };

  const handleReviewBasketClick = () => {
    if (totalSelectedItems === 0) {
      alert('Please add at least 1 vegetable to your Custom Box.');
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
                Create Your Own
              </span>

              <h1 className="text-3xl sm:text-5xl font-black text-[#0B3B2C] tracking-tight">
                {customBasket.name || 'Custom Box'}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md">
                Pick exactly what you need. Fresh, flexible and yours.
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
                  <span>🌿 Fresh Farms To You</span>
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
              placeholder="Search vegetables..."
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

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition shadow-2xs shrink-0 ${
                    isActive
                      ? 'bg-[#0C4A34] text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3. ELEGANT 4-COLUMN PRODUCT CARDS ────────────────────────── */}
        <div>
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {filteredProducts.map((p) => {
                const qty = quantities[p.id] || 0;
                const isFavorited = Boolean(wishlist[p.id]);

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between relative group"
                  >
                    {/* Top row: Wishlist Heart */}
                    <div className="flex justify-end mb-1">
                      <button
                        type="button"
                        onClick={() => toggleWishlist(p.id)}
                        className="text-slate-300 hover:text-rose-500 transition p-1 -mr-1"
                        aria-label="Save to wishlist"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isFavorited ? 'fill-rose-500 text-rose-500' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Centered Vegetable Photo */}
                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#FBFBFA] border border-slate-100/90 mb-3">
                      <Image
                        src={getVegetableImageUrl(p.image_url, p.slug || p.name)}
                        alt={p.name}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Name & Unit */}
                    <div className="space-y-0.5">
                      <h4 className="font-black text-sm sm:text-base text-slate-900 truncate" title={p.name}>
                        {p.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {p.unit || '1 kg'}
                      </p>
                    </div>

                    {/* Price & In Stock Tag */}
                    <div className="flex items-center justify-between pt-2 mt-2">
                      <span className="text-sm sm:text-base font-black text-slate-900">
                        ₹{p.price}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        In stock
                      </span>
                    </div>

                    {/* Action Button at Bottom */}
                    <div className="pt-3 mt-1">
                      {qty > 0 ? (
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-black">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(p.id, qty - 1)}
                            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95"
                            aria-label={`Decrease ${p.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-black text-slate-900">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(p.id, qty + 1)}
                            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95"
                            aria-label={`Increase ${p.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(p.id, 1)}
                          className="w-full py-2.5 rounded-xl bg-[#0C4A34] hover:bg-[#093928] text-white font-bold text-xs sm:text-sm transition shadow-2xs active:scale-95"
                        >
                          Add
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
                {totalSelectedItems} items &nbsp;|&nbsp; ₹{subtotal}
              </div>
              <div className="text-[10px] text-emerald-200/80 hidden sm:block">
                Free Sunday Doorstep Delivery
              </div>
            </div>
          </div>

          {/* Right action */}
          <button
            type="button"
            onClick={handleReviewBasketClick}
            className="px-5 sm:px-6 py-2.5 rounded-full bg-white hover:bg-emerald-50 text-[#0C4A34] font-black text-xs sm:text-sm transition shadow-md flex items-center gap-1.5 active:scale-95"
          >
            <span>Review Basket</span>
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
