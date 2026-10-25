'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Users, Sprout, MapPin, Clock, BarChart3, ShieldCheck, Lock, LogOut, Menu, X, Truck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

import { EasyFarmLogo } from '@/components/ui/Logo';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

export function AdminLayout({ children }: { children: React.ReactNode }) {

  const router = useRouter();
  // Check if session was already verified in this browser window to eliminate navigation flicker
  const initialVerified = typeof window !== 'undefined' && sessionStorage.getItem('easyfarm_admin_verified') === 'true';
  const initialEmail = typeof window !== 'undefined' ? sessionStorage.getItem('easyfarm_admin_email') : null;

  const [loading, setLoading] = useState(!initialVerified);
  const [isAdmin, setIsAdmin] = useState(initialVerified);
  const [userEmail, setUserEmail] = useState<string | null>(initialEmail);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) {
            setIsAdmin(false);
            setLoading(false);
          }
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('easyfarm_admin_verified');
            sessionStorage.removeItem('easyfarm_admin_email');
            localStorage.removeItem('easyfarm_admin_user');
          }
          router.push('/login?next=/admin');
          return;
        }

        if (isMounted) {
          setUserEmail(user.email || null);
        }

        // Check if user is registered as admin in Supabase profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        const isRoleAdmin = profile?.role === 'admin';
        const isDomainAdmin = user.email?.endsWith('@easyfarm.in');
        const isKnownAdmin = user.email === 'shivashankarlode@gmail.com' || user.email === 'shivashankarlode8@gmail.com';

        let isAuthorized = isRoleAdmin || isDomainAdmin || isKnownAdmin;

        // Secondary check in admin_users table
        if (!isAuthorized && profile?.id) {
          const { data: adminRecord } = await supabase
            .from('admin_users')
            .select('id')
            .eq('profile_id', profile.id)
            .maybeSingle();

          if (adminRecord) {
            isAuthorized = true;
          }
        }

        if (isAuthorized) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('easyfarm_admin_verified', 'true');
            sessionStorage.setItem('easyfarm_admin_email', user.email || '');
          }
          if (isMounted) {
            setIsAdmin(true);
            setLoading(false);
          }
          return;
        }

        // Authenticated user is not an administrator
        if (isMounted) {
          setIsAdmin(false);
          setLoading(false);
        }
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('easyfarm_admin_verified');
          sessionStorage.removeItem('easyfarm_admin_email');
          localStorage.removeItem('easyfarm_admin_user');
        }
        router.push('/login?next=/admin');
      } catch (err) {
        console.error('Error verifying admin authorization:', err);
        // Only redirect if not already marked verified
        if (!initialVerified) {
          if (isMounted) {
            setIsAdmin(false);
            setLoading(false);
          }
          router.push('/login?next=/admin');
        }
      }
    }

    checkAdminAuth();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Admin sign out error:', e);
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('easyfarm_admin_verified');
      sessionStorage.removeItem('easyfarm_admin_email');
      localStorage.removeItem('easyfarm_admin_user');
    }
    router.push('/login?next=/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <EasyFarmLoader
          size="md"
          text="Verifying Admin Access"
          subtitle="Easy Farm Operations Panel"
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xl space-y-6">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Admin Access Restricted</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              You must be logged in with an authorized Administrator account to view the Easy Farm Operations Panel.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href="/login?next=/admin"
              className="block w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl transition shadow-md"
            >
              Sign In as Administrator
            </Link>
            <Link
              href="/"
              className="block w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Return to Customer Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: '/admin', label: 'Dashboard Overview', icon: LayoutDashboard },
    { href: '/admin/delivery', label: 'Delivery Operations', icon: Truck },
    { href: '/admin/orders', label: 'Orders Management', icon: ShoppingBag },
    { href: '/admin/baskets', label: 'Baskets & Pricing', icon: ShoppingBag },
    { href: '/admin/products', label: 'Product Catalog', icon: Sprout },
    { href: '/admin/pricing', label: 'Price Edit & Audit', icon: BarChart3 },
    { href: '/admin/discounts', label: 'Discounts Engine', icon: Clock },
    { href: '/admin/coupons', label: 'Coupons & Codes', icon: ShieldCheck },
    { href: '/admin/delivery-zones', label: 'Delivery Zones & Geofencing', icon: MapPin },
    { href: '/admin/delivery-settings', label: 'Delivery Fees & Cutoff', icon: MapPin },
    { href: '/admin/service-areas', label: 'Service Areas', icon: MapPin },
    { href: '/admin/weekly-inventory', label: 'Weekly Capacity', icon: BarChart3 },
    { href: '/admin/customers', label: 'Customer Base', icon: Users },
    { href: '/admin/farmers', label: 'Farmer Partners', icon: Sprout },
    { href: '/admin/audit-logs', label: 'System Audit Logs', icon: Clock },
    { href: '/admin/settings', label: 'Business Settings', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 text-slate-900">

      {/* MOBILE TOP BAR */}
      <div className="md:hidden bg-emerald-950 text-white flex items-center justify-between px-4 py-3 sticky top-0 z-50">
        <EasyFarmLogo variant="icon" size="sm" lightMode={true} />
        <span className="text-xs font-bold text-emerald-300 flex-1 ml-3">Admin Panel</span>
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-2 rounded-lg hover:bg-emerald-900 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle admin menu"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {mobileNavOpen && (
        <div className="md:hidden bg-emerald-950 text-white px-4 pb-6 space-y-1 z-40">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-emerald-900/60 text-emerald-100/80 text-xs font-semibold transition"
            >
              <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
              {label}
            </Link>
          ))}
          <div className="pt-3 border-t border-emerald-900/60">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl hover:bg-red-900/40 text-red-300 text-xs font-semibold transition"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="w-64 bg-emerald-950 text-white flex-col justify-between hidden md:flex shrink-0">
        <div className="p-6 space-y-6">
          <EasyFarmLogo variant="full" size="sm" lightMode={true} />
          <nav className="space-y-1 text-xs font-semibold overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-emerald-900/60 text-emerald-100/80 transition"
              >
                <Icon className="w-4 h-4 text-emerald-400" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-emerald-900/60 text-xs text-emerald-300/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white truncate max-w-[120px]">{userEmail || 'Admin'}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1 hover:bg-emerald-900 rounded text-emerald-300 hover:text-white transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <Link href="/" className="block text-[11px] text-emerald-400 hover:underline">
            ← Back to Customer Website
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between">
          <h1 className="text-sm md:text-lg font-bold text-slate-900">Easy Farm Operations Panel</h1>
          <div className="flex items-center gap-3 text-xs">
            <span className="bg-emerald-100 text-emerald-950 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
              Zone 01: Ghatkesar &amp; Pocharam
            </span>
          </div>
        </header>
        <main className="p-4 md:p-6 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
