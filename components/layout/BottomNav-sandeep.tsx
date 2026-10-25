'use client';

import React from 'react';
import Link from 'next/link';
import { Home, ShoppingBag, ShoppingCart, ClipboardList, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/components/cart/CartProvider';

export function BottomNav() {
  const pathname = usePathname();
  const { totalItems } = useCart();

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Baskets', href: '/baskets', icon: ShoppingBag },
    { label: 'Cart', href: '/cart', icon: ShoppingCart, badge: totalItems },
    { label: 'Orders', href: '/orders', icon: ClipboardList },
    { label: 'Account', href: '/account', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-lg px-2 py-1 flex justify-around items-center h-16">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full text-xs font-medium relative min-h-[48px] ${
              isActive ? 'text-emerald-800 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5 mb-0.5" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-emerald-700 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
