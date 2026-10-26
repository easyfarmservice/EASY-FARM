'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Gift, Sparkles, Check, AlertCircle, Info, ChevronRight, Package, ShieldCheck, X } from 'lucide-react';
import { RewardProduct, RewardCategory, EasyCoinsSettings } from '@/types/easy-coins';

interface RewardClaimSelectorProps {
  orderSubtotal: number;
  customerBalance: number;
  selectedReward: RewardProduct | null;
  onSelectReward: (reward: RewardProduct | null) => void;
  disabled?: boolean;
}

export function RewardClaimSelector({
  orderSubtotal,
  customerBalance,
  selectedReward,
  onSelectReward,
  disabled = false,
}: RewardClaimSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<RewardCategory[]>([]);
  const [products, setProducts] = useState<RewardProduct[]>([]);
  const [settings, setSettings] = useState<EasyCoinsSettings | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const res = await fetch(`/api/easy-coins/rewards?subtotal=${orderSubtotal}`);
        const data = await res.json();
        if (data.success) {
          setCategories(data.categories || []);
          setProducts(data.products || []);
          setSettings(data.settings || null);
        }
      } catch (err) {
        console.error('Failed to load reward products:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, [orderSubtotal]);

  if (settings && !settings.is_enabled) {
    return null;
  }

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter((p) => p.category_id === activeCategory || p.category_name?.toLowerCase().includes(activeCategory));

  const potentialCoinsEarned = settings
    ? Math.floor((orderSubtotal / 100) * settings.earn_rate_per_100_inr)
    : Math.floor((orderSubtotal / 100) * 10);

  return (
    <div className="bg-gradient-to-br from-emerald-950/90 via-emerald-900 to-emerald-950 border border-amber-500/30 rounded-3xl p-5 md:p-6 text-white shadow-xl relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-800/60 relative z-10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-emerald-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
            <Gift className="w-5 h-5 text-emerald-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Claim a Free Everyday Essential
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Easy Coins
                </span>
              </h3>
            </div>
            <p className="text-xs text-emerald-200/80 mt-0.5">
              Add 1 complimentary physical essential to your Sunday delivery basket using your loyalty coins.
            </p>
          </div>
        </div>

        {/* Live Balance Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-emerald-900/80 border border-amber-400/40 px-3.5 py-1.5 rounded-2xl shadow-inner">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-xs font-bold text-emerald-950 shadow-sm">
            🪙
          </div>
          <div className="text-left">
            <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold block leading-none">
              Your Easy Coins
            </span>
            <span className="text-sm font-black text-amber-300 leading-tight">
              {customerBalance} Coins
            </span>
          </div>
        </div>
      </div>

      {/* EARNING NOTICE BANNER */}
      <div className="my-3.5 bg-emerald-900/40 border border-emerald-700/50 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            You will earn <strong className="text-amber-300">+{potentialCoinsEarned} Easy Coins</strong> on today&apos;s harvest order!
          </span>
        </div>
        <span className="text-[11px] text-emerald-300/80 font-medium hidden sm:inline">
          Rate: 10 coins / ₹100
        </span>
      </div>

      {/* SELECTED REWARD CONFIRMATION CALLOUT */}
      {selectedReward && (
        <div className="mb-4 bg-amber-500/10 border-2 border-amber-400/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-emerald-950 border border-amber-400/30 relative shrink-0">
              <Image
                src={selectedReward.image_url || '/images/rewards/neem-comb.jpg'}
                alt={selectedReward.name}
                fill
                sizes="48px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300">Selected Reward:</span>
                <span className="text-[10px] bg-emerald-800 text-emerald-200 px-1.5 py-0.5 rounded font-medium">
                  {selectedReward.package_size}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white truncate">{selectedReward.name}</h4>
              <p className="text-[11px] text-emerald-300/90 font-medium">
                Cost: <span className="font-bold text-amber-300">{selectedReward.coin_cost} Coins</span> • <span className="text-emerald-400 font-bold">₹0.00 extra</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectReward(null)}
            className="p-2 rounded-xl bg-emerald-900/80 hover:bg-red-950/80 text-emerald-200 hover:text-red-300 border border-emerald-700/60 hover:border-red-500/50 transition shrink-0"
            title="Remove selected reward"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CATEGORY FILTER CHIPS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none pt-1">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeCategory === 'all'
              ? 'bg-amber-400 text-emerald-950 shadow-md shadow-amber-500/20'
              : 'bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-700/50'
          }`}
        >
          All Essentials ({products.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeCategory === cat.id
                ? 'bg-amber-400 text-emerald-950 shadow-md shadow-amber-500/20'
                : 'bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-700/50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* PRODUCTS HORIZONTAL SCROLL OR GRID */}
      {loading ? (
        <div className="py-8 text-center text-xs text-emerald-300 animate-pulse">
          Loading available physical rewards...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-6 text-center text-xs text-emerald-300/80">
          No rewards available in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {filteredProducts.map((prod) => {
            const isSelected = selectedReward?.id === prod.id;
            const hasEnoughCoins = customerBalance >= prod.coin_cost;
            const isOutOfStock = prod.stock_quantity <= 0;
            const canClaim = hasEnoughCoins && !isOutOfStock && !disabled;

            return (
              <div
                key={prod.id}
                className={`relative rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 border ${
                  isSelected
                    ? 'bg-emerald-900/90 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                    : isOutOfStock
                    ? 'bg-emerald-950/40 border-emerald-900/40 opacity-50'
                    : !hasEnoughCoins
                    ? 'bg-emerald-900/30 border-emerald-800/40 hover:border-emerald-700/60'
                    : 'bg-emerald-900/50 border-emerald-700/60 hover:border-amber-400/50 hover:bg-emerald-900/70'
                }`}
              >
                <div>
                  {/* Top Image + Badges */}
                  <div className="relative w-full h-28 rounded-xl overflow-hidden bg-emerald-950 border border-emerald-800/50 mb-2.5">
                    <Image
                      src={prod.image_url || '/images/rewards/neem-comb.jpg'}
                      alt={prod.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />

                    {/* Cost Badge */}
                    <div className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-emerald-950/90 backdrop-blur-md border border-amber-400/60 text-amber-300 text-xs font-black shadow-md flex items-center gap-1">
                      <span>🪙</span>
                      <span>{prod.coin_cost}</span>
                    </div>

                    {/* Stock Status Badge */}
                    <div className="absolute bottom-2 left-2">
                      {isOutOfStock ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-950/90 text-red-300 border border-red-500/40 backdrop-blur-sm">
                          Out of Stock
                        </span>
                      ) : prod.stock_quantity <= 5 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-500/40 backdrop-blur-sm">
                          Only {prod.stock_quantity} Left
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/40 backdrop-blur-sm">
                          {prod.package_size}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Brand */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-emerald-300/80">
                      <span>{prod.brand || 'Easy Farm'}</span>
                      <span className="font-semibold text-emerald-400">₹0 added</span>
                    </div>
                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                      {prod.name}
                    </h4>
                    <p className="text-[11px] text-emerald-200/70 line-clamp-1">
                      {prod.description}
                    </p>
                  </div>
                </div>

                {/* Claim / Select Action */}
                <div className="pt-3 mt-2 border-t border-emerald-800/40">
                  {isSelected ? (
                    <button
                      type="button"
                      onClick={() => onSelectReward(null)}
                      className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Claimed Free (Click to Remove)
                    </button>
                  ) : !hasEnoughCoins ? (
                    <div className="text-center py-1.5 text-[11px] font-medium text-amber-200/60 bg-emerald-950/50 rounded-xl border border-emerald-800/40">
                      Need {prod.coin_cost - customerBalance} more coins
                    </div>
                  ) : isOutOfStock ? (
                    <div className="text-center py-1.5 text-[11px] font-medium text-slate-400 bg-emerald-950/50 rounded-xl">
                      Currently Unavailable
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onSelectReward(prod);
                        setErrorNotice(null);
                      }}
                      className="w-full py-2 bg-emerald-800/90 hover:bg-amber-500 hover:text-emerald-950 text-white font-bold text-xs rounded-xl border border-emerald-600/60 hover:border-amber-400 transition flex items-center justify-center gap-1.5"
                    >
                      <span>Claim for {prod.coin_cost} Coins</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTER POLICIES NOTE */}
      <div className="mt-4 pt-3 border-t border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-emerald-300/80 gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Max 1 reward product per order. Delivered free inside your vegetable box.</span>
        </div>
        <div className="text-[10px] text-emerald-400/90 font-medium">
          Easy Coins have no monetary cash value and do not alter vegetable bill totals.
        </div>
      </div>
    </div>
  );
}
