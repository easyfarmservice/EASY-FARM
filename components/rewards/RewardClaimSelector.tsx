'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Gift,
  Sparkles,
  Check,
  ShieldCheck,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import {
  RewardProduct,
  RewardCategory,
  EasyCoinsSettings,
  ClaimedRewardSelection,
} from '@/types/easy-coins';

interface RewardClaimSelectorProps {
  orderSubtotal: number;
  customerBalance: number;
  selectedRewards?: ClaimedRewardSelection[];
  onUpdateRewards?: (rewards: ClaimedRewardSelection[]) => void;
  appliedDiscountCoins?: number;
  onUpdateDiscountCoins?: (coins: number) => void;
  // Backward-compatible single-item props
  selectedReward?: RewardProduct | null;
  onSelectReward?: (reward: RewardProduct | null) => void;
  disabled?: boolean;
}

export function RewardClaimSelector({
  orderSubtotal,
  customerBalance,
  selectedRewards: externalRewards,
  onUpdateRewards,
  appliedDiscountCoins: externalDiscountCoins,
  onUpdateDiscountCoins,
  selectedReward,
  onSelectReward,
  disabled = false,
}: RewardClaimSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<RewardCategory[]>([]);
  const [products, setProducts] = useState<RewardProduct[]>([]);
  const [settings, setSettings] = useState<EasyCoinsSettings | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [internalRewards, setInternalRewards] = useState<ClaimedRewardSelection[]>([]);
  const [internalDiscountCoins, setInternalDiscountCoins] = useState<number>(0);

  // Resolve active list of claimed items
  const claimedRewards: ClaimedRewardSelection[] =
    externalRewards !== undefined
      ? externalRewards
      : selectedReward
      ? [{ product: selectedReward, quantity: 1 }]
      : internalRewards;

  const discountCoinsUsed =
    externalDiscountCoins !== undefined ? externalDiscountCoins : internalDiscountCoins;

  const updateDiscountCoins = (nextCoins: number) => {
    const cleanCoins = Math.max(0, Math.floor(Number(nextCoins) || 0));
    setInternalDiscountCoins(cleanCoins);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('easyfarm_applied_discount_coins', String(cleanCoins));
      } catch {}
    }
    if (onUpdateDiscountCoins) {
      onUpdateDiscountCoins(cleanCoins);
    }
  };

  const updateRewardsList = (next: ClaimedRewardSelection[]) => {
    setInternalRewards(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('easyfarm_claimed_rewards', JSON.stringify(next));
      } catch {}
    }
    if (onUpdateRewards) {
      onUpdateRewards(next);
    }
    if (onSelectReward) {
      onSelectReward(next[0]?.product || null);
    }
  };

  useEffect(() => {
    // Load persisted discount coins from localStorage on mount
    if (typeof window !== 'undefined' && !externalDiscountCoins) {
      try {
        const savedDisc = localStorage.getItem('easyfarm_applied_discount_coins');
        if (savedDisc) {
          const parsedCoins = Math.max(0, Math.floor(Number(savedDisc) || 0));
          const clamped = Math.min(parsedCoins, Math.max(0, customerBalance));
          if (clamped > 0) {
            setInternalDiscountCoins(clamped);
            if (onUpdateDiscountCoins) onUpdateDiscountCoins(clamped);
          }
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerBalance]);

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const res = await fetch(`/api/easy-coins/rewards?subtotal=${orderSubtotal}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (data.success) {
          const activeProds: RewardProduct[] = (data.products || []).filter(
            (p: RewardProduct) => p.is_active && !p.is_archived
          );
          setCategories(data.categories || []);
          setProducts(activeProds);
          setSettings(data.settings || null);

          const activeIds = new Set(activeProds.map((p) => p.id));

          if (activeProds.length === 0) {
            // All items are disabled: clear any claimed extra items immediately
            updateRewardsList([]);
            if (typeof window !== 'undefined') {
              try {
                localStorage.removeItem('easyfarm_claimed_rewards');
              } catch {}
            }
          } else if (typeof window !== 'undefined') {
            // Hydrate only active items from localStorage or filter existing claims
            try {
              const saved = localStorage.getItem('easyfarm_claimed_rewards');
              const parsed: ClaimedRewardSelection[] = saved ? JSON.parse(saved) : [];
              const sourceList =
                externalRewards && externalRewards.length > 0
                  ? externalRewards
                  : Array.isArray(parsed)
                  ? parsed
                  : [];
              const validClaims = sourceList.filter(
                (r) => r?.product?.id && activeIds.has(r.product.id)
              );
              const totalSavedCoins = validClaims.reduce(
                (sum, item) =>
                  sum + (Number(item.product?.coin_cost) || 0) * (Number(item.quantity) || 1),
                0
              );
              if (totalSavedCoins <= customerBalance) {
                updateRewardsList(validClaims);
              } else {
                updateRewardsList([]);
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error('Failed to load reward products:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderSubtotal]);

  if (loading || (settings && !settings.is_enabled) || products.length === 0) {
    return null;
  }

  const rewardItemsCoinsUsed = claimedRewards.reduce(
    (sum, r) => sum + (Number(r.product.coin_cost) || 0) * (Number(r.quantity) || 1),
    0
  );
  const maxCoinsForBasketDiscount = Math.min(
    Math.max(0, customerBalance - rewardItemsCoinsUsed),
    Math.max(0, Math.floor(Math.max(0, orderSubtotal - 1) * 10))
  );
  const effectiveDiscountCoins = Math.min(discountCoinsUsed, maxCoinsForBasketDiscount);
  const discountRupees = Number((effectiveDiscountCoins / 10).toFixed(2));
  const totalCoinsUsed = rewardItemsCoinsUsed + effectiveDiscountCoins;
  const remainingCoins = Math.max(0, customerBalance - totalCoinsUsed);
  const totalItemsClaimed = claimedRewards.reduce(
    (sum, r) => sum + (Number(r.quantity) || 1),
    0
  );

  const handleAddOrIncrement = (prod: RewardProduct) => {
    if (disabled) return;
    const availableIfReallocating = customerBalance - rewardItemsCoinsUsed;
    if (availableIfReallocating < prod.coin_cost) return;

    const existing = claimedRewards.find((r) => r.product.id === prod.id);
    let nextRewards: ClaimedRewardSelection[];
    if (existing) {
      if (existing.quantity >= prod.stock_quantity) return;
      nextRewards = claimedRewards.map((r) =>
        r.product.id === prod.id ? { ...r, quantity: r.quantity + 1 } : r
      );
    } else {
      nextRewards = [...claimedRewards, { product: prod, quantity: 1 }];
    }

    const newItemCoins = nextRewards.reduce(
      (sum, r) => sum + (Number(r.product.coin_cost) || 0) * (Number(r.quantity) || 1),
      0
    );
    if (newItemCoins + effectiveDiscountCoins > customerBalance) {
      updateDiscountCoins(Math.max(0, customerBalance - newItemCoins));
    }
    updateRewardsList(nextRewards);
  };

  const handleDecrement = (productId: string) => {
    if (disabled) return;
    const existing = claimedRewards.find((r) => r.product.id === productId);
    if (!existing) return;

    if (existing.quantity <= 1) {
      updateRewardsList(claimedRewards.filter((r) => r.product.id !== productId));
    } else {
      updateRewardsList(
        claimedRewards.map((r) =>
          r.product.id === productId ? { ...r, quantity: r.quantity - 1 } : r
        )
      );
    }
  };

  const handleRemoveItem = (productId: string) => {
    if (disabled) return;
    updateRewardsList(claimedRewards.filter((r) => r.product.id !== productId));
  };

  const filteredProducts =
    activeCategory === 'all'
      ? products
      : products.filter(
          (p) =>
            p.category_id === activeCategory ||
            p.category_name?.toLowerCase().includes(activeCategory)
        );

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
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Claim Extra Items with Easy Coins
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Unlimited up to Balance
                </span>
              </h3>
            </div>
            <p className="text-xs text-emerald-200/80 mt-0.5">
              Claim any number of everyday household essentials up to your Easy Coins balance — delivered free inside your basket!
            </p>
          </div>
        </div>

        {/* Live Balance & Remaining Pill */}
        <div className="flex items-center gap-3 self-start sm:self-auto bg-emerald-900/80 border border-amber-400/40 px-3.5 py-2 rounded-2xl shadow-inner shrink-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-xs font-bold text-emerald-950 shadow-sm">
            🪙
          </div>
          <div className="text-left">
            <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold block leading-none">
              Available Balance: {customerBalance} Coins
            </span>
            <span className="text-sm font-black text-amber-300 leading-tight block mt-0.5">
              {remainingCoins} Coins Remaining
              {totalCoinsUsed > 0 && (
                <span className="text-[11px] font-bold text-emerald-300 ml-1.5">
                  ({totalCoinsUsed} used)
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* EARNING NOTICE BANNER */}
      <div className="my-3.5 bg-emerald-900/40 border border-emerald-700/50 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            You will earn{' '}
            <strong className="text-amber-300">+{potentialCoinsEarned} Easy Coins</strong> on
            today&apos;s harvest order!
          </span>
        </div>
        <span className="text-[11px] text-emerald-300/80 font-medium hidden sm:inline">
          Rate: 10 coins / ₹100
        </span>
      </div>

      {/* APPLY EASY COINS FOR ADDITIONAL BASKET PURCHASE DISCOUNT (10 COINS = ₹1) */}
      <div className="mb-4 bg-gradient-to-r from-amber-500/15 via-emerald-900/80 to-amber-500/10 border-2 border-amber-400/50 rounded-2xl p-4 space-y-3 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🪙</span>
                <span>Apply Coins for Basket Purchase Discount</span>
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-emerald-950 shadow-xs">
                10 Easy Coins = ₹1 Rupee
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/90">
              Use your available Easy Coins directly to reduce your basket purchase price.
              {maxCoinsForBasketDiscount > 0 && (
                <span className="text-amber-300 font-bold ml-1">
                  (Up to {maxCoinsForBasketDiscount} Coins = ₹{(maxCoinsForBasketDiscount / 10).toFixed(2)} off)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {effectiveDiscountCoins > 0 ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => updateDiscountCoins(0)}
                className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-200 font-bold text-xs transition cursor-pointer"
              >
                Remove Discount
              </button>
            ) : null}
            <button
              type="button"
              disabled={disabled || maxCoinsForBasketDiscount <= 0 || effectiveDiscountCoins === maxCoinsForBasketDiscount}
              onClick={() => updateDiscountCoins(maxCoinsForBasketDiscount)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-black text-xs shadow-md transition disabled:opacity-40 cursor-pointer"
            >
              {effectiveDiscountCoins === maxCoinsForBasketDiscount && maxCoinsForBasketDiscount > 0
                ? '✓ Max Coins Applied'
                : `Apply All (${maxCoinsForBasketDiscount} Coins = -₹${(maxCoinsForBasketDiscount / 10).toFixed(2)})`}
            </button>
          </div>
        </div>

        {maxCoinsForBasketDiscount > 0 && (
          <div className="pt-2 border-t border-emerald-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                disabled={disabled || effectiveDiscountCoins <= 0}
                onClick={() => updateDiscountCoins(Math.max(0, effectiveDiscountCoins - 10))}
                className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-800 border border-amber-400/40 text-amber-300 font-black text-xs disabled:opacity-40 cursor-pointer"
                title="Decrease by 10 Coins (₹1)"
              >
                -10
              </button>
              <input
                type="range"
                min={0}
                max={maxCoinsForBasketDiscount}
                step={1}
                disabled={disabled}
                value={effectiveDiscountCoins}
                onChange={(e) => updateDiscountCoins(Number(e.target.value))}
                className="flex-1 accent-amber-400 cursor-pointer h-2 bg-emerald-950 rounded-lg"
              />
              <button
                type="button"
                disabled={disabled || effectiveDiscountCoins >= maxCoinsForBasketDiscount}
                onClick={() =>
                  updateDiscountCoins(Math.min(maxCoinsForBasketDiscount, effectiveDiscountCoins + 10))
                }
                className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-800 border border-amber-400/40 text-amber-300 font-black text-xs disabled:opacity-40 cursor-pointer"
                title="Increase by 10 Coins (₹1)"
              >
                +10
              </button>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2.5 bg-emerald-950/90 border border-amber-400/40 px-3 py-1.5 rounded-xl shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-emerald-300 font-bold">Coins Applied:</span>
                <input
                  type="number"
                  min={0}
                  max={maxCoinsForBasketDiscount}
                  disabled={disabled}
                  value={effectiveDiscountCoins}
                  onChange={(e) =>
                    updateDiscountCoins(
                      Math.min(maxCoinsForBasketDiscount, Math.max(0, Number(e.target.value) || 0))
                    )
                  }
                  className="w-16 px-2 py-0.5 rounded bg-emerald-900 border border-amber-400/40 text-amber-300 font-black text-xs text-center focus:outline-none"
                />
              </div>
              <span className="text-xs font-black text-emerald-300 bg-emerald-900/90 px-2.5 py-1 rounded-lg border border-emerald-600/50">
                Save ₹{discountRupees.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SELECTED / CLAIMED EXTRA ITEMS LIST */}
      {claimedRewards.length > 0 && (
        <div className="mb-4 bg-amber-500/10 border-2 border-amber-400/60 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-amber-400/20 pb-2">
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎁</span>
              <span>
                Claimed Extra Items ({totalItemsClaimed} item{totalItemsClaimed > 1 ? 's' : ''})
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-emerald-300">
                Total: {rewardItemsCoinsUsed} Coins • ₹0.00
              </span>
              <button
                type="button"
                onClick={() => updateRewardsList([])}
                className="text-[11px] font-bold text-red-300 hover:text-red-200 underline cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {claimedRewards.map(({ product: rew, quantity }) => {
              const canAddMore =
                remainingCoins >= rew.coin_cost &&
                quantity < rew.stock_quantity &&
                !disabled;

              return (
                <div
                  key={rew.id}
                  className="bg-emerald-950/70 border border-amber-400/40 rounded-xl p-2.5 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-emerald-950 border border-amber-400/30 relative shrink-0">
                      <Image
                        src={rew.image_url || '/images/rewards/neem-comb.jpg'}
                        alt={rew.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{rew.name}</h4>
                      <p className="text-[10px] text-emerald-300/90 font-medium">
                        {rew.package_size} •{' '}
                        <span className="font-bold text-amber-300">
                          {rew.coin_cost * quantity} Coins
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center bg-emerald-900 border border-amber-400/40 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleDecrement(rew.id)}
                        className="p-1.5 hover:bg-emerald-800 text-amber-300 transition cursor-pointer"
                        title="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-black text-white">{quantity}</span>
                      <button
                        type="button"
                        disabled={!canAddMore}
                        onClick={() => handleAddOrIncrement(rew)}
                        className="p-1.5 hover:bg-emerald-800 text-amber-300 disabled:opacity-40 transition cursor-pointer"
                        title={
                          canAddMore
                            ? 'Add 1 more'
                            : 'Not enough remaining coins or stock limit reached'
                        }
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(rew.id)}
                      className="p-1.5 rounded-lg bg-emerald-900/80 hover:bg-red-950/80 text-emerald-200 hover:text-red-300 border border-emerald-700/60 transition cursor-pointer"
                      title="Remove item"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORY FILTER CHIPS & PRODUCTS GRID (ONLY SHOWN WHEN ACTIVE ITEMS EXIST) */}
      {!loading && products.length === 0 ? (
        <div className="py-4 px-4 rounded-2xl bg-emerald-900/40 border border-emerald-800/60 text-center text-xs text-emerald-200/90">
          Physical reward items are currently disabled by Admin. You can still apply your Easy Coins above for an instant basket purchase discount (10 Coins = ₹1)!
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none pt-1">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-amber-400 text-emerald-950 shadow-md shadow-amber-500/20'
                    : 'bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-700/50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* PRODUCTS GRID */}
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
                const claimedEntry = claimedRewards.find((r) => r.product.id === prod.id);
                const claimedQty = claimedEntry?.quantity || 0;
                const isSelected = claimedQty > 0;
                const canAffordNext = remainingCoins >= prod.coin_cost;
                const isOutOfStock = prod.stock_quantity <= 0;

                return (
                  <div
                    key={prod.id}
                    className={`relative rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 border ${
                      isSelected
                        ? 'bg-emerald-900/90 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                        : isOutOfStock
                        ? 'bg-emerald-950/40 border-emerald-900/40 opacity-50'
                        : !canAffordNext
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

                        {/* Claimed Quantity Badge */}
                        {isSelected && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-amber-400 text-emerald-950 text-[10px] font-black shadow-md">
                            Claimed ×{claimedQty}
                          </div>
                        )}

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

                    {/* Claim / Quantity Action */}
                    <div className="pt-3 mt-2 border-t border-emerald-800/40">
                      {isSelected ? (
                        <div className="flex items-center justify-between bg-amber-400 text-emerald-950 rounded-xl px-2 py-1.5 font-black text-xs shadow-md shadow-amber-500/20">
                          <button
                            type="button"
                            onClick={() => handleDecrement(prod.id)}
                            className="w-7 h-7 rounded-lg bg-emerald-950/15 hover:bg-emerald-950/25 flex items-center justify-center transition cursor-pointer"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <span className="flex items-center gap-1 text-xs font-black">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>
                              {claimedQty} Claimed ({claimedQty * prod.coin_cost} Coins)
                            </span>
                          </span>

                          <button
                            type="button"
                            disabled={!canAffordNext || claimedQty >= prod.stock_quantity || disabled}
                            onClick={() => handleAddOrIncrement(prod)}
                            className="w-7 h-7 rounded-lg bg-emerald-950/15 hover:bg-emerald-950/25 disabled:opacity-30 flex items-center justify-center transition cursor-pointer"
                            title={
                              canAffordNext
                                ? `Add 1 more (${prod.coin_cost} Coins)`
                                : `Need ${prod.coin_cost - remainingCoins} more coins`
                            }
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      ) : isOutOfStock ? (
                        <div className="text-center py-1.5 text-[11px] font-medium text-slate-400 bg-emerald-950/50 rounded-xl">
                          Currently Unavailable
                        </div>
                      ) : !canAffordNext ? (
                        <div className="text-center py-1.5 text-[11px] font-medium text-amber-200/60 bg-emerald-950/50 rounded-xl border border-emerald-800/40">
                          Need {prod.coin_cost - remainingCoins} more coins
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleAddOrIncrement(prod)}
                          className="w-full py-2 bg-emerald-800/90 hover:bg-amber-400 hover:text-emerald-950 text-white font-bold text-xs rounded-xl border border-emerald-600/60 hover:border-amber-400 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Claim for {prod.coin_cost} Coins</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* FOOTER POLICIES NOTE */}
      <div className="mt-4 pt-3 border-t border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-emerald-300/80 gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Claim any number of items up to your Easy Coins balance ({customerBalance} Coins). Delivered free inside your vegetable box.
          </span>
        </div>
        <div className="text-[10px] text-emerald-400/90 font-medium">
          Easy Coins have no monetary cash value and do not alter vegetable bill totals.
        </div>
      </div>
    </div>
  );
}
