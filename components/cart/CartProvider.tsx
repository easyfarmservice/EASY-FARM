'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Basket } from '@/types/database';

export interface CartItem {
  basket: Basket;
  quantity: number;
  customizedItems?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    price?: number;
    compare_at_price?: number;
    image_url?: string;
    isSwapped?: boolean;
    replacedProductName?: string;
  }>;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (basket: Basket, customizedItems?: any[]) => void;
  updateCustomizedBasket: (basket: Basket, customizedItems: any[], quantity?: number) => void;
  removeFromCart: (basketId: string) => void;
  updateQuantity: (basketId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('easyfarm_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to parse cart from storage', err);
    }
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('easyfarm_cart', JSON.stringify(items));
    } catch (err) {
      console.error('Failed to save cart to storage', err);
    }
  }, [items]);

  const matchesBasket = (b1: Basket, b2: Basket) => {
    if (!b1 || !b2) return false;
    if (b1.id && b2.id && b1.id === b2.id) return true;
    if (b1.slug && b2.slug && b1.slug === b2.slug) return true;
    const isStaple1 = b1.slug?.includes('staple') || b1.id?.endsWith('1');
    const isStaple2 = b2.slug?.includes('staple') || b2.id?.endsWith('1');
    if (isStaple1 && isStaple2) return true;
    const isCustom1 = b1.slug?.includes('custom') || b1.id?.endsWith('4');
    const isCustom2 = b2.slug?.includes('custom') || b2.id?.endsWith('4');
    if (isCustom1 && isCustom2) return true;
    return false;
  };

  const addToCart = (basket: Basket, customizedItems?: any[]) => {
    setItems((prev) => {
      const existing = prev.find((i) => matchesBasket(i.basket, basket));
      if (existing) {
        return prev.map((i) =>
          matchesBasket(i.basket, basket)
            ? {
                ...i,
                basket: { ...i.basket, ...basket },
                quantity: i.quantity + 1,
                customizedItems: customizedItems || i.customizedItems,
              }
            : i
        );
      }
      return [...prev, { basket, quantity: 1, customizedItems }];
    });
  };

  const updateCustomizedBasket = (basket: Basket, customizedItems: any[], quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => matchesBasket(i.basket, basket));
      if (existing) {
        return prev.map((i) =>
          matchesBasket(i.basket, basket)
            ? {
                ...i,
                basket: { ...i.basket, ...basket },
                quantity,
                customizedItems,
              }
            : i
        );
      }
      return [...prev, { basket, quantity, customizedItems }];
    });
  };

  const removeFromCart = (basketId: string) => {
    setItems((prev) => prev.filter((i) => i.basket.id !== basketId && i.basket.slug !== basketId));
  };

  const updateQuantity = (basketId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(basketId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.basket.id === basketId || i.basket.slug === basketId ? { ...i, quantity } : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = items.reduce((sum, item) => sum + Number(item.basket.price) * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateCustomizedBasket,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
