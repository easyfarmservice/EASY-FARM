'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Gift,
  Coins,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Package,
  Info,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react';
import { CustomerCoinsOverview, EasyCoinsLedgerEntry, RewardClaim } from '@/types/easy-coins';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

interface EasyCoinsAccountTabProps {
  customerId?: string;
  customerName?: string;
}

export function EasyCoinsAccountTab({ customerId, customerName }: EasyCoinsAccountTabProps) {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<CustomerCoinsOverview | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    async function fetchCoins() {
      try {
        setLoading(true);
        const url = customerId
          ? `/api/easy-coins/balance?customerId=${customerId}`
          : '/api/easy-coins/balance';

        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setOverview(data);
        }
      } catch (err) {
        console.error('Failed to fetch Easy Coins overview:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCoins();
  }, [customerId]);

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <EasyFarmLoader size="md" text="Loading your Easy Coins ledger..." subtitle="Fetching balances and reward claims" />
      </div>
    );
  }

  const transactions = overview?.recent_transactions || [];
  const claims = overview?.active_claims || [];
  const balance = overview?.available_balance || 0;
  const lifetimeEarned = overview?.lifetime_earned || balance;
  const lifetimeRedeemed = overview?.lifetime_redeemed || 0;

  const filteredTransactions = filterType === 'all'
    ? transactions
    : filterType === 'earned'
    ? transactions.filter((t) => t.amount > 0)
    : transactions.filter((t) => t.amount < 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Confirmed</span>;
      case 'packed':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Packed with Box</span>;
      case 'delivered':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-700 text-white">Delivered</span>;
      case 'reserved':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">Reserved</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. LUXURY EMERALD & GOLD BALANCE HERO CARD */}
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-amber-500/30">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold">
              <span>🪙</span>
              <span>Easy Coins Rewards Program</span>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-300 font-bold">
                Available Loyalty Balance
              </p>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl sm:text-5xl font-black text-amber-300 tracking-tight">
                  {balance}
                </span>
                <span className="text-lg font-bold text-emerald-200">Easy Coins</span>
              </div>
            </div>

            <p className="text-xs text-emerald-200/90 max-w-lg leading-relaxed">
              Collect coins with every weekly vegetable basket. Redeem them at checkout for everyday household essentials like toothpaste, ayurvedic soaps, scrub pads, and wipes delivered free inside your vegetable box.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
            <div className="bg-emerald-900/80 border border-emerald-700/60 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-300 tracking-wider block">
                Lifetime Earned
              </span>
              <span className="text-xl font-black text-emerald-300 mt-1 block">
                +{lifetimeEarned}
              </span>
            </div>

            <div className="bg-emerald-900/80 border border-emerald-700/60 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-bold uppercase text-amber-300 tracking-wider block">
                Redeemed on Items
              </span>
              <span className="text-xl font-black text-amber-300 mt-1 block">
                {lifetimeRedeemed}
              </span>
            </div>
          </div>
        </div>

        {/* CTA TO BASKET ORDER */}
        <div className="mt-6 pt-5 border-t border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-emerald-200/80 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            Earn 10 Easy Coins on every ₹100 of farm vegetable orders.
          </span>
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold transition shadow-md self-start sm:self-auto"
          >
            <span>Order Weekly Basket</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
          </Link>
        </div>
      </div>

      {/* 2. HOW EASY COINS WORKS STEPS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-700" />
          How Easy Coins Loyalty Works
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white font-black text-xs flex items-center justify-center">
                1
              </div>
              <h4 className="text-xs font-bold text-emerald-950 pt-1">Earn on Repeat Baskets</h4>
              <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                Receive 10 Easy Coins for every ₹100 spent on Staple Box or Custom Box harvest orders.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-emerald-950 font-black text-xs flex items-center justify-center">
                2
              </div>
              <h4 className="text-xs font-bold text-amber-950 pt-1">Claim Physical Essentials</h4>
              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                Choose 1 free everyday product (Oral care, Personal care, Cleaning essentials) at checkout.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-white font-black text-xs flex items-center justify-center">
                3
              </div>
              <h4 className="text-xs font-bold text-slate-900 pt-1">Free Sunday Delivery</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Your reward is packed safely inside your weekly vegetable basket with zero extra delivery charges.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CLAIMED PHYSICAL REWARDS SECTION */}
      {claims.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-600" />
            Your Physical Reward Claims ({claims.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-slate-50/60 flex items-start justify-between gap-3 transition"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {claim.reward_name_snapshot}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Size: <span className="font-semibold text-slate-700">{claim.package_size_snapshot}</span> • Cost:{' '}
                    <span className="font-bold text-amber-700">{claim.coin_cost_snapshot} Coins</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Order Ref: #{claim.order_id?.slice(-8) || 'N/A'}
                  </p>
                </div>
                <div className="shrink-0 text-right space-y-1">
                  {getStatusBadge(claim.claim_status)}
                  <p className="text-[10px] text-slate-400 font-medium">
                    {new Date(claim.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. AUDITABLE TRANSACTION LEDGER TABLE */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-700" />
              Easy Coins Transaction Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Immutable ledger of all coin credits, debits, reversals, and promotional awards.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType('earned')}
              className={`px-3 py-1 rounded-lg transition ${
                filterType === 'earned' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Earned (+)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('redeemed')}
              className={`px-3 py-1 rounded-lg transition ${
                filterType === 'redeemed' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Redeemed (-)
            </button>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No transactions found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Coins Delta</th>
                  <th className="py-2.5 px-3 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => {
                  const isCredit = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {tx.description}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tx.transaction_type === 'earned_order'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.transaction_type === 'redeemed_reward'
                              ? 'bg-amber-100 text-amber-900'
                              : tx.transaction_type === 'reversed_cancellation'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {tx.transaction_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className={`py-3 px-3 text-right font-black whitespace-nowrap ${
                        isCredit ? 'text-emerald-700' : 'text-amber-800'
                      }`}>
                        {isCredit ? `+${tx.amount}` : tx.amount} Coins
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-700 whitespace-nowrap">
                        {tx.balance_after}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
