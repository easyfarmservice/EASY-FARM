'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Check, ArrowRightLeft, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, SlidersHorizontal, Eye } from 'lucide-react';
import { Basket } from '@/types/database';
import { useCart } from '@/components/cart/CartProvider';

interface BasketShowcaseProps {
  baskets: Basket[];
}

export function BasketShowcase({ baskets }: BasketShowcaseProps) {
  const { addToCart } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);

  // Strictly ensure only the TWO active boxes: Staple Box and Custom Box
  const activeBaskets = (baskets && baskets.length > 0 ? baskets : [])
    .filter((b) => b.active !== false && !b.slug?.includes('green') && !b.slug?.includes('special') && !b.id.endsWith('2') && !b.id.endsWith('3'))
    .slice(0, 2);

  // If DB hasn't populated both yet, use clean fallback for Staple + Custom
  const displayBaskets: Basket[] = activeBaskets.length >= 2 ? activeBaskets : [
    activeBaskets.find(b => b.slug?.includes('staple') || b.id.endsWith('1')) || {
      id: '33333333-0000-0000-0000-000000000001',
      name: 'Staple Box',
      slug: 'staple-basket',
      description: 'Predefined weekly farm-fresh vegetable basket for everyday cooking. 5 seasonal staples with up to 3 flexible swaps.',
      price: 185,
      compare_at_price: 240,
      image_url: '/images/staple-box-banner.jpg',
      active: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    activeBaskets.find(b => b.slug?.includes('custom') || b.id.endsWith('4')) || {
      id: '33333333-0000-0000-0000-000000000004',
      name: 'Custom Box',
      slug: 'custom-basket',
      description: 'Handpick your preferred vegetables and custom quantities from our full 24-crop Telangana harvest catalogue.',
      price: 450,
      compare_at_price: 580,
      image_url: '/images/custom-box-veggies.jpg',
      active: true,
      sort_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const handleQuickAdd = (b: Basket, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (b.active === false) return;
    addToCart(b);
    setAddedId(b.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-white via-slate-50/50 to-white scroll-mt-20" id="boxes">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            Curated Farm-To-Home Boxes
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Our Two Weekly Boxes
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Plucked straight from local Telangana soil every Saturday, delivered fresh to your door in Ghatkesar &amp; Pocharam every Sunday. Choose our curated essential Staple Box or build your own Custom Box.
          </p>
        </div>

        {/* 2 BOXES SHOWCASE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 max-w-5xl mx-auto items-stretch">
          {displayBaskets.map((b) => {
            const isCustom = b.slug?.includes('custom') || b.id.endsWith('4');
            const detailHref = `/baskets/${b.slug || b.id}`;
            const customizeHref = isCustom ? `/baskets/${b.slug || b.id}` : `/baskets/${b.slug || b.id}#customize`;
            const allItems = b.items || [];
            const fixedItems = isCustom
              ? allItems.slice(0, 5)
              : allItems.filter((it: any) => it.is_fixed !== false && it.is_default !== false).slice(0, 5);
            const swapItems = isCustom
              ? []
              : allItems.filter((it: any) => it.is_fixed === false || it.is_default === false).slice(0, 3);

            const boxImage = isCustom
              ? (b.image_url && !b.image_url.includes('hero-vegetables') ? b.image_url : '/images/custom-box-veggies.jpg')
              : (b.image_url && !b.image_url.includes('hero-vegetables') ? b.image_url : '/images/staple-box-banner.jpg');

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl border border-emerald-100/80 shadow-md hover:shadow-2xl hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between overflow-hidden group relative"
              >
                <div>
                  {/* CARD IMAGE CONTAINER */}
                  <div className="relative h-64 sm:h-72 w-full bg-emerald-50/50 overflow-hidden">
                    <Image
                      src={boxImage}
                      alt={b.name}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

                    {/* TOP BADGE */}
                    <div className="absolute top-4 left-4">
                      {isCustom ? (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-700 text-white shadow-md flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          Custom Builder
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-700 text-white shadow-md flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Weekly Staple Box
                        </span>
                      )}
                    </div>

                    {/* PRICE BADGE */}
                    <div className="absolute top-4 right-4 bg-emerald-950/95 backdrop-blur-md text-white px-3.5 py-1.5 rounded-2xl shadow-xl border border-emerald-700/60 flex items-baseline gap-2">
                      <span className="font-black text-xl text-white">₹{b.price}</span>
                      {b.compare_at_price && b.compare_at_price > b.price && (
                        <span className="text-xs line-through text-emerald-300/80 font-medium">₹{b.compare_at_price}</span>
                      )}
                    </div>

                    {/* BOTTOM IMAGE TITLE OVERLAY */}
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="text-2xl font-black drop-shadow-sm tracking-tight text-white flex items-center justify-between">
                        <span>{b.name}</span>
                        {b.compare_at_price && b.compare_at_price > b.price ? (
                          <span className="text-[11px] font-black bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full shadow">
                            Save ₹{b.compare_at_price - b.price}
                          </span>
                        ) : null}
                      </h3>
                    </div>
                  </div>

                  {/* CONTENT BODY */}
                  <div className="p-6 sm:p-7 space-y-5">
                    <p className="text-slate-600 text-sm leading-relaxed min-h-[40px]">
                      {b.description}
                    </p>

                    {/* CONTENT BREAKDOWN */}
                    {isCustom ? (
                      <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-purple-950">
                          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                            <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                            Full Telangana Harvest Catalogue
                          </span>
                          <span className="bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full font-black text-[10px]">
                            24 Fresh Crops
                          </span>
                        </div>
                        <p className="text-xs text-purple-900/80 leading-normal">
                          Choose any mix of tomatoes, leafy greens, root veggies, and gourmet produce with real-time mandi price calculation and no fixed item restrictions.
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-purple-900 pt-1">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>Select exact weights</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>Transparent pricing</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>Zero minimum swaps</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>Sunday doorstep delivery</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* 5 DEFAULTS */}
                        <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                            <span className="uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              5 Curated Seasonal Items
                            </span>
                            <span className="bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-black text-[10px]">
                              Included
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {fixedItems.length > 0 ? (
                              fixedItems.map((item: any, idx: number) => {
                                const prod = item.product || {};
                                const name = prod.name || item.product_name || `Crop ${idx + 1}`;
                                const price = item.item_price || prod.price || 35;
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-white border border-emerald-100/70 text-slate-800"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                      <span className="font-bold truncate">{name}</span>
                                      <span className="text-slate-400 font-medium">({item.quantity} {item.unit})</span>
                                    </div>
                                    <span className="font-black text-slate-900 ml-1 shrink-0">₹{price}</span>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-xs text-slate-500 py-1">Tomato (1kg), Onion (1kg), Potato (1kg), Carrot (500g), Brinjal (500g)</div>
                            )}
                          </div>
                        </div>

                        {/* 3 SWAP OPTIONS */}
                        {swapItems.length > 0 && (
                          <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                              <span className="uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700" />
                                3 Swap Options Allowed
                              </span>
                              <span className="bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full font-black text-[10px]">
                                Max 3 Swaps
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {swapItems.map((item: any, idx: number) => {
                                const prod = item.product || {};
                                const name = prod.name || item.product_name || `Swap Option`;
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-white border border-amber-200 px-2 py-1 rounded-lg shadow-2xs"
                                  >
                                    <span className="text-amber-600 font-black">⇄</span>
                                    <span>{name}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* CARD FOOTER ACTIONS */}
                <div className="p-6 sm:p-7 pt-0 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                      href={detailHref}
                      className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <Eye className="w-4 h-4 text-slate-600" />
                      <span>{isCustom ? 'View Box Details' : 'View What\'s Included'}</span>
                    </Link>

                    <Link
                      href={detailHref}
                      className="py-3 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-1.5"
                    >
                      <span>{isCustom ? 'Build Your Box' : 'Customize Staple Box'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {!isCustom && (
                    <button
                      type="button"
                      onClick={(e) => handleQuickAdd(b, e)}
                      className={`w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold transition border flex items-center justify-center gap-2 ${
                        addedId === b.id
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-950 font-black'
                          : 'bg-white hover:bg-emerald-50/50 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      {addedId === b.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-700" />
                          <span>Added to Cart!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4 text-emerald-700" />
                          <span>Quick Add Default Box</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
