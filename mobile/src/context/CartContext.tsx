import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SafeStorage } from '../lib/storage';
import { ProductItem } from '../data/initialProducts';
import {
  fetchDeliverySettings,
  DEFAULT_DELIVERY_SETTINGS,
  AdminDeliverySettings,
} from '../services/deliverySettingsService';

export interface CartItem {
  product: ProductItem;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: ProductItem, quantity?: number) => void;
  setCartItem: (product: ProductItem, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
  totalItems: number;
  subtotal: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  isFreeDelivery: boolean;
  totalPayable: number;
  coinsDiscountAmount: number;
  setCoinsDiscountAmount: (amt: number) => void;
  deliverySettings: AdminDeliverySettings;
  refreshDeliverySettings: () => Promise<void>;
}

const CART_STORAGE_KEY = '@easyfarm_cart_v1';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [coinsDiscountAmount, setCoinsDiscountAmount] = useState<number>(0);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [deliverySettings, setDeliverySettings] = useState<AdminDeliverySettings>(
    DEFAULT_DELIVERY_SETTINGS
  );

  // Load delivery settings from database (managed from Admin Panel)
  const refreshDeliverySettings = useCallback(async () => {
    try {
      const liveSettings = await fetchDeliverySettings();
      setDeliverySettings(liveSettings);
    } catch (err) {
      console.warn('Could not refresh delivery settings:', err);
    }
  }, []);

  useEffect(() => {
    refreshDeliverySettings();
  }, [refreshDeliverySettings]);

  // Load cart from storage on launch
  useEffect(() => {
    (async () => {
      try {
        const stored = await SafeStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        }
      } catch (err) {
        console.warn('Failed to load cart from storage:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Save cart to storage whenever items change
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await SafeStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (err) {
        console.warn('Failed to save cart to storage:', err);
      }
    })();
  }, [items, loaded]);

  const addToCart = useCallback((product: ProductItem, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? {
                ...i,
                product: product.customizedItems ? product : i.product,
                quantity: i.quantity + quantity,
              }
            : i
        );
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const setCartItem = useCallback((product: ProductItem, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (quantity <= 0) {
        if (!existing) return prev;
        return prev.filter((i) => i.product.id !== product.id);
      }
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { product, quantity } : i
        );
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => i.product.id !== productId);
      }
      return prev.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      );
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoinsDiscountAmount(0);
  }, []);

  const getItemQuantity = useCallback(
    (productId: string) => {
      const found = items.find((i) => i.product.id === productId);
      return found ? found.quantity : 0;
    },
    [items]
  );

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const isFreeDelivery =
    deliverySettings.isDeliveryFree ||
    deliverySettings.baseDeliveryFee === 0 ||
    subtotal >= deliverySettings.freeDeliveryThreshold ||
    subtotal === 0;

  const deliveryFee = isFreeDelivery ? 0 : deliverySettings.baseDeliveryFee;
  const totalPayable = Math.max(0, subtotal + deliveryFee - coinsDiscountAmount);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        setCartItem,
        updateQuantity,
        removeFromCart,
        clearCart,
        getItemQuantity,
        totalItems,
        subtotal,
        deliveryFee,
        freeDeliveryThreshold: deliverySettings.freeDeliveryThreshold,
        isFreeDelivery,
        totalPayable,
        coinsDiscountAmount,
        setCoinsDiscountAmount,
        deliverySettings,
        refreshDeliverySettings,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
};

