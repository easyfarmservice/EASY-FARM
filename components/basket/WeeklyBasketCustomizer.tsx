'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRightLeft,
  CheckCircle,
  AlertTriangle,
  Clock,
  Check,
  ShoppingBag,
  ArrowRight,
  TrendingDown,
  RotateCcw,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import { Basket } from '@/types/database';

export interface CustomizerItem {
  productId: string;
  productName: string;
  quantity: number | string;
  unit: string;
  price: number;
  compare_at_price?: number | null;
  image_url?: string;
  isSwapped?: boolean;
  replacedProductId?: string;
  replacedProductName?: string;
}

export interface AlternativeProduct {
  id: string;
  name: string;
  price: number;
  compare_at_price?: number | null;
  unit: string;
  quantity?: number | string;
  image_url?: string;
  active: boolean;
  market_source?: string;
  market_updated_at?: string | null;
}

interface WeeklyBasketCustomizerProps {
  basketId: string;
  basketName: string;
  basketPrice: number;
  basketComparePrice?: number;
  basketImageUrl?: string;
  customerId?: string;
  onCustomizationSaved?: (items: CustomizerItem[]) => void;
}

export function WeeklyBasketCustomizer({
  basketId,
  basketName: initialBasketName,
  basketPrice: initialBasketPrice,
  basketComparePrice: initialBasketComparePrice,
  basketImageUrl: initialBasketImageUrl,
  customerId = 'guest_customer_1',
  onCustomizationSaved,
}: WeeklyBasketCustomizerProps) {
  const router = useRouter();
  const { updateCustomizedBasket } = useCart();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isInactive, setIsInactive] = useState(false);
  const [inactiveMessage, setInactiveMessage] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [basketName, setBasketName] = useState(initialBasketName);
  const [basketImageUrl, setBasketImageUrl] = useState(initialBasketImageUrl);
  const [isCustomBasket, setIsCustomBasket] = useState(false);

  const [deliveryWeek, setDeliveryWeek] = useState<string>('');
  const [isCutoffPassed, setIsCutoffPassed] = useState(false);
  const [maxSwaps, setMaxSwaps] = useState(3);
  const [swapsUsed, setSwapsUsed] = useState(0);

  const [defaultItems, setDefaultItems] = useState<CustomizerItem[]>([]);
  const [currentItems, setCurrentItems] = useState<CustomizerItem[]>([]);
  const [eligibleAlternatives, setEligibleAlternatives] = useState<AlternativeProduct[]>([]);

  // Selection state for swapping
  const [selectedTargetIndex, setSelectedTargetIndex] = useState<number | null>(null);
  const [activeAltForPicker, setActiveAltForPicker] = useState<AlternativeProduct | null>(null);

  // Cart quantity
  const [cartQuantity, setCartQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  // Fetch authentic basket configuration directly from backend API
  const fetchWeeklyData = async () => {
    setLoading(true);
    setIsInactive(false);
    setInactiveMessage(null);

    try {
      const res = await fetch(`/api/baskets/${basketId}/weekly?customerId=${customerId}`);
      const data = await res.json();

      if (!res.ok || data.inactive) {
        setIsInactive(true);
        setInactiveMessage(data.message || 'This basket is currently unpublished or inactive.');
        return;
      }

      if (data.success) {
        if (data.basketName) setBasketName(data.basketName);
        if (data.basketImageUrl) setBasketImageUrl(data.basketImageUrl);
        setIsCustomBasket(Boolean(data.isCustomBasket));
        setDeliveryWeek(data.deliveryWeek || '');
        setIsCutoffPassed(Boolean(data.isCutoffPassed));
        setMaxSwaps(data.maxSwaps ?? 3);
        setSwapsUsed(data.swapsUsed ?? 0);

        const mappedDefaults: CustomizerItem[] = (data.defaultItems || []).map((it: any) => ({
          productId: it.productId || it.product_id || it.id,
          productName: it.productName || it.name,
          quantity: it.quantity || 1,
          unit: it.unit || 'kg',
          price: Number(it.price) || 0,
          compare_at_price: typeof it.compare_at_price === 'number' && it.compare_at_price > 0 ? it.compare_at_price : null,
          image_url: it.image_url || '/images/hero-vegetables.png',
        }));
        setDefaultItems(mappedDefaults);

        const mappedCurrent: CustomizerItem[] = (data.currentItems || data.defaultItems || []).map((it: any) => ({
          productId: it.productId || it.product_id || it.id,
          productName: it.productName || it.name,
          quantity: it.quantity || 1,
          unit: it.unit || 'kg',
          price: Number(it.price) || 0,
          compare_at_price: typeof it.compare_at_price === 'number' && it.compare_at_price > 0 ? it.compare_at_price : null,
          image_url: it.image_url || '/images/hero-vegetables.png',
          isSwapped: Boolean(it.isSwapped),
          replacedProductId: it.replacedProductId,
          replacedProductName: it.replacedProductName,
        }));
        setCurrentItems(mappedCurrent);

        const mappedAlts: AlternativeProduct[] = (data.eligibleAlternatives || []).map((it: any) => ({
          id: it.id || it.productId,
          name: it.name || it.productName,
          price: Number(it.price) || 0,
          compare_at_price: typeof it.compare_at_price === 'number' && it.compare_at_price > 0 ? it.compare_at_price : null,
          unit: it.unit || 'kg',
          quantity: it.quantity || 1,
          image_url: it.image_url || '/images/hero-vegetables.png',
          active: it.active !== false,
          market_source: it.market_source,
          market_updated_at: it.market_updated_at,
        }));
        setEligibleAlternatives(mappedAlts);
      }
    } catch (e: any) {
      console.error('Failed to load weekly basket customizer:', e);
      setErrorMsg('Failed to load basket configuration from backend. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyData();
  }, [basketId, customerId]);

  // Dynamic price calculations summing CURRENT chosen items
  const dynamicTotals = useMemo(() => {
    if (currentItems.length === 0) {
      const defaultP = initialBasketPrice || 0;
      const defaultC = initialBasketComparePrice || null;
      return {
        basketPrice: defaultP,
        comparePrice: defaultC,
        hasComparePrice: defaultC !== null && defaultC > defaultP,
        savings: defaultC !== null && defaultC > defaultP ? defaultC - defaultP : 0,
        savingsPct: defaultC !== null && defaultC > defaultP ? Math.round(((defaultC - defaultP) / defaultC) * 100) : 0,
      };
    }

    const calculatedPrice = currentItems.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
    const hasAnyCompare = currentItems.some((it) => typeof it.compare_at_price === 'number' && it.compare_at_price > 0);
    const calculatedCompare = hasAnyCompare
      ? currentItems.reduce((acc, it) => acc + (it.compare_at_price ? Number(it.compare_at_price) : Number(it.price)), 0)
      : null;

    const savings = calculatedCompare !== null && calculatedCompare > calculatedPrice ? calculatedCompare - calculatedPrice : 0;
    const savingsPct = calculatedCompare !== null && calculatedCompare > calculatedPrice ? Math.round((savings / calculatedCompare) * 100) : 0;

    return {
      basketPrice: calculatedPrice,
      comparePrice: calculatedCompare,
      hasComparePrice: calculatedCompare !== null && calculatedCompare > calculatedPrice,
      savings,
      savingsPct,
    };
  }, [currentItems, initialBasketPrice, initialBasketComparePrice]);

  const swapsRemaining = Math.max(0, maxSwaps - swapsUsed);

  // Handle swapping a specific item for fixed baskets
  const executeSwap = (targetIdx: number, alt: AlternativeProduct) => {
    if (isCutoffPassed) {
      setErrorMsg('Customization is locked for this week as the cutoff time has passed.');
      return;
    }

    const alreadySelected = currentItems.some(
      (it, idx) => idx !== targetIdx && it.productId === alt.id
    );
    if (alreadySelected) {
      alert(`'${alt.name}' is already in your selected basket items.`);
      return;
    }

    const updated = [...currentItems];
    const prevItem = updated[targetIdx];

    if (!prevItem.isSwapped && !isCustomBasket) {
      if (swapsRemaining <= 0) {
        setErrorMsg('You have used all 3 swaps for this delivery week.');
        return;
      }
      setSwapsUsed((prev) => prev + 1);
    }

    updated[targetIdx] = {
      productId: alt.id,
      productName: alt.name,
      quantity: alt.quantity || prevItem.quantity,
      unit: alt.unit || prevItem.unit,
      price: alt.price,
      compare_at_price: alt.compare_at_price,
      image_url: alt.image_url || '/images/hero-vegetables.png',
      isSwapped: true,
      replacedProductId: prevItem.isSwapped ? prevItem.replacedProductId : prevItem.productId,
      replacedProductName: prevItem.isSwapped ? prevItem.replacedProductName : prevItem.productName,
    };

    setCurrentItems(updated);
    setSelectedTargetIndex(null);
    setActiveAltForPicker(null);
    setErrorMsg(null);
  };

  // Toggle item for Custom Basket (add / remove)
  const toggleCustomBasketItem = (alt: AlternativeProduct) => {
    const existingIndex = currentItems.findIndex((it) => it.productId === alt.id);
    if (existingIndex !== -1) {
      // Remove
      if (currentItems.length <= 1) {
        alert('Custom Basket must contain at least 1 harvest item.');
        return;
      }
      setCurrentItems(currentItems.filter((_, idx) => idx !== existingIndex));
    } else {
      // Add
      setCurrentItems([
        ...currentItems,
        {
          productId: alt.id,
          productName: alt.name,
          quantity: alt.quantity || 1,
          unit: alt.unit || 'kg',
          price: alt.price,
          compare_at_price: alt.compare_at_price,
          image_url: alt.image_url || '/images/hero-vegetables.png',
          isSwapped: false,
        },
      ]);
    }
  };

  // Revert a swapped item back to original default
  const handleRevertItem = (idx: number) => {
    const item = currentItems[idx];
    if (!item.isSwapped) return;

    const originalDefault = defaultItems[idx];
    setSwapsUsed((prev) => Math.max(0, prev - 1));

    const updated = [...currentItems];
    if (originalDefault) {
      updated[idx] = {
        ...originalDefault,
        isSwapped: false,
        replacedProductId: undefined,
        replacedProductName: undefined,
      };
    } else {
      updated[idx] = {
        ...item,
        isSwapped: false,
        replacedProductId: undefined,
        replacedProductName: undefined,
      };
    }
    setCurrentItems(updated);
    setSelectedTargetIndex(null);
  };

  // Customized basket object
  const getCustomizedBasketObject = (): Basket => {
    return {
      id: basketId,
      name: basketName,
      slug: basketId,
      description: `Includes ${currentItems.map((i) => i.productName).join(', ')}`,
      price: dynamicTotals.basketPrice,
      compare_at_price: dynamicTotals.comparePrice || undefined,
      image_url: basketImageUrl || '/images/hero-vegetables.png',
      active: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  const handleAddToCart = () => {
    if (isInactive) return;
    const basketObj = getCustomizedBasketObject();
    updateCustomizedBasket(basketObj, currentItems, cartQuantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2200);
  };

  const handleProceedToCheckout = () => {
    if (isInactive) return;
    const basketObj = getCustomizedBasketObject();
    updateCustomizedBasket(basketObj, currentItems, cartQuantity);
    router.push('/checkout');
  };

  const handleSaveCustomization = async () => {
    if (isCutoffPassed || isInactive) {
      setErrorMsg('Cannot save changes: this basket is currently locked or inactive.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/baskets/customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          basketId,
          deliveryWeek,
          items: currentItems,
          swapsUsed,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save customization');
      }

      setSuccessMsg('Your customized basket is locked in for Sunday delivery! Harvest begins Saturday morning.');
      if (onCustomizationSaved) {
        onCustomizationSaved(currentItems);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving basket customization');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-100 rounded-md w-1/3"></div>
        <div className="h-28 bg-slate-50 rounded-2xl"></div>
        <div className="h-28 bg-slate-50 rounded-2xl"></div>
      </div>
    );
  }

  // SAFE INACTIVE / UNPUBLISHED STATE HANDLER
  if (isInactive) {
    return (
      <div className="p-8 bg-rose-50 border-2 border-rose-200 rounded-3xl text-rose-950 space-y-4 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-black text-rose-950">Basket Currently Unavailable</h3>
        <p className="text-sm text-rose-800 max-w-md mx-auto leading-relaxed">
          {inactiveMessage || 'This basket is currently unpublished or deactivated by farm operations. Orders cannot be accepted.'}
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => router.push('/#baskets')}
            className="px-6 py-2.5 bg-rose-800 text-white rounded-xl text-xs font-bold hover:bg-rose-900 transition shadow-xs"
          >
            ← View Available Weekly Baskets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. TOP HEADER & STATUS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Customize {basketName} Items &amp; Pricing
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Next Delivery: <strong>Sunday ({deliveryWeek || 'Upcoming'})</strong> &bull; Cutoff: <strong>Saturday 11:00 PM</strong></span>
            </p>
          </div>

          {/* SWAP COUNTER BADGE */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isCustomBasket ? (
              <span className="px-3.5 py-1.5 bg-purple-50 text-purple-700 text-xs font-black rounded-full border border-purple-200">
                Full Catalogue &bull; Unlimited Selections
              </span>
            ) : (
              <div
                className={`px-4 py-2 rounded-2xl border text-xs font-black flex items-center gap-2 ${
                  swapsRemaining > 0
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 shadow-2xs'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  {swapsRemaining > 0
                    ? `${swapsRemaining} of ${maxSwaps} Swaps Remaining`
                    : 'All 3 Swaps Used'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SECTION 1: SELECTED HARVEST ITEMS */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                {isCustomBasket ? 'Your Custom Harvest Selection' : 'Step 1: Your 5 Fixed Harvest Items'}
              </span>
              <h3 className="text-lg font-black text-slate-900">
                Current Basket Selection ({currentItems.length} Crops)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              {isCustomBasket
                ? 'Pick any crops from the harvest catalogue below'
                : 'Tap "Swap this item" to pick an alternative crop below'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {currentItems.map((item, idx) => {
              const itemSavings = item.compare_at_price && item.compare_at_price > item.price
                ? item.compare_at_price - item.price
                : null;
              const isSelectedForSwap = selectedTargetIndex === idx;

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
                    isSelectedForSwap
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20'
                      : item.isSwapped
                      ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* CROP IMAGE */}
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      <Image
                        src={item.image_url || '/images/hero-vegetables.png'}
                        alt={item.productName}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                        {idx + 1}
                      </div>
                      {item.isSwapped && (
                        <div className="absolute top-2 right-2 bg-emerald-700 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                          SWAPPED
                        </div>
                      )}
                    </div>

                    {/* CROP DETAILS */}
                    <div>
                      <h4 className="text-sm font-black text-slate-900 truncate">
                        {item.productName}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {item.quantity} {item.unit}
                      </p>
                      {item.replacedProductName && (
                        <p className="text-[11px] text-emerald-800 font-bold mt-0.5">
                          Replaced: {item.replacedProductName}
                        </p>
                      )}
                    </div>

                    {/* ITEM PRICE & MARKET REFERENCE */}
                    <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100">
                      <span className="text-base font-black text-emerald-950">
                        ₹{item.price}
                      </span>
                      {item.compare_at_price && item.compare_at_price > item.price ? (
                        <span className="text-xs line-through text-slate-400 font-medium">
                          ₹{item.compare_at_price}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">
                          Mandi benchmark
                        </span>
                      )}
                      {itemSavings !== null && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded ml-auto">
                          -₹{itemSavings}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTION BUTTON */}
                  <div className="pt-2">
                    {isCustomBasket ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (currentItems.length <= 1) {
                            alert('Custom Basket must contain at least 1 item.');
                            return;
                          }
                          setCurrentItems(currentItems.filter((_, i) => i !== idx));
                        }}
                        className="w-full py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold rounded-xl border border-rose-200 transition"
                      >
                        Remove Crop
                      </button>
                    ) : item.isSwapped ? (
                      <button
                        type="button"
                        onClick={() => handleRevertItem(idx)}
                        disabled={isCutoffPassed}
                        className="w-full py-2 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl border border-slate-300 transition shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Undo Swap</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTargetIndex(isSelectedForSwap ? null : idx);
                          setActiveAltForPicker(null);
                        }}
                        disabled={isCutoffPassed || swapsRemaining <= 0}
                        className={`w-full py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                          isSelectedForSwap
                            ? 'bg-emerald-900 text-white shadow-xs'
                            : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{isSelectedForSwap ? 'Selected (Pick Below)' : 'Swap this item'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedTargetIndex !== null && !isCustomBasket && (
            <div className="p-3 bg-emerald-100/70 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center justify-between">
              <span>
                👉 Now pick an alternative crop below to replace <strong>{currentItems[selectedTargetIndex]?.productName}</strong>.
              </span>
              <button
                type="button"
                onClick={() => setSelectedTargetIndex(null)}
                className="text-xs text-emerald-800 underline hover:text-emerald-950 font-black"
              >
                Cancel Selection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: REQUIRED RESPONSIVE TWO-COLUMN GRID FOR ELIGIBLE ALTERNATIVES */}
      <div className="bg-white rounded-3xl border border-amber-200/80 shadow-sm p-6 sm:p-8 space-y-5">
        <div>
          <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider block">
            {isCustomBasket ? 'Step 2: Complete Harvest Catalogue' : 'Step 2: Eligible Swap Alternatives'}
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-0.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              {isCustomBasket
                ? `Complete Harvest Catalogue (${eligibleAlternatives.length} Crops Available)`
                : `Eligible Swap Crops for ${basketName}`}
            </h3>
            <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full self-start sm:self-auto">
              Fresh Telangana Harvest
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isCustomBasket
              ? 'Browse all crops currently eligible for Custom Basket. Toggle any crop to add or remove it from your weekly basket.'
              : 'Browse all administrator-configured eligible alternatives for this basket. Tap "Swap In" to swap with your selection.'}
          </p>
        </div>

        {/* RESPONSIVE TWO-COLUMN GRID REQUIREMENT */}
        {eligibleAlternatives.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-sm">
            <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-bold">No swap alternatives are currently available for this basket.</p>
            <p className="text-xs text-slate-400 mt-0.5">All weekly allocations are strictly configured for harvest balance.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eligibleAlternatives.map((alt) => {
              const isAlreadyInBasket = currentItems.some((it) => it.productId === alt.id);
              const targetItem = selectedTargetIndex !== null ? currentItems[selectedTargetIndex] : null;
              const priceDiff = targetItem ? alt.price - targetItem.price : null;
              const hasCompare = typeof alt.compare_at_price === 'number' && alt.compare_at_price > alt.price;
              const altSavings = hasCompare ? alt.compare_at_price! - alt.price : null;

              return (
                <div
                  key={alt.id}
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
                    isAlreadyInBasket
                      ? isCustomBasket
                        ? 'border-purple-300 bg-purple-50/40 shadow-xs'
                        : 'border-slate-200 bg-slate-50/80 opacity-70'
                      : 'border-slate-200 bg-white hover:border-amber-400 hover:shadow-xs'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* CROP IMAGE */}
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <Image
                        src={alt.image_url || '/images/hero-vegetables.png'}
                        alt={alt.name}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                      <div className="absolute top-1.5 left-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                        {isCustomBasket ? 'HARVEST' : 'SWAP'}
                      </div>
                    </div>

                    {/* CROP INFO & CENTRALIZED PRICING */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-base font-black text-slate-900 truncate">
                          {alt.name}
                        </h4>
                        {isAlreadyInBasket && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                            Included
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 font-medium">
                        Configured Unit: <strong>{alt.quantity || 1} {alt.unit}</strong>
                      </p>

                      {/* SELLING PRICE & MARKET REFERENCE */}
                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-lg font-black text-emerald-950">
                          ₹{alt.price}
                        </span>
                        {hasCompare ? (
                          <span className="text-xs line-through text-slate-400 font-medium">
                            ₹{alt.compare_at_price}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Market price unavailable
                          </span>
                        )}
                        {altSavings !== null && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded ml-auto">
                            Save ₹{altSavings}
                          </span>
                        )}
                      </div>

                      {/* PRICE DELTA PREVIEW */}
                      {priceDiff !== null && !isAlreadyInBasket && !isCustomBasket && (
                        <div
                          className={`text-[11px] font-black px-2 py-0.5 rounded-md mt-1 ${
                            priceDiff > 0
                              ? 'bg-amber-100 text-amber-900'
                              : priceDiff < 0
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {priceDiff > 0
                            ? `Basket price +₹${priceDiff}`
                            : priceDiff < 0
                            ? `Basket price -₹${Math.abs(priceDiff)}`
                            : 'Same price (₹0 delta)'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACTION BUTTON */}
                  <div className="pt-2 border-t border-slate-100">
                    {isCustomBasket ? (
                      <button
                        type="button"
                        onClick={() => toggleCustomBasketItem(alt)}
                        className={`w-full py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                          isAlreadyInBasket
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-purple-700 hover:bg-purple-800 text-white shadow-xs'
                        }`}
                      >
                        {isAlreadyInBasket ? (
                          <span>Remove from Basket ✕</span>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to Custom Basket (+₹{alt.price})</span>
                          </>
                        )}
                      </button>
                    ) : isAlreadyInBasket ? (
                      <div className="py-2 bg-slate-100 text-slate-500 rounded-xl text-center text-xs font-bold">
                        Already in current 5 selection
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isCutoffPassed || swapsRemaining <= 0}
                        onClick={() => {
                          if (selectedTargetIndex !== null) {
                            executeSwap(selectedTargetIndex, alt);
                          } else {
                            setActiveAltForPicker(alt);
                          }
                        }}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>
                          {selectedTargetIndex !== null
                            ? `Replace ${currentItems[selectedTargetIndex]?.productName} with ${alt.name}`
                            : `Swap In ${alt.name} (₹${alt.price})`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* INLINE PICKER IF CLICKED SWAP IN WITHOUT CHOOSING TARGET ITEM FIRST */}
        {activeAltForPicker && !isCustomBasket && (
          <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-900 tracking-wider">
                Select which item to replace with {activeAltForPicker.name}:
              </span>
              <button
                type="button"
                onClick={() => setActiveAltForPicker(null)}
                className="text-xs text-slate-500 hover:text-slate-900 font-bold"
              >
                ✕ Cancel
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {currentItems.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => executeSwap(idx, activeAltForPicker)}
                  className="p-3 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl text-left text-xs font-bold text-slate-900 transition flex flex-col justify-between gap-1 shadow-2xs"
                >
                  <span className="font-black truncate">{item.productName}</span>
                  <span className="text-slate-500 text-[11px]">{item.quantity} {item.unit} &bull; ₹{item.price}</span>
                  <span className="text-[10px] text-emerald-700 font-black mt-1">Tap to Replace &rarr;</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: DYNAMIC PRICING CALCULATION & PURCHASE */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white shadow-2xl space-y-6">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-emerald-300 block">
            Step 3: Live Dynamic Price Calculation &amp; Checkout
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
            {isCustomBasket
              ? `Dynamic Calculation Based on Your ${currentItems.length} Chosen Crops`
              : 'Dynamic Calculation Based on Your 5 Chosen Items'}
          </h3>
        </div>

        {/* PRICE FORMULA DISPLAY */}
        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-2">
          <div className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
            Item Price Breakdown:
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold text-white">
            {currentItems.map((it, idx) => (
              <span key={idx} className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-lg">
                <span>{it.productName}</span>
                <span className="text-emerald-300 font-black">₹{it.price}</span>
                {idx < currentItems.length - 1 && <span className="text-white/60 pl-1">+</span>}
              </span>
            ))}
            <span className="text-emerald-400 font-black text-base pl-1">
              = ₹{dynamicTotals.basketPrice}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs text-slate-300">
            <div>
              <span>Mandi / Market Compare Price: </span>
              {dynamicTotals.hasComparePrice ? (
                <span className="line-through text-slate-400 font-bold">₹{dynamicTotals.comparePrice}</span>
              ) : (
                <span className="text-slate-400 italic">Market price unavailable</span>
              )}
            </div>
            {dynamicTotals.savings > 0 && (
              <div className="text-amber-300 font-black flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />
                <span>You Save ₹{dynamicTotals.savings} ({dynamicTotals.savingsPct}% OFF)</span>
              </div>
            )}
          </div>
        </div>

        {/* OVERALL TOTAL AND ACTION BUTTONS */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 pt-2">
          <div className="space-y-1">
            <span className="text-xs text-slate-300 uppercase tracking-wider font-bold">Total Basket Price:</span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-black text-emerald-300">
                ₹{dynamicTotals.basketPrice * cartQuantity}
              </span>
              {cartQuantity > 1 && (
                <span className="text-xs text-slate-300">
                  (₹{dynamicTotals.basketPrice} × {cartQuantity} Baskets)
                </span>
              )}
            </div>
          </div>

          {/* QUANTITY CONTROL & PRIMARY PROCEED BUTTON */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* QUANTITY CONTROL */}
            <div className="flex items-center justify-between bg-white/15 px-4 py-3 rounded-2xl border border-white/20">
              <span className="text-xs font-bold text-emerald-100 pr-3">Quantity:</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCartQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-black text-base text-white w-6 text-center">{cartQuantity}</span>
                <button
                  type="button"
                  onClick={() => setCartQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ADD TO CART */}
            <button
              type="button"
              onClick={handleAddToCart}
              className={`py-4 px-6 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 shadow-lg min-h-[52px] ${
                addedToCart
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white'
              }`}
            >
              {addedToCart ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Added to Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>

            {/* PROCEED TO PURCHASE / CHECKOUT */}
            <button
              type="button"
              onClick={handleProceedToCheckout}
              className="py-4 px-8 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm sm:text-base transition flex items-center justify-center gap-2 shadow-xl min-h-[52px]"
            >
              <span>Proceed to Purchase →</span>
            </button>
          </div>
        </div>

        {/* LOCK IN FOR SUNDAY DELIVERY BACKEND OPTION */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Guaranteed Sunday Doorstep Delivery in Ghatkesar &amp; Pocharam</span>
          </div>
          <button
            type="button"
            onClick={handleSaveCustomization}
            disabled={saving || isCutoffPassed}
            className="text-xs font-bold text-emerald-300 underline hover:text-white transition disabled:opacity-50 text-left sm:text-right"
          >
            {saving ? 'Saving...' : 'Lock in customized selection for Sunday'}
          </button>
        </div>
      </div>
    </div>
  );
}
