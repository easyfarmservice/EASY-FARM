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

  const addToCart = (basket: Basket, customizedItems?: any[]) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.basket.id === basket.id);
      if (existing) {
        return prev.map((i) =>
          i.basket.id === basket.id
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
      const existing = prev.find((i) => i.basket.id === basket.id);
      if (existing) {
        return prev.map((i) =>
          i.basket.id === basket.id
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
    setItems((prev) => prev.filter((i) => i.basket.id !== basketId));
  };

  const updateQuantity = (basketId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(basketId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.basket.id === basketId ? { ...i, quantity } : i))
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
