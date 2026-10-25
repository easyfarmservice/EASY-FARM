'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowRightLeft, Plus, Minus, Check, AlertCircle } from 'lucide-react';

export interface UnifiedProductItem {
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

interface UnifiedProductRowProps {
  item: UnifiedProductItem;
  mode: 'staple' | 'custom' | 'swap-option';
  layout?: 'row' | 'grid';
  // Staple box props
  isSwappable?: boolean;
  isSwapped?: boolean;
  replacedProductName?: string;
  onSwapClick?: () => void;
  // Custom box props
  selectedQuantity?: number;
  onQuantityChange?: (qty: number) => void;
  minQuantity?: number;
  maxQuantity?: number;
  // Swap modal option props
  priceDifference?: number;
  onSelectSwap?: () => void;
  isCurrentSelection?: boolean;
}

export function UnifiedProductRow({
  item,
  mode,
  layout = 'row',
  isSwappable = true,
  isSwapped = false,
  replacedProductName,
  onSwapClick,
  selectedQuantity = 0,
  onQuantityChange,
  minQuantity = 0,
  maxQuantity = 10,
  priceDifference,
  onSelectSwap,
  isCurrentSelection = false,
}: UnifiedProductRowProps) {
  const isAvailable = item.active !== false;
  const hasValidPrice = typeof item.price === 'number' && !isNaN(item.price) && item.price >= 0;
  const imageSrc = item.image_url || '/images/hero-vegetables.png';

  // Format unit and weight
  const displayQuantity = item.quantity ? `${item.quantity} ${item.unit || ''}`.trim() : item.unit || 'unit';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. GRID CARD LAYOUT (Used for 4-column Custom Box grid)
  // ─────────────────────────────────────────────────────────────────────────────
  if (layout === 'grid') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all duration-200 group relative">
        <div>
          {/* PHOTO */}
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100 mb-2.5">
            <Image
              src={imageSrc}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {!isAvailable && (
              <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                <span className="text-[10px] font-black uppercase text-white bg-rose-600 px-1.5 py-0.5 rounded">
                  Out
                </span>
              </div>
            )}
            {selectedQuantity > 0 && (
              <div className="absolute top-1.5 right-1.5 bg-emerald-800 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                {selectedQuantity}
              </div>
            )}
          </div>

          {/* NAME & UNIT */}
          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate" title={item.name}>
            {item.name}
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
            {displayQuantity}
          </p>
        </div>

        {/* PRICE & ACTION ROW */}
        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 gap-1.5">
          <div className="min-w-0">
            {hasValidPrice ? (
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  ₹{item.price}
                </span>
                {item.market_price && item.market_price > item.price ? (
                  <span className="text-[10px] line-through text-slate-400 font-medium">
                    ₹{item.market_price}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-[10px] font-semibold text-rose-600 block truncate">
                Unavailable
              </span>
            )}
          </div>

          {/* CONTROLS */}
          <div className="shrink-0">
            {!isAvailable || !hasValidPrice ? (
              <button
                disabled
                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400 text-[11px] font-bold cursor-not-allowed"
              >
                Out
              </button>
            ) : selectedQuantity > 0 ? (
              <div className="flex items-center rounded-lg bg-emerald-800 text-white font-bold text-xs shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => onQuantityChange?.(Math.max(0, selectedQuantity - 1))}
                  className="px-2 py-1 hover:bg-emerald-900 transition active:scale-95 flex items-center justify-center"
                  aria-label={`Decrease ${item.name}`}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="px-2 py-0.5 text-xs font-black min-w-[20px] text-center">
                  {selectedQuantity}
                </span>
                <button
                  type="button"
                  disabled={selectedQuantity >= maxQuantity}
                  onClick={() => onQuantityChange?.(Math.min(maxQuantity, selectedQuantity + 1))}
                  className="px-2 py-1 hover:bg-emerald-900 disabled:opacity-40 transition active:scale-95 flex items-center justify-center"
                  aria-label={`Increase ${item.name}`}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onQuantityChange?.(1)}
                className="px-3 py-1 rounded-lg border border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-800 font-black text-xs transition shadow-2xs flex items-center gap-0.5 active:scale-95"
                aria-label={`Add ${item.name}`}
              >
                <Plus className="w-3 h-3 text-emerald-700" />
                <span>ADD</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. HORIZONTAL ROW LAYOUT (Used for Staple Box and Swap Drawer)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-between py-3 px-3 sm:px-4 hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-b-0 gap-3">
      {/* LEFT: COMPACT PRODUCT PHOTO */}
      <div className="relative w-15 h-15 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 shadow-2xs">
        <Image
          src={imageSrc}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 64px, 72px"
          className="object-cover"
        />
        {!isAvailable && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
            <span className="text-[9px] font-black uppercase text-white bg-rose-600 px-1 py-0.5 rounded">
              Out
            </span>
          </div>
        )}
      </div>

      {/* MIDDLE: PRODUCT DETAILS & DYNAMIC PRICING */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate tracking-tight">
            {item.name}
          </h4>
          {isSwapped && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded flex items-center gap-1">
              <ArrowRightLeft className="w-2.5 h-2.5" />
              <span>Swapped</span>
            </span>
          )}
        </div>

        {/* QUANTITY / UNIT */}
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          {displayQuantity}
          {replacedProductName && (
            <span className="text-slate-400 block sm:inline sm:ml-1 text-[11px]">
              (Replaced: {replacedProductName})
            </span>
          )}
        </p>

        {/* DYNAMIC PRICE */}
        <div className="flex items-baseline gap-2 mt-1">
          {hasValidPrice ? (
            <>
              <span className="text-sm sm:text-base font-black text-slate-900">
                ₹{item.price}
              </span>
              {item.market_price && item.market_price > item.price ? (
                <span className="text-xs line-through text-slate-400 font-medium">
                  ₹{item.market_price}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Price unavailable
            </span>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: ACTIONS */}
      <div className="shrink-0 flex items-center justify-end">
        {/* MODE: STAPLE BOX */}
        {mode === 'staple' && (
          <div>
            {isSwappable && isAvailable ? (
              <button
                type="button"
                onClick={onSwapClick}
                className="px-3 py-1.5 rounded-xl border border-emerald-700/60 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                aria-label={`Swap ${item.name}`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-700" />
                <span>{isSwapped ? 'Change' : 'Swap'}</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium px-2 py-1 bg-slate-100 rounded-lg">
                Included
              </span>
            )}
          </div>
        )}

        {/* MODE: CUSTOM BOX (ROW QUANTITY CONTROLS) */}
        {mode === 'custom' && (
          <div>
            {!isAvailable || !hasValidPrice ? (
              <button
                disabled
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed"
              >
                Unavailable
              </button>
            ) : selectedQuantity > 0 ? (
              <div className="flex items-center rounded-xl bg-emerald-800 text-white font-bold text-xs shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => onQuantityChange?.(Math.max(0, selectedQuantity - 1))}
                  className="px-2.5 py-1.5 hover:bg-emerald-900 transition active:scale-95 flex items-center justify-center"
                  aria-label={`Decrease quantity of ${item.name}`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-2.5 py-1 text-xs font-black min-w-[24px] text-center">
                  {selectedQuantity}
                </span>
                <button
                  type="button"
                  disabled={selectedQuantity >= maxQuantity}
                  onClick={() => onQuantityChange?.(Math.min(maxQuantity, selectedQuantity + 1))}
                  className="px-2.5 py-1.5 hover:bg-emerald-900 disabled:opacity-40 transition active:scale-95 flex items-center justify-center"
                  aria-label={`Increase quantity of ${item.name}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onQuantityChange?.(1)}
                className="px-3.5 py-1.5 rounded-xl border border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-800 font-black text-xs transition shadow-2xs flex items-center gap-1 active:scale-95"
                aria-label={`Add ${item.name}`}
              >
                <Plus className="w-3.5 h-3.5 text-emerald-700" />
                <span>ADD</span>
              </button>
            )}
          </div>
        )}

        {/* MODE: SWAP MODAL OPTION */}
        {mode === 'swap-option' && (
          <div className="flex items-center gap-2">
            {typeof priceDifference === 'number' && (
              <span
                className={`text-xs font-bold ${
                  priceDifference > 0
                    ? 'text-amber-700'
                    : priceDifference < 0
                    ? 'text-emerald-700'
                    : 'text-slate-500'
                }`}
              >
                {priceDifference > 0 ? `+₹${priceDifference}` : priceDifference < 0 ? `-₹${Math.abs(priceDifference)}` : 'Same price'}
              </span>
            )}
            {isCurrentSelection ? (
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Current</span>
              </span>
            ) : (
              <button
                type="button"
                disabled={!isAvailable || !hasValidPrice}
                onClick={onSelectSwap}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white font-bold text-xs transition shadow-xs flex items-center gap-1 active:scale-95"
              >
                <span>Select</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
