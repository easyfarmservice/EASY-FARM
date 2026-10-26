'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, MapPin, User, Menu, X, ShieldCheck } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import { createClient } from '@/lib/supabase/client';
import { EasyFarmLogo } from '@/components/ui/Logo';
import { LocationPickerTrigger } from '@/components/location/LocationPicker';
import { SanityService } from '@/services/sanity.service';
import { EasyCoinsBadge } from '@/components/rewards/EasyCoinsBadge';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<{ active: boolean; text: string } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setIsLoggedIn(true);
          const signupName = user.user_metadata?.full_name || user.user_metadata?.fullName || user.email?.split('@')[0] || 'Customer';
          setUserName(signupName);

          const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          if (profile?.full_name) {
            setUserName(profile.full_name.trim());
          }

          if (profile?.role === 'admin') {
            setIsAdmin(true);
          }
        } else {
          // Check local fallback
          if (typeof window !== 'undefined') {
            const demoUserStr = localStorage.getItem('easyfarm_user');
            if (demoUserStr) {
              const demoUser = JSON.parse(demoUserStr);
              setIsLoggedIn(true);
              setUserName(demoUser.fullName || demoUser.full_name || demoUser.email?.split('@')[0] || 'Customer');
              if (demoUser.email?.includes('admin')) {
                setIsAdmin(true);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error checking header auth state:', err);
      }
    }

    checkAuth();

    SanityService.getSiteSettings().then((settings) => {
      if (settings?.announcementActive && settings?.announcementText) {
        setAnnouncement({
          active: true,
          text: settings.announcementText,
        });
      }
    }).catch(() => null);
  }, []);

  const pathname = usePathname();

  const isStapleActive = pathname?.includes('/staple-basket');
  const isCustomActive = pathname?.includes('/custom-basket') || pathname === '/select-vegetables';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-emerald-100 shadow-sm">
      {announcement?.active && announcement.text && (
        <div className="bg-emerald-800 text-emerald-50 text-xs py-1.5 px-4 text-center font-medium border-b border-emerald-700/60 flex items-center justify-center gap-2">
          <span>🌿</span>
          <span>{announcement.text}</span>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* LOGO + LOCATION */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          <EasyFarmLogo variant="full" size="md" showSubtitle={true} className="shrink-0" />
          <div className="hidden sm:block h-6 w-px bg-slate-200 shrink-0" />
          <LocationPickerTrigger />
        </div>

        {/* DESKTOP NAV LINKS */}
        <nav className="hidden lg:flex items-center gap-2 xl:gap-3 font-medium text-sm text-slate-700 shrink-0">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-full transition whitespace-nowrap ${
              pathname === '/'
                ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200/60'
                : 'text-slate-700 hover:text-emerald-700 hover:bg-slate-50'
            }`}
          >
            Home
          </Link>
          <Link
            href="/baskets/staple-basket"
            className={`px-3 py-1.5 rounded-full transition whitespace-nowrap ${
              isStapleActive
                ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200/60'
                : 'text-slate-700 hover:text-emerald-700 hover:bg-slate-50'
            }`}
          >
            Staple Box
          </Link>
          <Link
            href="/baskets/custom-basket"
            className={`px-3 py-1.5 rounded-full transition whitespace-nowrap ${
              isCustomActive
                ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200/60'
                : 'text-slate-700 hover:text-emerald-700 hover:bg-slate-50'
            }`}
          >
            Custom Box
          </Link>
          <Link
            href="/how-it-works"
            className={`px-3 py-1.5 rounded-full transition whitespace-nowrap ${
              pathname === '/how-it-works'
                ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200/60'
                : 'text-slate-700 hover:text-emerald-700 hover:bg-slate-50'
            }`}
          >
            How It Works
          </Link>
          <Link
            href="/location"
            className={`px-3 py-1.5 rounded-full transition flex items-center gap-1 whitespace-nowrap ${
              pathname === '/location'
                ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200/60'
                : 'text-slate-700 hover:text-emerald-700 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            Delivery Area
          </Link>
        </nav>

        {/* ACTIONS */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Cart Icon */}
          <Link
            href="/cart"
            className="relative p-2.5 rounded-full hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 bg-emerald-700 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                {totalItems}
              </span>
            )}
          </Link>

          {/* DYNAMIC ACCOUNT / ADMIN / LOGIN BUTTON */}
          {isLoggedIn ? (
            <div className="flex items-center gap-2 shrink-0">
              <EasyCoinsBadge />
              {isAdmin && (
                <Link
                  href="/admin"
                  className="hidden xl:inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-sm min-h-[40px] whitespace-nowrap"
                >
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-400" />
                  Admin Ops
                </Link>
              )}
              <Link
                href="/account"
                className="hidden sm:inline-flex items-center justify-center px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-sm font-bold transition min-h-[44px] border border-emerald-200 shrink-0 whitespace-nowrap"
              >
                <User className="w-4 h-4 mr-1.5 text-emerald-800 shrink-0" />
                <span className="max-w-[120px] truncate">{userName ? `Hello, ${userName}` : 'My Account'}</span>
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold transition shadow-sm min-h-[44px] shrink-0 whitespace-nowrap"
            >
              <User className="w-4 h-4 mr-2" />
              Sign In
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-emerald-100 bg-white px-4 pt-4 pb-6 space-y-3 shadow-lg">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 px-3 rounded-lg text-slate-800 font-medium hover:bg-emerald-50"
          >
            Home
          </Link>
          <Link
            href="/baskets/staple-basket"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 px-3 rounded-lg text-slate-800 font-medium hover:bg-emerald-50"
          >
            Staple Box
          </Link>
          <Link
            href="/baskets/custom-basket"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 px-3 rounded-lg text-slate-800 font-medium hover:bg-emerald-50"
          >
            Custom Box
          </Link>
          <Link
            href="/how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 px-3 rounded-lg text-slate-800 font-medium hover:bg-emerald-50"
          >
            How It Works
          </Link>
          <Link
            href="/location"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 px-3 rounded-lg text-slate-800 font-medium hover:bg-emerald-50"
          >
            Delivery Area
          </Link>

          <Link
            href="/account?tab=coins"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between py-2.5 px-3 rounded-lg text-amber-800 bg-amber-50/80 font-bold border border-amber-200"
          >
            <span>🪙 Easy Coins Rewards</span>
            <span className="text-xs bg-amber-400 text-emerald-950 font-black px-2 py-0.5 rounded-full">Active</span>
          </Link>

          {isLoggedIn ? (
            <div className="pt-2 space-y-2">
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center py-3 rounded-xl bg-emerald-950 text-white font-bold text-sm shadow"
                >
                  🛡️ Admin Operations Dashboard
                </Link>
              )}
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-3 rounded-xl bg-emerald-800 text-white font-bold text-sm shadow"
              >
                👤 Hello, {userName || 'Account'}
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center py-3 rounded-xl bg-emerald-800 text-white font-semibold shadow mt-2"
            >
              Login / Sign Up
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
