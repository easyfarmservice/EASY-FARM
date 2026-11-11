'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  ArrowLeft,
  Truck,
  MapPin,
  ShieldCheck,
  Tag,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { useCart } from '@/components/cart/CartProvider';
import { getVegetableImageUrl } from '@/lib/utils/vegetable-images';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, subtotal, totalItems } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponDescription, setCouponDescription] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isFreeDelivery, setIsFreeDelivery] = useState(true);

  // Easy Coins Basket Discount State (10 Easy Coins = ₹1 Rupee)
  const [availableCoins, setAvailableCoins] = useState<number>(150);
  const [appliedDiscountCoins, setAppliedDiscountCoins] = useState<number>(0);
  const [claimedItemsCoins, setClaimedItemsCoins] = useState<number>(0);

  useEffect(() => {
    // Fetch customer's available Easy Coins balance and persisted selections
    const loadCoinBalance = async () => {
      try {
        const cachedProfileId =
          typeof window !== 'undefined' ? localStorage.getItem('easyfarm_customer_profile_id') : null;
        const coinUrl = cachedProfileId
          ? `/api/easy-coins/balance?customerId=${encodeURIComponent(cachedProfileId)}`
          : '/api/easy-coins/balance';
        const res = await fetch(coinUrl, { cache: 'no-store' });
        const data = await res.json();
        if (data.success && typeof data.available_balance === 'number') {
          setAvailableCoins(data.available_balance);
        }
      } catch {}
    };
    loadCoinBalance();

    if (typeof window !== 'undefined') {
      window.addEventListener('easycoins-updated', loadCoinBalance);
    }

    if (typeof window !== 'undefined') {
      try {
        const savedDisc = localStorage.getItem('easyfarm_applied_discount_coins');
        if (savedDisc) {
          setAppliedDiscountCoins(Math.max(0, Math.floor(Number(savedDisc) || 0)));
        }
      } catch {}

      // Validate any saved claimed rewards against active catalog
      (async () => {
        try {
          const savedClaims = localStorage.getItem('easyfarm_claimed_rewards');
          if (!savedClaims) return;
          const parsed = JSON.parse(savedClaims);
          if (!Array.isArray(parsed) || parsed.length === 0) return;

          const rRes = await fetch('/api/easy-coins/rewards', { cache: 'no-store' });
          const rData = await rRes.json();
          const activeProds = Array.isArray(rData?.products) ? rData.products : [];
          const activeIds = new Set(activeProds.map((p: any) => p.id));

          const validClaims = parsed.filter((it: any) => it?.product?.id && activeIds.has(it.product.id));
          if (validClaims.length === 0) {
            localStorage.removeItem('easyfarm_claimed_rewards');
            setClaimedItemsCoins(0);
          } else {
            localStorage.setItem('easyfarm_claimed_rewards', JSON.stringify(validClaims));
            const cUsed = validClaims.reduce(
              (s: number, it: any) => s + (Number(it.product?.coin_cost) || 0) * (Number(it.quantity) || 1),
              0
            );
            setClaimedItemsCoins(cUsed);
          }
        } catch {}
      })();
    }
  }, []);

  const updateCartDiscountCoins = (coins: number) => {
    const clean = Math.max(0, Math.floor(Number(coins) || 0));
    setAppliedDiscountCoins(clean);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('easyfarm_applied_discount_coins', String(clean));
      } catch {}
    }
  };

  useEffect(() => {
    if (items.length === 0) {
      setDeliveryFee(0);
      setIsFreeDelivery(true);
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/checkout/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((i) => ({
              basketId: i.basket.id,
              quantity: i.quantity,
              customPrice: i.basket.price,
              compareAtPrice: i.basket.compare_at_price,
              customizedItems: i.customizedItems,
            })),
            couponCode: appliedCouponCode || undefined,
          }),
        });
        const data = await res.json();
        if (data.valid) {
          setDeliveryFee(data.deliveryFee ?? 0);
          setIsFreeDelivery(Boolean(data.isFreeDelivery));
        }
      } catch { }
    })();
  }, [items, appliedCouponCode]);

  const basePayableBeforeCoins = Math.max(0, subtotal - discountAmount + deliveryFee);
  const maxCoinsApplicable = Math.min(
    Math.max(0, availableCoins - claimedItemsCoins),
    Math.max(0, Math.floor(Math.max(0, basePayableBeforeCoins - 1) * 10))
  );
  const effectiveCoinsApplied = Math.min(appliedDiscountCoins, maxCoinsApplicable);
  const coinsDiscountAmount = Number((effectiveCoinsApplied / 10).toFixed(2));
  const total = Math.max(1, Number((basePayableBeforeCoins - coinsDiscountAmount).toFixed(2)));

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, subtotal }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCouponCode(data.code);
        setCouponCode(data.code);
        setDiscountAmount(data.discount_amount || 0);
        setCouponDescription(data.description || `${data.code} applied!`);
        setCouponApplied(true);
        setCouponError(null);
      } else {
        setCouponError(data.message || 'Invalid coupon code.');
        setCouponApplied(false);
        setAppliedCouponCode(null);
        setDiscountAmount(0);
      }
    } catch {
      setCouponError('Failed to validate coupon code. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(false);
    setAppliedCouponCode(null);
    setCouponCode('');
    setDiscountAmount(0);
    setCouponDescription(null);
    setCouponError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-16 md:pb-0">
      <Header />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* BREADCRUMB */}
        <div className="mb-6 flex items-center gap-2 text-xs sm:text-sm text-slate-500">
          <Link href="/" className="hover:text-emerald-800 transition">Home</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Basket Review &amp; Delivery Details</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-emerald-800" />
              Basket Review &amp; Delivery
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Review your selected vegetable items and confirm delivery arrangements before checkout.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center text-xs font-bold text-emerald-800 hover:text-emerald-950 transition gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm max-w-2xl mx-auto">
            <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto" />
            <h2 className="text-2xl font-black text-slate-800">Your basket is currently empty</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
              Explore our fresh weekly Staple Box or handpick individual vegetables with our Custom Box builder.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/baskets/staple-basket"
                className="px-6 py-3 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition shadow-md"
              >
                View Staple Box (₹185)
              </Link>
              <Link
                href="/select-vegetables"
                className="px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                Build Custom Box
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: BASKET ITEMS & DETAILS (7 COLS) */}
            <div className="lg:col-span-7 space-y-6">
              {/* ITEM CARDS */}
              <div className="space-y-4">
                {items.map(({ basket, quantity, customizedItems }, idx) => {
                  const b = basket || {};
                  const isCustom = Boolean(b.slug?.includes('custom') || (typeof b.id === 'string' && b.id.endsWith('4')));
                  const editHref = isCustom ? '/select-vegetables' : `/baskets/staple-basket#swapping-section`;
                  const vegetables = customizedItems && customizedItems.length > 0
                    ? customizedItems
                    : (b.items && b.items.length > 0
                        ? b.items.slice(0, 5).map((it: any) => ({
                            productId: it.product_id || it.product?.id,
                            productName: it.product?.name || it.product_name || 'Seasonal Item',
                            quantity: it.quantity || 1,
                            unit: it.unit || it.product?.unit || 'kg',
                            price: it.item_price || it.product?.price || 35,
                            image_url: it.product?.image_url,
                          }))
                        : []);

                  return (
                    <div
                      key={b.id || `cart-card-${idx}`}
                      className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
                    >
                      {/* HEADER ROW */}
                      <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-emerald-50 shrink-0 border border-slate-100">
                          <Image
                            src={
                              b.image_url && !b.image_url.includes('hero-vegetables')
                                ? b.image_url
                                : isCustom
                                  ? '/images/custom-box-veggies.jpg'
                                  : '/images/staple-box-banner.jpg'
                            }
                            alt={b.name || 'Easy Farm Box'}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-900">
                              {isCustom ? 'Custom Harvest Box' : 'Weekly Staple Box'}
                            </span>
                          </div>
                          <h3 className="font-black text-slate-900 text-lg mt-0.5 truncate">{b.name || 'Weekly Box'}</h3>
                          <p className="text-xs text-slate-500 line-clamp-1">{b.description || ''}</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-emerald-950">₹{b.price ?? 185}</span>
                            <span className="text-xs text-slate-400">/ box</span>
                          </div>
                        </div>

                        {/* QUANTITY & REMOVE */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                            <button
                              onClick={() => updateQuantity(b.id, quantity - 1)}
                              className="px-2.5 py-1 hover:bg-slate-200 text-slate-700 transition"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2.5 font-bold text-xs">{quantity}</span>
                            <button
                              onClick={() => updateQuantity(b.id, quantity + 1)}
                              className="px-2.5 py-1 hover:bg-slate-200 text-slate-700 transition"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(b.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 transition"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>

                      {/* INCLUDED CROPS LIST BREAKDOWN */}
                      {vegetables && vegetables.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                            <span>Selected Vegetables ({vegetables.length} items):</span>
                            <Link
                              href={editHref}
                              className="text-emerald-800 hover:text-emerald-950 font-black text-[11px] flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Vegetables</span>
                            </Link>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                            {vegetables.map((cItem: any, cIdx: number) => {
                              const displayQty = cItem.quantity ? `${cItem.quantity} ${cItem.unit || ''}`.trim() : cItem.unit || '';
                              const itemPrice = Number(cItem.price) || 0;

                              return (
                                <div
                                  key={cIdx}
                                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                                >
                                  <div className="flex items-center gap-2 truncate pr-2">
                                    <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 border border-slate-200/60">
                                      <Image
                                        src={getVegetableImageUrl(cItem.image_url, cItem.productName)}
                                        alt={cItem.productName || 'Vegetable'}
                                        fill
                                        unoptimized
                                        className="object-cover"
                                      />
                                    </div>
                                    <div className="truncate">
                                      <span className="font-bold text-slate-900 block truncate">{cItem.productName || 'Vegetable'}</span>
                                      {displayQty && (
                                        <span className="text-[10px] text-emerald-800 font-semibold block">
                                          ({displayQty})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="font-bold text-emerald-950 shrink-0">
                                    ₹{itemPrice}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* DELIVERY COMMITMENT & SERVICEABILITY PANEL */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
                  <Truck className="w-5 h-5 text-emerald-700" />
                  <span>Sunday Delivery Slot &amp; Serviceability</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                    <span className="font-bold text-emerald-950 block">Next Doorstep Delivery</span>
                    <span className="text-slate-600 block">Every Sunday, 8:00 AM &ndash; 6:00 PM</span>
                    <span className="text-[10px] text-emerald-800 font-semibold block">Order cutoff: Saturday 11:00 PM</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-900 block flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      Active Delivery Corridor
                    </span>
                    <span className="text-slate-600 block">Ghatkesar &amp; Pocharam, Hyderabad (Active)</span>
                    <span className="text-[10px] text-emerald-700 font-bold block flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      100% Free Doorstep Delivery
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: ORDER SUMMARY & CHECKOUT (5 COLS) */}
            <div className="lg:col-span-5 sticky top-24 space-y-5">
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-md space-y-6">
                <h2 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-3">
                  Order Summary
                </h2>

                {/* COUPON CODE FORM */}
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Have a promo or referral code?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="e.g. EASY50"
                      disabled={couponApplied || couponLoading}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-emerald-600 uppercase"
                    />
                    {couponApplied ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-xl transition"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={couponLoading || !couponCode.trim()}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition"
                      >
                        {couponLoading ? 'Checking...' : 'Apply'}
                      </button>
                    )}
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-red-600 font-semibold pl-1">
                      {couponError}
                    </p>
                  )}
                  {couponApplied && (
                    <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {couponDescription || `${appliedCouponCode} applied!`}
                    </p>
                  )}
                </form>

                {/* APPLY EASY COINS FOR BASKET PURCHASE DISCOUNT (10 COINS = ₹1) */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-emerald-50/70 border border-amber-300 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                          <span>🪙</span>
                          <span>Easy Coins Basket Discount</span>
                        </span>
                        <span className="text-[10px] font-black uppercase bg-amber-400 text-emerald-950 px-2 py-0.5 rounded-full">
                          10 Coins = ₹1
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Available:{' '}
                        <strong className="text-amber-900">
                          {Math.max(0, availableCoins - claimedItemsCoins)} Coins
                        </strong>{' '}
                        (Worth ₹{(Math.max(0, availableCoins - claimedItemsCoins) / 10).toFixed(2)})
                      </p>
                    </div>

                    {effectiveCoinsApplied > 0 ? (
                      <button
                        type="button"
                        onClick={() => updateCartDiscountCoins(0)}
                        className="px-2.5 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[11px] transition shrink-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={maxCoinsApplicable <= 0}
                        onClick={() => updateCartDiscountCoins(maxCoinsApplicable)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] transition disabled:opacity-40 shrink-0 cursor-pointer shadow-xs"
                      >
                        Apply Coins (-₹{(maxCoinsApplicable / 10).toFixed(2)})
                      </button>
                    )}
                  </div>

                  {maxCoinsApplicable > 0 && (
                    <div className="space-y-2 pt-1.5 border-t border-amber-200/70">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateCartDiscountCoins(Math.max(0, effectiveCoinsApplied - 10))}
                          className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-black text-[11px] hover:bg-amber-100 cursor-pointer"
                        >
                          -10
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={maxCoinsApplicable}
                          step={1}
                          value={effectiveCoinsApplied}
                          onChange={(e) => updateCartDiscountCoins(Number(e.target.value))}
                          className="flex-1 accent-emerald-800 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateCartDiscountCoins(Math.min(maxCoinsApplicable, effectiveCoinsApplied + 10))
                          }
                          className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-black text-[11px] hover:bg-amber-100 cursor-pointer"
                        >
                          +10
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">
                          Using <strong>{effectiveCoinsApplied}</strong> Easy Coins
                        </span>
                        <span className="font-black text-emerald-800">
                          Discount: -₹{coinsDiscountAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* BREAKDOWN */}
                <div className="space-y-3 text-xs pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Basket Subtotal:</span>
                    <span className="font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
                  </div>

                  {couponApplied && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Promo Discount ({appliedCouponCode}):</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {coinsDiscountAmount > 0 && (
                    <div className="flex justify-between text-amber-900 font-bold bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200">
                      <span>🪙 Easy Coins Discount ({effectiveCoinsApplied} Coins):</span>
                      <span className="text-emerald-800 font-black">-₹{coinsDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Ghatkesar &amp; Pocharam, Hyderabad (Active) Delivery:</span>
                    {deliveryFee === 0 || isFreeDelivery ? (
                      <span className="font-bold text-emerald-700">FREE</span>
                    ) : (
                      <span className="font-bold text-slate-900">₹{deliveryFee.toFixed(2)}</span>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-black text-slate-900">
                    <span>Final Payable Amount:</span>
                    <span className="text-2xl font-black text-emerald-950">₹{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* CHECKOUT ACTION */}
                <div className="space-y-3 pt-2">
                  {items.some((i) => {
                    const b = i.basket || {};
                    const isCustom = Boolean(b.slug?.includes('custom') || (typeof b.id === 'string' && b.id.endsWith('4')));
                    return isCustom && (i.customizedItems?.length || 0) < 4;
                  }) ? (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold text-center">
                        ⚠️ Minimum 4 items are required in Custom Box. Please select at least 4 vegetables to proceed.
                      </div>
                      <Link
                        href="/select-vegetables"
                        className="w-full py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-base flex items-center justify-center transition shadow-lg gap-2 min-h-[48px]"
                      >
                        <span>Select At Least 4 Items in Custom Box</span>
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href={appliedCouponCode ? `/checkout?coupon=${encodeURIComponent(appliedCouponCode)}` : '/checkout'}
                      className="w-full py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-base flex items-center justify-center transition shadow-lg shadow-emerald-900/20 gap-2 min-h-[48px]"
                    >
                      <span>Proceed to Delivery &amp; Checkout</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  )}

                  <Link
                    href="/"
                    className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs text-center block transition"
                  >
                    Add More Vegetables
                  </Link>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>100% Satisfaction Guarantee &bull; Cash/UPI upon delivery</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
