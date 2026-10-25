'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, ArrowLeft, ArrowRight, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from './CartProvider';
import { getVegetableImageUrl } from '@/lib/utils/vegetable-images';

interface ReviewBasketDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewBasketDrawer({ isOpen, onClose }: ReviewBasketDrawerProps) {
  const { items, updateQuantity, removeFromCart, subtotal, totalItems } = useCart();

  if (!isOpen) return null;

  const deliveryFee = subtotal >= 300 || subtotal === 0 ? 0 : 20;
  const grandTotal = subtotal + deliveryFee;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* DRAWER PANEL */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#FAF6ED]/60">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <h2 className="text-base font-black text-slate-900 tracking-tight">
            Your Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ITEMS LIST */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 text-slate-400">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">Your basket is empty</h3>
                <p className="text-xs text-slate-500">
                  Select fresh seasonal vegetables or customize your weekly basket to get started.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-full bg-[#0C4A34] text-white text-xs font-bold shadow-md hover:bg-[#093928] transition"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((cartItem) => {
                const b = cartItem.basket;
                const hasCustomized = cartItem.customizedItems && cartItem.customizedItems.length > 0;

                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3"
                  >
                    {/* BASKET HEADER IN CART */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                          <Image
                            src={
                              b.image_url && !b.image_url.includes('hero-vegetables')
                                ? b.image_url
                                : b.slug?.includes('custom') || b.id.endsWith('4')
                                ? '/images/custom-box-veggies.jpg'
                                : '/images/staple-box-banner.jpg'
                            }
                            alt={b.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{b.name}</h4>
                          <p className="text-xs font-bold text-emerald-800">
                            ₹{b.price} <span className="text-[11px] font-normal text-slate-500">/ box</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Stepper */}
                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => updateQuantity(b.id, cartItem.quantity - 1)}
                            className="p-1.5 hover:bg-slate-200 transition text-slate-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-black text-slate-900">{cartItem.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(b.id, cartItem.quantity + 1)}
                            className="p-1.5 hover:bg-slate-200 transition text-slate-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(b.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Remove from cart"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* CUSTOMIZED ITEM BREAKDOWN (IF CUSTOMIZED) */}
                    {hasCustomized && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Vegetables Included ({cartItem.customizedItems?.length}):
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-50">
                          {cartItem.customizedItems?.map((it, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs py-1 text-slate-700"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div className="relative w-7 h-7 rounded-lg overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                                  <Image
                                    src={getVegetableImageUrl(it.image_url, it.productName)}
                                    alt={it.productName}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                  />
                                </div>
                                <span className="font-semibold truncate">{it.productName}</span>
                                <span className="text-[11px] text-slate-400">({it.quantity} {it.unit})</span>
                              </div>
                              <span className="font-bold text-slate-900 shrink-0 ml-2">₹{it.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER SUMMARY & CHECKOUT BUTTON */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-[#FAF6ED]/70 space-y-3">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-black text-slate-900">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee (Sunday Doorstep)</span>
                <span className="font-bold text-emerald-800">
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm sm:text-base font-black text-slate-900">
                <span>Total Amount</span>
                <span className="text-[#0C4A34]">₹{grandTotal}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-xl bg-[#0C4A34] hover:bg-[#093928] text-white font-black text-sm transition shadow-lg shadow-[#0c4a34]/20 flex items-center justify-center gap-2 min-h-[48px] active:scale-98"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
