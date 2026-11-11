'use client';

import React from 'react';
import { Flame, CheckCircle, Gift, Sparkles, AlertCircle } from 'lucide-react';
import { WeeklyStreakReward } from '@/types/weekly-streak';

interface StreakRewardSelectorProps {
  availableRewards: WeeklyStreakReward[];
  selectedReward: WeeklyStreakReward | null;
  onSelectReward: (reward: WeeklyStreakReward | null) => void;
  orderSubtotal: number;
  hasCouponApplied?: boolean;
  disabled?: boolean;
}

export function StreakRewardSelector({
  availableRewards,
  selectedReward,
  onSelectReward,
  orderSubtotal,
  hasCouponApplied = false,
  disabled = false,
}: StreakRewardSelectorProps) {
  if (!availableRewards || availableRewards.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-emerald-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <Flame className="w-4 h-4 fill-emerald-600 text-emerald-700" />
            </span>
            <h3 className="text-base font-extrabold text-slate-900">
              Weekly Streak Milestone Discount
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            You achieved an active weekly ordering streak! Apply one of your unlocked milestone vouchers below.
          </p>
        </div>

        {selectedReward && (
          <button
            type="button"
            onClick={() => onSelectReward(null)}
            className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline shrink-0"
          >
            Remove Discount
          </button>
        )}
      </div>

      {hasCouponApplied && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>A coupon code is already applied. Milestone streak rewards cannot be combined with coupon codes.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {availableRewards.map((reward) => {
          const isSelected = selectedReward?.id === reward.id;
          const minReq = Number(reward.min_order_amount || 0);
          const isEligible = orderSubtotal >= minReq && !hasCouponApplied;
          const shortfall = Math.max(0, minReq - orderSubtotal);

          // Calculate estimated discount
          let estDiscount = 0;
          if (reward.discount_type === 'percentage') {
            estDiscount = Math.round(orderSubtotal * (Number(reward.discount_value) / 100));
            if (reward.max_discount_cap) {
              estDiscount = Math.min(estDiscount, Number(reward.max_discount_cap));
            }
          } else {
            estDiscount = Math.min(orderSubtotal, Number(reward.discount_value));
          }

          return (
            <div
              key={reward.id}
              onClick={() => {
                if (!isEligible || disabled) return;
                onSelectReward(isSelected ? null : reward);
              }}
              className={`p-3.5 rounded-2xl border transition relative text-left cursor-pointer ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                  : isEligible
                  ? 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
                  : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                    {reward.discount_type === 'percentage' ? `${reward.discount_value}%` : `₹${reward.discount_value}`}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {reward.milestone_title}
                    </h4>
                    <p className="text-[11px] font-extrabold text-emerald-700 mt-0.5">
                      Save ₹{estDiscount} on this order
                    </p>
                  </div>
                </div>

                <div className="shrink-0 mt-0.5">
                  {isSelected ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                  )}
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Min: ₹{minReq}</span>
                {reward.max_discount_cap && <span>Max Cap: ₹{reward.max_discount_cap}</span>}
                {shortfall > 0 && (
                  <span className="font-bold text-amber-700">Add ₹{shortfall} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

