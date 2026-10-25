'use client';

import React, { useState } from 'react';
import { ShoppingBag, Check, Plus, Minus } from 'lucide-react';
import { Basket } from '@/types/database';
import { useCart } from '@/components/cart/CartProvider';
import { useRouter } from 'next/navigation';

interface BasketDetailClientProps {
  basket: Basket;
}

export function BasketDetailClient({ basket }: BasketDetailClientProps) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(basket);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(basket);
    }
    router.push('/checkout');
  };

  return (
    <div className="space-y-4 pt-2">
      {/* QUANTITY CONTROL */}
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <span className="text-xs font-bold text-slate-700">Select Basket Quantity:</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-9 h-9 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="font-extrabold text-base text-slate-900 w-6 text-center">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="w-9 h-9 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleAddToCart}
          className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center transition shadow-md min-h-[52px] ${
            added
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-800 hover:bg-emerald-900 text-white'
          }`}
        >
          {added ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Added ({quantity}) to Cart!
            </>
          ) : (
            <>
              <ShoppingBag className="w-5 h-5 mr-2" />
              Add to Cart (₹{basket.price * quantity})
            </>
          )}
        </button>

        <button
          onClick={handleBuyNow}
          className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm transition shadow-md min-h-[52px]"
        >
          Buy Now & Checkout →
        </button>
      </div>
    </div>
  );
}
