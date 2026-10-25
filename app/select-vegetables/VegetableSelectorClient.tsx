'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Minus,
  Check,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Trash2,
  CheckCircle2,
  Filter,
  Leaf,
  Info
} from 'lucide-react';
import { Product, Basket } from '@/types/database';
import { useCart } from '@/components/cart/CartProvider';
import { getVegetableImageUrl } from '@/lib/utils/vegetable-images';

interface SelectedItem {
  product: Product;
  quantity: number;
  unit: string;
}

interface VegetableSelectorClientProps {
  products: Product[];
  customBasket: Basket;
}

const CATEGORIES = [
  { id: 'all', label: 'All Vegetables' },
  { id: 'essentials', label: 'Daily Essentials' },
  { id: 'greens', label: 'Leafy Greens' },
  { id: 'gourds', label: 'Gourds & Squash' },
  { id: 'roots', label: 'Root Veggies' },
  { id: 'exotics', label: 'Gourmet & Exotic' },
];

export function VegetableSelectorClient({ products, customBasket }: VegetableSelectorClientProps) {
  const router = useRouter();
  const { updateCustomizedBasket, addToCart } = useCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Map of selected items: productId -> { product, quantity, unit }
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(() => {
    // Default initial selection with 5 staple items if none chosen
    const initial = new Map<string, SelectedItem>();
    const defaults = products.filter((p) =>
      ['tomato', 'onion', 'potato', 'carrot', 'spinach-palak'].includes(p.slug)
    );
    defaults.forEach((p) => {
      initial.set(p.id, {
        product: p,
        quantity: 1,
        unit: p.unit || 'kg',
      });
    });
    return initial;
  });

  // Assign category to products based on slug or name
  const categorizedProducts = useMemo(() => {
    return products.map((p) => {
      let category = 'essentials';
      const s = p.slug.toLowerCase();
      if (s.includes('palak') || s.includes('spinach') || s.includes('thotakura') || s.includes('leaves') || s.includes('coriander') || s.includes('curry')) {
        category = 'greens';
      } else if (s.includes('gourd') || s.includes('cucumber') || s.includes('okra') || s.includes('bhendi') || s.includes('beans') || s.includes('brinjal')) {
        category = 'gourds';
      } else if (s.includes('potato') || s.includes('carrot') || s.includes('beetroot') || s.includes('onion')) {
        category = 'roots';
      } else if (s.includes('broccoli') || s.includes('corn') || s.includes('mushroom') || s.includes('zucchini') || s.includes('capsicum')) {
        category = 'exotics';
      }
      return { ...p, categoryTag: category };
    });
  }, [products]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return categorizedProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || p.categoryTag === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [categorizedProducts, searchQuery, selectedCategory]);

  // Total price and count calculations
  const totalCount = useMemo(() => {
    return Array.from(selectedItems.values()).reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedItems]);

  const uniqueCropCount = selectedItems.size;

  const totalPrice = useMemo(() => {
    return Array.from(selectedItems.values()).reduce((sum, item) => {
      const pricePerUnit = Number(item.product.price) || 0;
      return sum + pricePerUnit * item.quantity;
    }, 0);
  }, [selectedItems]);

  const totalMarketPrice = useMemo(() => {
    return Array.from(selectedItems.values()).reduce((sum, item) => {
      const marketPrice = item.product.market_price && item.product.market_price > 0
        ? Number(item.product.market_price)
        : Math.round((Number(item.product.price) || 0) * 1.25);
      return sum + marketPrice * item.quantity;
    }, 0);
  }, [selectedItems]);

  const totalSavings = Math.max(0, totalMarketPrice - totalPrice);

  // Handlers for modifying quantity
  const handleAddOrIncrement = (product: Product) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(product.id);
      if (existing) {
        next.set(product.id, {
          ...existing,
          quantity: existing.quantity + 1,
        });
      } else {
        next.set(product.id, {
          product,
          quantity: 1,
          unit: product.unit || 'kg',
        });
      }
      return next;
    });
  };

  const handleDecrementOrRemove = (productId: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        next.delete(productId);
      } else {
        next.set(productId, {
          ...existing,
          quantity: existing.quantity - 1,
        });
      }
      return next;
    });
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  };

  // Continue to Basket Review
  const handleContinueToReview = () => {
    if (uniqueCropCount === 0) {
      alert('Please select at least 1 vegetable to build your Custom Box.');
      return;
    }

    // Convert selected items to cart customized items format
    const customizedList = Array.from(selectedItems.values()).map(({ product, quantity, unit }) => ({
      productId: product.id,
      productName: product.name,
      quantity,
      unit,
      price: (Number(product.price) || 0) * quantity,
      compare_at_price: (product.market_price || Math.round((product.price || 0) * 1.25)) * quantity,
      image_url: product.image_url,
    }));

    // Update custom basket pricing with calculated sum
    const dynamicCustomBasket: Basket = {
      ...customBasket,
      price: totalPrice,
      compare_at_price: totalMarketPrice,
    };

    updateCustomizedBasket(dynamicCustomBasket, customizedList, 1);
    router.push('/cart');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* TOP BREADCRUMB & HEADER */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
          <Link href="/" className="hover:text-emerald-800 transition">Home</Link>
          <span>/</span>
          <Link href="/baskets/custom-basket" className="hover:text-emerald-800 transition">Custom Box</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Select Your Vegetables</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              Telangana Harvest Catalogue
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-2">
              Select Your Vegetables
            </h1>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl leading-relaxed">
              Handpick the exact crops and quantities you need for your household. Prices are directly linked to live farm mandi reference rates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleContinueToReview}
              disabled={uniqueCropCount === 0}
              className="px-6 py-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-black text-sm rounded-2xl transition shadow-md flex items-center gap-2"
            >
              <span>Continue to Basket Review</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH AND CATEGORY FILTER BAR */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vegetables by name (e.g. Tomato, Palak, Carrot)..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-emerald-600 shadow-2xs placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* CATEGORY PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                selectedCategory === cat.id
                  ? 'bg-emerald-800 border-emerald-800 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT: PRODUCTS GRID + LIVE SELECTED SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* PRODUCT CATALOGUE GRID (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Showing {filteredProducts.length} vegetables</span>
            <span>Telangana harvest fresh</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <Leaf className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-base">No vegetables match your search</h3>
              <p className="text-xs text-slate-400">Try searching for a different vegetable or clearing your filters.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-xs font-bold text-emerald-700 underline"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const selected = selectedItems.get(p.id);
                const quantity = selected?.quantity || 0;
                const isSelected = quantity > 0;
                const price = Number(p.price) || 35;
                const comparePrice = p.market_price && p.market_price > price ? p.market_price : null;

                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-3xl border p-4 flex flex-col justify-between transition duration-200 ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* PRODUCT IMAGE */}
                      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 mb-3 border border-slate-100">
                        <Image
                          src={getVegetableImageUrl(p.image_url, p.slug || p.name)}
                          alt={p.name}
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-emerald-950/90 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                          Local Harvest
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>{quantity} Added</span>
                          </div>
                        )}
                      </div>

                      {/* NAME & UNIT */}
                      <h3 className="font-black text-slate-900 text-sm truncate">{p.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">{p.unit || '1 kg'}</p>

                      {/* PRICE & MARKET REFERENCE */}
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-base font-black text-emerald-950">₹{price}</span>
                        {comparePrice && (
                          <span className="text-xs line-through text-slate-400 font-medium">₹{comparePrice}</span>
                        )}
                        {comparePrice && comparePrice > price && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded ml-auto">
                            Save ₹{comparePrice - price}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      {isSelected ? (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => handleDecrementOrRemove(p.id)}
                            className="p-1.5 hover:bg-emerald-200/60 rounded-lg text-emerald-900 transition min-w-[32px] min-h-[32px] flex items-center justify-center"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-black text-xs text-emerald-950 px-2">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleAddOrIncrement(p)}
                            className="p-1.5 hover:bg-emerald-200/60 rounded-lg text-emerald-900 transition min-w-[32px] min-h-[32px] flex items-center justify-center"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddOrIncrement(p)}
                          className="w-full py-2 bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Box</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SELECTED ITEMS PANEL (4 COLS) */}
        <div className="lg:col-span-4 sticky top-24 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900">Your Custom Box</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {uniqueCropCount} unique crops ({totalCount} total items)
                </p>
              </div>
              <span className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-black text-sm">
                {uniqueCropCount}
              </span>
            </div>

            {/* SELECTED ITEMS LIST */}
            {uniqueCropCount === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">Your custom box is currently empty.</p>
                <p className="text-[11px] text-slate-400">Click &quot;Add to Box&quot; on any vegetable above.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {Array.from(selectedItems.values()).map(({ product, quantity, unit }) => {
                  const lineTotal = (Number(product.price) || 0) * quantity;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                        <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-white shrink-0 border border-slate-200">
                          <Image
                            src={getVegetableImageUrl(product.image_url, product.slug || product.name)}
                            alt={product.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <div className="truncate min-w-0">
                          <p className="font-bold text-slate-900 truncate">{product.name}</p>
                          <p className="text-[10px] text-slate-500">{quantity} &times; {unit}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-slate-900">₹{lineTotal}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(product.id)}
                          className="text-slate-400 hover:text-rose-600 transition p-1"
                          aria-label={`Remove ${product.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TOTAL PRICING BREAKDOWN */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Box Subtotal:</span>
                <span className="font-bold text-slate-900">₹{totalPrice}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Market MRP:</span>
                <span className="line-through text-slate-400">₹{totalMarketPrice}</span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Your Savings:</span>
                  <span>Save ₹{totalSavings}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Amount:</span>
                <span className="text-emerald-800 text-xl font-black">₹{totalPrice}</span>
              </div>
            </div>

            {/* CONTINUE CTA */}
            <button
              onClick={handleContinueToReview}
              disabled={uniqueCropCount === 0}
              className="w-full py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 transition shadow-md min-h-[48px]"
            >
              <span>Continue to Basket Review</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="bg-emerald-50 rounded-xl p-3 text-[11px] text-emerald-950 font-medium flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Sunday Doorstep Delivery to Ghatkesar &amp; Pocharam</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
