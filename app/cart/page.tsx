'use client';

import React, { useState } from 'react';
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
  const [discountAmount, setDiscountAmount] = useState(0);

  const deliveryFee = 0; // Free delivery for local zone
  const total = Math.max(0, subtotal - discountAmount + deliveryFee);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.trim().toUpperCase() === 'FIRST10' || couponCode.trim().toUpperCase() === 'EASYFARM') {
      const discount = Math.round(subtotal * 0.1);
      setDiscountAmount(discount);
      setCouponApplied(true);
    } else {
      alert('Invalid or expired coupon code. Try FIRST10 or EASYFARM.');
    }
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
                {items.map(({ basket, quantity, customizedItems }) => {
                  const isCustom = basket.slug?.includes('custom') || basket.id.endsWith('4');
                  const editHref = isCustom ? '/select-vegetables' : `/baskets/staple-basket#swapping-section`;

                  return (
                    <div
                      key={basket.id}
                      className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
                    >
                      {/* HEADER ROW */}
                      <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-emerald-50 shrink-0 border border-slate-100">
                          <Image
                            src={basket.image_url || '/images/hero-vegetables.png'}
                            alt={basket.name}
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-900">
                              {isCustom ? 'Custom Harvest Box' : 'Weekly Staple Box'}
                            </span>
                          </div>
                          <h3 className="font-black text-slate-900 text-lg mt-0.5 truncate">{basket.name}</h3>
                          <p className="text-xs text-slate-500 line-clamp-1">{basket.description}</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-black text-emerald-950">₹{basket.price}</span>
                            <span className="text-xs text-slate-400">/ box</span>
                          </div>
                        </div>

                        {/* QUANTITY & REMOVE */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                            <button
                              onClick={() => updateQuantity(basket.id, quantity - 1)}
                              className="px-2.5 py-1 hover:bg-slate-200 text-slate-700 transition"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2.5 font-bold text-xs">{quantity}</span>
                            <button
                              onClick={() => updateQuantity(basket.id, quantity + 1)}
                              className="px-2.5 py-1 hover:bg-slate-200 text-slate-700 transition"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(basket.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 transition"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>

                      {/* INCLUDED CROPS LIST BREAKDOWN */}
                      {customizedItems && customizedItems.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                            <span>Selected Vegetables ({customizedItems.length} items):</span>
                            <Link
                              href={editHref}
                              className="text-emerald-800 hover:text-emerald-950 font-black text-[11px] flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Vegetables</span>
                            </Link>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                            {customizedItems.map((cItem, cIdx) => (
                              <div
                                key={cIdx}
                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                              >
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 border border-slate-200/60">
                                    <Image
                                      src={getVegetableImageUrl(cItem.image_url, cItem.productName)}
                                      alt={cItem.productName}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                  <div className="truncate">
                                    <span className="font-bold text-slate-900 block truncate">{cItem.productName}</span>
                                    <span className="text-[10px] text-slate-400 block">{cItem.quantity} {cItem.unit}</span>
                                  </div>
                                </div>
                                {cItem.price !== undefined && (
                                  <span className="font-bold text-emerald-950 shrink-0">₹{cItem.price}</span>
                                )}
                              </div>
                            ))}
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
                    <span className="text-slate-600 block">Ghatkesar &amp; Pocharam, Hyderabad</span>
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
                      placeholder="e.g. FIRST10"
                      disabled={couponApplied}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-emerald-600 uppercase"
                    />
                    <button
                      type="submit"
                      disabled={couponApplied || !couponCode.trim()}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition"
                    >
                      {couponApplied ? 'Applied' : 'Apply'}
                    </button>
                  </div>
                  {couponApplied && (
                    <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Promo applied! 10% discount included.
                    </p>
                  )}
                </form>

                {/* BREAKDOWN */}
                <div className="space-y-3 text-xs pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Basket Subtotal:</span>
                    <span className="font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
                  </div>

                  {couponApplied && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Promo Discount:</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Ghatkesar &amp; Pocharam Delivery:</span>
                    <span className="font-bold text-emerald-700">FREE</span>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-black text-slate-900">
                    <span>Final Payable Amount:</span>
                    <span className="text-2xl font-black text-emerald-950">₹{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* CHECKOUT ACTION */}
                <div className="space-y-3 pt-2">
                  <Link
                    href="/checkout"
                    className="w-full py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-base flex items-center justify-center transition shadow-lg shadow-emerald-900/20 gap-2 min-h-[48px]"
                  >
                    <span>Proceed to Delivery &amp; Checkout</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>

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
