'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRightLeft,
  Calendar,
  Clock,
  LayoutGrid,
  ShoppingBag,
  ArrowRight,
  X,
  Check,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { Basket } from '@/types/database';
import { useCart } from '@/components/cart/CartProvider';
import { ReviewBasketDrawer } from '@/components/cart/ReviewBasketDrawer';
import { getNextDeliveryDate } from '@/lib/constants';

export interface StapleItem {
  id: string;
  name: string;
  slug?: string;
  price: number;
  market_price?: number | null;
  unit: string;
  quantity?: number | string;
  image_url?: string;
  active?: boolean;
  isSwapped?: boolean;
  replacedProductName?: string;
}

interface StapleBoxZeptoViewProps {
  basket: Basket;
  initialItems?: any[];
}

export function StapleBoxZeptoView({ basket, initialItems }: StapleBoxZeptoViewProps) {
  const { updateCustomizedBasket, totalItems: cartCount } = useCart();

  const [basketDetails, setBasketDetails] = useState<Basket>(basket);
  const [defaultItems, setDefaultItems] = useState<StapleItem[]>([]);
  const [currentItems, setCurrentItems] = useState<StapleItem[]>([]);
  const [eligibleAlternatives, setEligibleAlternatives] = useState<StapleItem[]>([]);

  // Swapping modal state
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [targetItemIndex, setTargetItemIndex] = useState<number | null>(null);
  const [selectedAltForModal, setSelectedAltForModal] = useState<StapleItem | null>(null);

  // Cart / Review Drawer state
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);

  // Limits
  const [maxSwaps, setMaxSwaps] = useState(3);
  const [swapsUsed, setSwapsUsed] = useState(0);
  const [cutoffPassed, setCutoffPassed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dynamic delivery dates
  const [deliveryInfo, setDeliveryInfo] = useState({
    deliveryDateStr: 'Sun, 12 Oct',
    cutoffDateStr: 'Thu, 9 Oct',
  });

  useEffect(() => {
    try {
      const { deliveryDate, cutoffDate, isOrderingOpen } = getNextDeliveryDate();
      setDeliveryInfo({
        deliveryDateStr: deliveryDate.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        cutoffDateStr: `${cutoffDate.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}, 11:00 PM`,
      });
      setCutoffPassed(!isOrderingOpen);
    } catch {
      // fallback
    }
  }, []);

  // Fetch latest weekly configuration from API/DB
  useEffect(() => {
    async function loadWeeklyConfig() {
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/baskets/${basket.id}/weekly`);
        const data = await res.json();

        if (data.success) {
          if (data.basketPrice) {
            setBasketDetails((prev) => ({
              ...prev,
              price: data.basketPrice,
              compare_at_price: data.basketComparePrice ?? prev.compare_at_price,
            }));
          }
          setMaxSwaps(data.maxSwaps ?? 3);
          setSwapsUsed(data.swapsUsed ?? 0);
          if (typeof data.isCutoffPassed === 'boolean') {
            setCutoffPassed(data.isCutoffPassed);
          }

          // Default fixed items (5 seasonal staples)
          const defaults: StapleItem[] = (data.defaultItems || []).map((it: any) => ({
            id: it.productId || it.product_id || it.id,
            name: it.productName || it.name,
            price: Number(it.price) || 35,
            market_price: it.compare_at_price ?? it.market_price ?? Math.round(Number(it.price || 35) * 1.25),
            quantity: it.quantity || 1,
            unit: it.unit || 'kg',
            image_url: it.image_url || '/images/hero-vegetables.png',
            active: it.active !== false,
          }));
          setDefaultItems(defaults);

          // Current chosen items
          const current: StapleItem[] = (data.currentItems || data.defaultItems || []).map((it: any) => ({
            id: it.productId || it.product_id || it.id,
            name: it.productName || it.name,
            price: Number(it.price) || 35,
            market_price: it.compare_at_price ?? it.market_price ?? Math.round(Number(it.price || 35) * 1.25),
            quantity: it.quantity || 1,
            unit: it.unit || 'kg',
            image_url: it.image_url || '/images/hero-vegetables.png',
            active: it.active !== false,
            isSwapped: Boolean(it.isSwapped),
            replacedProductName: it.replacedProductName,
          }));
          setCurrentItems(current.length > 0 ? current : defaults);

          // Eligible harvest alternatives
          const alts: StapleItem[] = (data.eligibleAlternatives || []).map((it: any) => ({
            id: it.id || it.productId,
            name: it.name || it.productName,
            price: Number(it.price) || 35,
            market_price: it.compare_at_price ?? it.market_price ?? Math.round(Number(it.price || 35) * 1.25),
            quantity: it.quantity || 1,
            unit: it.unit || 'kg',
            image_url: it.image_url || '/images/hero-vegetables.png',
            active: it.active !== false,
          }));
          setEligibleAlternatives(alts);
        } else if (initialItems && initialItems.length > 0) {
          const fallback = initialItems.slice(0, 5).map((it: any) => {
            const prod = it.product || {};
            return {
              id: prod.id || it.product_id,
              name: prod.name || it.product_name,
              price: it.item_price || prod.price || 35,
              market_price: it.compare_at_price || prod.market_price || Math.round((it.item_price || 35) * 1.25),
              quantity: it.quantity || 1,
              unit: it.unit || 'kg',
              image_url: prod.image_url || '/images/hero-vegetables.png',
              active: prod.active !== false,
            };
          });
          setDefaultItems(fallback);
          setCurrentItems(fallback);
        }
      } catch (err) {
        console.error('Error loading staple box config:', err);
        setErrorMsg('Unable to load live basket configuration. Please refresh.');
      }
    }

    loadWeeklyConfig();
  }, [basket.id, initialItems]);

  // Live dynamic basket price
  const basketTotal = useMemo(() => {
    if (currentItems.length === 0) return basketDetails.price || 185;
    return currentItems.reduce((acc, it) => acc + (it.price || 0), 0);
  }, [currentItems, basketDetails.price]);

  const swapsRemaining = Math.max(0, maxSwaps - swapsUsed);

  // Open swap modal
  const handleOpenSwap = (index: number) => {
    if (cutoffPassed) {
      alert('Customization cutoff for this week has passed (Saturday 11:00 PM).');
      return;
    }
    setTargetItemIndex(index);
    setSelectedAltForModal(null);
    setSwapModalOpen(true);
  };

  // Confirm replacement
  const handleConfirmSwap = () => {
    if (targetItemIndex === null || !selectedAltForModal) return;
    const target = currentItems[targetItemIndex];
    if (!target) return;

    if (!target.isSwapped && swapsRemaining <= 0) {
      alert('You have reached the limit of 3 swaps for this box.');
      return;
    }

    const alreadyInBox = currentItems.some(
      (it, idx) => idx !== targetItemIndex && it.id === selectedAltForModal.id
    );
    if (alreadyInBox) {
      alert(`'${selectedAltForModal.name}' is already included in your box.`);
      return;
    }

    const updated = [...currentItems];
    if (!target.isSwapped) {
      setSwapsUsed((prev) => prev + 1);
    }

    updated[targetItemIndex] = {
      ...selectedAltForModal,
      quantity: target.quantity,
      unit: target.unit,
      isSwapped: true,
      replacedProductName: target.isSwapped ? target.replacedProductName : target.name,
    };

    setCurrentItems(updated);
    setSwapModalOpen(false);
    setTargetItemIndex(null);
    setSelectedAltForModal(null);

    // Sync to cart automatically
    syncToCart(updated);
  };

  // Revert a swap back to default item
  const handleRevertSwap = (index: number) => {
    const original = defaultItems[index];
    if (!original) return;

    const updated = [...currentItems];
    updated[index] = { ...original, isSwapped: false, replacedProductName: undefined };
    setCurrentItems(updated);
    setSwapsUsed((prev) => Math.max(0, prev - 1));
    syncToCart(updated);
  };

  // Sync customized box state into CartProvider
  const syncToCart = (itemsToSync = currentItems) => {
    const total = itemsToSync.reduce((acc, it) => acc + (it.price || 0), 0);
    const customizedBasket: Basket = {
      ...basketDetails,
      price: total,
    };

    const cartPayload = itemsToSync.map((it) => ({
      productId: it.id,
      productName: it.name,
      quantity: Number(it.quantity) || 1,
      unit: it.unit,
      price: it.price,
      compare_at_price: it.market_price,
      image_url: it.image_url,
      isSwapped: it.isSwapped,
      replacedProductName: it.replacedProductName,
    }));

    updateCustomizedBasket(customizedBasket, cartPayload);
  };

  const handleReviewBasketClick = () => {
    syncToCart();
    setReviewDrawerOpen(true);
  };

  const currentSwapTarget = targetItemIndex !== null ? currentItems[targetItemIndex] : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA] text-slate-900 pb-32">
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* ── 1. PREMIUM PRODUCE HERO BANNER ──────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden border border-[#E6DECE] bg-gradient-to-r from-[#FAF6ED] via-[#F5EEE2] to-[#EAE0CF] shadow-xs p-6 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="md:col-span-7 space-y-4">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#0C4A34] inline-block">
                THE ESSENTIALS, EVERY WEEK
              </span>

              <h1 className="text-3xl sm:text-5xl font-black text-[#0B3B2C] tracking-tight">
                {basketDetails.name || 'Staple Box'}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md">
                Fresh, seasonal and essential vegetables for your family — curated by our farmers.
              </p>

              {/* Floating Pill Info Strip */}
              <div className="pt-2">
                <div className="inline-flex flex-wrap items-center gap-3 sm:gap-4 bg-white/85 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/80 shadow-xs text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                    <span>
                      <strong className="text-slate-900">Next Delivery:</strong> {deliveryInfo.deliveryDateStr}
                    </span>
                  </div>

                  <span className="text-slate-300 hidden sm:inline">|</span>

                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                    <span>
                      <strong className="text-slate-900">Order Cutoff:</strong> {deliveryInfo.cutoffDateStr}
                    </span>
                  </div>

                  <span className="text-slate-300 hidden sm:inline">|</span>

                  <div className="flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                    <span>{currentItems.length} Items Included</span>
                  </div>

                  <span className="text-slate-300 hidden sm:inline">|</span>

                  <div className="flex items-center gap-1.5 text-[#0C4A34] font-bold">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Up to {maxSwaps} Swaps</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Banner Card & Image */}
            <div className="md:col-span-5 relative flex items-center justify-center md:justify-end">
              {/* Fresh produce basket illustration / photo */}
              <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-2xl overflow-hidden border border-white/80 shadow-md bg-white">
                <Image
                  src="/images/staple-box-banner.jpg"
                  alt="Fresh Easy Farm Harvest Wicker Basket"
                  fill
                  sizes="320px"
                  priority
                  className="object-cover"
                />

                {/* Floating Basket Price Card */}
                <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-white shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                      Basket Price
                    </span>
                    <span className="text-xl font-black text-[#0B3B2C]">
                      ₹{basketTotal}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleReviewBasketClick}
                    className="px-4 py-2 rounded-xl bg-[#0C4A34] hover:bg-[#093928] text-white font-bold text-xs transition shadow-sm flex items-center gap-1 active:scale-95"
                  >
                    <span>View Basket</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ERROR MSG */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── 2. YOUR WEEKLY VEGETABLES SECTION ──────────────────────────── */}
        <div className="space-y-3">
          <div className="px-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Your Weekly Vegetables
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              5 essential vegetables, handpicked and packed for you.
            </p>
          </div>

          {/* White Card with Compact Horizontal Rows */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-100">
            {currentItems.map((item, idx) => (
              <div
                key={item.id + idx}
                className="flex items-center justify-between p-3.5 sm:p-5 hover:bg-slate-50/60 transition gap-4"
              >
                {/* Left: Vegetable Photo */}
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#F8F9FA] border border-slate-100 shrink-0 p-1 flex items-center justify-center">
                    <Image
                      src={item.image_url || '/images/hero-vegetables.png'}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 64px, 80px"
                      className="object-contain p-1"
                    />
                  </div>

                  {/* Middle: Details */}
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {item.quantity ? `${item.quantity} ${item.unit || ''}` : item.unit || 'unit'}
                    </p>

                    {item.isSwapped && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/60 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <ArrowRightLeft className="w-2.5 h-2.5 text-amber-700" />
                          <span>Swapped from {item.replacedProductName}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRevertSwap(idx)}
                          className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 underline"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Price & Swap Button */}
                <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                  <div className="text-right">
                    <div className="text-sm sm:text-base font-black text-slate-900">
                      ₹{item.price}
                    </div>
                    {item.market_price && item.market_price > item.price ? (
                      <div className="text-[11px] font-medium text-slate-400">
                        Market: ₹{item.market_price}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    disabled={cutoffPassed}
                    onClick={() => handleOpenSwap(idx)}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-emerald-700/60 bg-white hover:bg-emerald-50/80 text-[#0C4A34] font-bold text-xs sm:text-sm transition shadow-2xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Swap</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── 3. FIXED BOTTOM BASKET SUMMARY (FLOATING PILL) ───────────────── */}
      <div className="fixed bottom-4 inset-x-4 z-40 max-w-4xl mx-auto pointer-events-none">
        <div className="bg-[#0C4A34] text-white rounded-full sm:rounded-2xl p-2.5 sm:p-3 px-5 sm:px-6 shadow-2xl flex items-center justify-between gap-4 border border-emerald-800/80 pointer-events-auto">
          {/* Left info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-800/80 flex items-center justify-center text-white shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-white">
                {currentItems.length} items &nbsp;|&nbsp; ₹{basketTotal}
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

      {/* ── 4. SWAP ITEM MODAL (MATCHES REFERENCE BOTTOM-LEFT) ──────────── */}
      {swapModalOpen && currentSwapTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="text-base font-black text-slate-900">
                Swap Item
              </h3>
              <button
                type="button"
                onClick={() => setSwapModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Two Columns */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
              {/* Left Column: Current Item */}
              <div className="sm:col-span-5 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Current Item
                </span>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center space-y-3 shadow-2xs">
                  <div className="relative w-28 h-28 mx-auto rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <Image
                      src={currentSwapTarget.image_url || '/images/hero-vegetables.png'}
                      alt={currentSwapTarget.name}
                      fill
                      className="object-contain p-2"
                    />
                  </div>

                  <div>
                    <h4 className="text-base font-black text-slate-900">
                      {currentSwapTarget.name}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {currentSwapTarget.quantity ? `${currentSwapTarget.quantity} ${currentSwapTarget.unit || ''}` : currentSwapTarget.unit} | ₹{currentSwapTarget.price}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Choose an alternative */}
              <div className="sm:col-span-7 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Choose an alternative ({eligibleAlternatives.length})
                </span>

                <div className="border border-slate-200/90 rounded-2xl divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                  {eligibleAlternatives
                    .filter((alt) => alt.id !== currentSwapTarget.id)
                    .map((alt) => {
                      const isSelected = selectedAltForModal?.id === alt.id;
                      return (
                        <div
                          key={alt.id}
                          onClick={() => setSelectedAltForModal(alt)}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                            isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Radio Circle */}
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-[#0C4A34] bg-[#0C4A34]' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>

                            {/* Thumbnail */}
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-100 shrink-0">
                              <Image
                                src={alt.image_url || '/images/hero-vegetables.png'}
                                alt={alt.name}
                                fill
                                className="object-cover"
                              />
                            </div>

                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-slate-900 truncate">
                                {alt.name}
                              </h5>
                              <p className="text-[11px] text-slate-500">
                                {alt.quantity ? `${alt.quantity} ${alt.unit}` : alt.unit} | ₹{alt.price}
                                {alt.market_price && alt.market_price > alt.price ? (
                                  <span className="text-slate-400 ml-1">Market: ₹{alt.market_price}</span>
                                ) : null}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAltForModal(alt);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                              isSelected
                                ? 'bg-[#0C4A34] text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            Replace
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-[#FAF6ED]/50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSwapModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!selectedAltForModal}
                onClick={handleConfirmSwap}
                className="px-6 py-2.5 rounded-xl bg-[#0C4A34] hover:bg-[#093928] disabled:opacity-40 text-white font-bold text-xs transition shadow-md active:scale-95"
              >
                Confirm Replacement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. REVIEW BASKET / CART SLIDE-OVER DRAWER ─────────────────────── */}
      <ReviewBasketDrawer
        isOpen={reviewDrawerOpen}
        onClose={() => setReviewDrawerOpen(false)}
      />
    </div>
  );
}
