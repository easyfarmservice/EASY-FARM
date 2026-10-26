'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MapPin,
  Package,
  ShieldCheck,
  LogOut,
  Edit3,
  Plus,
  CheckCircle,
  X,
  Trash2,
  Calendar,
  ChevronRight,
  RotateCcw,
  Phone,
  Mail,
  User,
  ShoppingBag,
  Clock,
  AlertCircle,
  Coins,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { createClient } from '@/lib/supabase/client';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';
import { getNextDeliveryDate, LAUNCH_ZONE } from '@/lib/constants';
import { clearLegacyGlobalAddresses } from '@/lib/utils/address';
import { EasyCoinsAccountTab } from '@/components/account/EasyCoinsAccountTab';

interface ProfileData {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

interface OrderItemDetail {
  id: string;
  order_id: string;
  basket_id?: string;
  basket_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  baskets?: {
    id: string;
    name: string;
    image_url?: string;
    slug?: string;
  } | null;
}

interface DynamicOrder {
  id: string;
  customer_id: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_date: string;
  created_at: string;
  order_items?: OrderItemDetail[];
}

interface AddressData {
  id: string;
  customer_id: string;
  label: string;
  full_address: string;
  apartment?: string;
  locality: string;
  pincode: string;
  is_default: boolean;
  latitude?: number;
  longitude?: number;
}

// Confirmed active order fulfillment statuses.
// Strictly excludes 'pending_payment', 'cancelled', and 'failed'.
const CONFIRMED_ACTIVE_STATUSES = [
  'confirmed',
  'processing',
  'packed',
  'ready_for_delivery',
  'out_for_delivery',
];

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'coins' ? 'coins' : 'orders';

  // Page Loading & Feedback States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Concept 2: Segmented Tabs State (Orders, Easy Coins, Addresses, Settings)
  const [activeTab, setActiveTab] = useState<'orders' | 'coins' | 'addresses' | 'settings'>(initialTab);

  // Dynamic Data States (Strictly from Supabase for current user)
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [orders, setOrders] = useState<DynamicOrder[]>([]);
  const [addresses, setAddresses] = useState<AddressData[]>([]);

  // Dynamic Delivery & Cutoff Information
  const [deliveryTiming, setDeliveryTiming] = useState<{
    deliveryDateFormatted: string;
    cutoffFormatted: string;
    isOrderingOpen: boolean;
  }>({
    deliveryDateFormatted: '',
    cutoffFormatted: '',
    isOrderingOpen: true,
  });

  // Modal States
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Profile Form States
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profilePhoneInput, setProfilePhoneInput] = useState('');

  // Address Form States
  const [addressForm, setAddressForm] = useState<{
    label: string;
    fullName: string;
    phone: string;
    apartment: string;
    flatNo: string;
    locality: string;
    pincode: string;
    isDefault: boolean;
  }>({
    label: 'Home',
    fullName: '',
    phone: '',
    apartment: '',
    flatNo: '',
    locality: LAUNCH_ZONE,
    pincode: '501301',
    isDefault: false,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DYNAMIC DATA FETCHING (Strictly Supabase — Authenticated User Only)
  // ─────────────────────────────────────────────────────────────────────────────
  const loadAccountData = useCallback(async () => {
    setLoading(true);
    setFeedback(null);

    try {
      // Purge any stale legacy cross-account address cache from older versions
      clearLegacyGlobalAddresses();

      // A. Calculate Dynamic Delivery & Cutoff Schedule
      try {
        const { deliveryDate, cutoffDate, isOrderingOpen } = getNextDeliveryDate();
        setDeliveryTiming({
          deliveryDateFormatted: deliveryDate.toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          cutoffFormatted: `${cutoffDate.toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}, 11:00 PM`,
          isOrderingOpen,
        });
      } catch (err) {
        console.error('Failed to calculate delivery date:', err);
      }

      // B. Authenticated User & Profile from Supabase
      const supabase = createClient();
      let authUser = (await supabase.auth.getUser()).data?.user;

      if (!authUser) {
        // Double-check session in case fresh cookie is still initializing
        const sessionUser = (await supabase.auth.getSession()).data?.session?.user;
        if (sessionUser) {
          authUser = sessionUser;
        } else {
          // Brief 250ms grace period for newly committed cookies
          await new Promise((resolve) => setTimeout(resolve, 250));
          authUser = (await supabase.auth.getUser()).data?.user;
        }
      }

      if (!authUser) {
        // Must be logged in to access account details
        router.push('/login?next=/account');
        return;
      }

      // Query profiles table strictly for authUser.id
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      let activeProfile: ProfileData;

      if (!profileRow) {
        // Auto-create initial profile for the authenticated user if missing
        const defaultRole = authUser.email?.toLowerCase().endsWith('@easyfarm.in') ? 'admin' : 'customer';
        const defaultFullName =
          authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Resident';

        const { data: createdProfile } = await supabase
          .from('profiles')
          .insert({
            auth_user_id: authUser.id,
            full_name: defaultFullName,
            email: authUser.email || '',
            phone: authUser.phone || authUser.user_metadata?.phone || '',
            role: defaultRole,
          })
          .select()
          .single();

        activeProfile = createdProfile || {
          id: authUser.id,
          auth_user_id: authUser.id,
          full_name: defaultFullName,
          email: authUser.email || '',
          phone: authUser.phone || '',
          role: defaultRole,
        };
      } else {
        activeProfile = profileRow;
      }

      setProfile(activeProfile);
      setProfileNameInput(activeProfile.full_name || '');
      setProfilePhoneInput(activeProfile.phone || '');

      // C. Dynamic Orders Strictly for THIS Authenticated User
      // User requirement: "the orders should display only when the order is confirmed"
      const { data: dbOrders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          status,
          subtotal,
          delivery_fee,
          total,
          delivery_date,
          created_at,
          order_items (
            id,
            order_id,
            basket_id,
            basket_name,
            quantity,
            unit_price,
            total_price,
            baskets (
              id,
              name,
              image_url,
              slug
            )
          )
        `)
        .eq('customer_id', activeProfile.id)
        .in('status', [...CONFIRMED_ACTIVE_STATUSES, 'delivered'])
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.warn('Orders fetch error from Supabase:', ordersError.message);
      }

      setOrders((dbOrders as any[]) || []);

      // D. Dynamic Saved Addresses Strictly for THIS User's customer_id
      // User requirement: "every user has their own address"
      const { data: dbAddresses, error: addrError } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', activeProfile.id)
        .order('is_default', { ascending: false });

      if (addrError) {
        console.warn('Addresses fetch error from Supabase:', addrError.message);
      }

      setAddresses(dbAddresses || []);
    } catch (err: any) {
      console.error('Fatal loadAccountData error:', err);
      setFeedback({ type: 'error', message: err.message || 'Unable to load account data' });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PROFILE UPDATE ACTION (Direct Supabase Update)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setFeedback(null);

    try {
      const supabase = createClient();
      const updatedFields = {
        full_name: profileNameInput.trim(),
        phone: profilePhoneInput.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatedFields)
        .eq('id', profile.id);

      if (error) throw error;

      // Update local state and current user storage
      setProfile((prev) => (prev ? { ...prev, ...updatedFields } : null));
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'easyfarm_user',
          JSON.stringify({
            id: profile.id,
            email: profile.email,
            fullName: updatedFields.full_name,
            phone: updatedFields.phone,
            role: profile.role,
          })
        );
      }

      setFeedback({ type: 'success', message: 'Profile information updated successfully.' });
      setShowEditProfileModal(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Failed to update profile: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ADDRESS CRUD ACTIONS (Strictly in Supabase for Current User)
  // ─────────────────────────────────────────────────────────────────────────────
  const openNewAddressModal = () => {
    setEditingAddressId(null);
    setAddressForm({
      label: 'Home',
      fullName: profile?.full_name || '',
      phone: profile?.phone || '',
      apartment: '',
      flatNo: '',
      locality: LAUNCH_ZONE,
      pincode: '501301',
      isDefault: addresses.length === 0,
    });
    setShowAddressModal(true);
  };

  const openEditAddressModal = (addr: AddressData) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      label: addr.label || 'Home',
      fullName: profile?.full_name || '',
      phone: profile?.phone || '',
      apartment: addr.apartment || '',
      flatNo: addr.full_address || '',
      locality: addr.locality || LAUNCH_ZONE,
      pincode: addr.pincode || '501301',
      isDefault: Boolean(addr.is_default),
    });
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setFeedback(null);

    try {
      const supabase = createClient();

      // If user marks this address as default, unset other defaults for THIS user only
      if (addressForm.isDefault) {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('customer_id', profile.id);
      }

      if (editingAddressId) {
        // Update existing address for this customer
        const { error } = await supabase
          .from('customer_addresses')
          .update({
            label: addressForm.label,
            full_address: addressForm.flatNo,
            apartment: addressForm.apartment,
            locality: addressForm.locality,
            pincode: addressForm.pincode,
            is_default: addressForm.isDefault,
          })
          .eq('id', editingAddressId)
          .eq('customer_id', profile.id);

        if (error) throw error;
        setFeedback({ type: 'success', message: 'Delivery address updated successfully.' });
      } else {
        // Insert new address strictly bound to THIS profile.id
        const { error } = await supabase.from('customer_addresses').insert({
          customer_id: profile.id,
          label: addressForm.label,
          full_address: addressForm.flatNo,
          apartment: addressForm.apartment,
          locality: addressForm.locality,
          pincode: addressForm.pincode,
          is_default: addressForm.isDefault,
          latitude: 17.4475,
          longitude: 78.659,
        });

        if (error) throw error;
        setFeedback({ type: 'success', message: 'New delivery address added successfully.' });
      }

      setShowAddressModal(false);

      // Re-fetch addresses strictly for this user
      const { data: updatedAddrs } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', profile.id)
        .order('is_default', { ascending: false });

      setAddresses(updatedAddrs || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Could not save address: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!profile) return;
    if (!confirm('Are you sure you want to remove this delivery address?')) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id)
        .eq('customer_id', profile.id);

      if (error) throw error;

      setAddresses((prev) => prev.filter((a) => a.id !== id));
      setFeedback({ type: 'success', message: 'Address removed successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Failed to remove address: ${err.message}` });
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    if (!profile) return;
    try {
      const supabase = createClient();
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', profile.id);

      await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', id)
        .eq('customer_id', profile.id);

      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === id,
        }))
      );
      setFeedback({ type: 'success', message: 'Default delivery address updated.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Could not set default: ${err.message}` });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. LOGOUT ACTION
  // ─────────────────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('easyfarm_user');
      localStorage.removeItem('easyfarm_admin_user');
      clearLegacyGlobalAddresses();
    }
    router.push('/login');
  };

  // Confirmed orders filtering (pending_payment orders are excluded)
  const activeOrders = orders.filter((o) => CONFIRMED_ACTIVE_STATUSES.includes(o.status));
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');

  const getInitials = (name?: string) => {
    if (!name) return 'EF';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Harvest Scheduled';
      case 'processing':
        return 'Harvest in Progress';
      case 'packed':
        return 'Basket Packed & Ready';
      case 'ready_for_delivery':
        return 'Ready for Dispatch';
      case 'out_for_delivery':
        return 'Out for Doorstep Delivery';
      case 'delivered':
        return 'Delivered';
      default:
        return status.replace(/_/g, ' ').toUpperCase();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F9FAF8]">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <EasyFarmLoader
            size="md"
            text="Loading your account..."
            subtitle="Fetching live confirmed orders and saved addresses from Supabase"
          />
        </main>
        <Footer />
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAF8] pb-16 md:pb-0">
      <Header />

      <main className="flex-1 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-6">
        {/* FEEDBACK BANNER */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-700 transition"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ADMIN OPERATIONS BANNER */}
        {isAdmin && (
          <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-emerald-800">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Administrator Verified
              </div>
              <h2 className="text-lg font-black text-white">Operations Control Center</h2>
              <p className="text-xs text-emerald-200/80">
                Manage weekly basket configurations, route dispatch, and farmer catalogues.
              </p>
            </div>
            <Link
              href="/admin"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs sm:text-sm rounded-xl transition shadow-sm shrink-0"
            >
              Open Operations Panel →
            </Link>
          </div>
        )}

        {/* ── 1. TOP PROFILE HERO BANNER (Concept 2 Modern E-commerce) ──────── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* User Profile Info */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0B3B2C] text-white font-serif font-bold text-2xl sm:text-3xl flex items-center justify-center shadow-sm shrink-0">
                {getInitials(profile?.full_name)}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
                    {profile?.full_name || 'Resident'}
                  </h1>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isAdmin ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    {isAdmin ? 'Admin' : 'Resident'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {profile?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {profile.phone}
                    </span>
                  )}
                  {profile?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {profile.email}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-emerald-800 font-semibold pt-0.5">
                  {LAUNCH_ZONE} &amp; Pocharam Corridor
                </p>
              </div>
            </div>

            {/* Dynamic Stat Counters & Edit Profile CTA */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3.5 py-2.5 rounded-2xl text-center">
                <div>
                  <p className="text-base font-black text-slate-900 leading-none">
                    {deliveredOrders.length}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Delivered</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3.5 py-2.5 rounded-2xl text-center">
                <div>
                  <p className="text-base font-black text-[#0B3B2C] leading-none">
                    {activeOrders.length}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Active Orders</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3.5 py-2.5 rounded-2xl text-center">
                <div>
                  <p className="text-base font-black text-slate-900 leading-none">
                    {addresses.length}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Addresses</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEditProfileModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#0B3B2C] hover:bg-[#07281e] text-white text-xs font-bold transition shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. SEGMENTED TABS (Orders, Addresses, Settings) ───────────────── */}
        <div className="bg-white border border-slate-200/80 p-1.5 rounded-2xl shadow-2xs flex gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-emerald-50 text-[#0B3B2C] border border-emerald-200/80 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-700" />
            <span>My Orders ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coins')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'coins'
                ? 'bg-amber-50 text-amber-950 border border-amber-300 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-600" />
            <span>Easy Coins Rewards</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'addresses'
                ? 'bg-emerald-50 text-[#0B3B2C] border border-emerald-200/80 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span>Saved Addresses ({addresses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-emerald-50 text-[#0B3B2C] border border-emerald-200/80 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <User className="w-4 h-4 text-emerald-700" />
            <span>Account Settings</span>
          </button>
        </div>

        {/* ── 3. TAB 1: MY ORDERS (Confirmed Orders Only) ───────────────────── */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Active Orders Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      activeOrders.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                    }`}
                  />
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                    Active Orders ({activeOrders.length})
                  </h2>
                </div>
                {deliveryTiming.deliveryDateFormatted && (
                  <span className="text-xs text-slate-500 font-medium">
                    Next Delivery:{' '}
                    <strong className="text-slate-800">{deliveryTiming.deliveryDateFormatted}</strong>
                  </span>
                )}
              </div>

              {activeOrders.length > 0 ? (
                <div className="space-y-4">
                  {activeOrders.map((ord) => {
                    const primaryItem = ord.order_items?.[0];
                    const itemNames =
                      ord.order_items?.map((it) => it.basket_name).join(', ') || 'Weekly Produce Basket';
                    const basketImg =
                      primaryItem?.baskets?.image_url || '/images/hero-vegetables.png';

                    return (
                      <div
                        key={ord.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80"
                      >
                        {/* Basket Image */}
                        <div className="md:col-span-3 relative h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs">
                          <Image
                            src={basketImg}
                            alt={primaryItem?.basket_name || 'Weekly Basket'}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-emerald-950/85 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            Order #{ord.id.slice(0, 8)}
                          </div>
                        </div>

                        {/* Order Details */}
                        <div className="md:col-span-9 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                              <h3 className="text-base font-black text-slate-900">
                                {primaryItem?.basket_name || 'Weekly Produce Box'}
                              </h3>
                              <p className="text-xs text-slate-500 line-clamp-1">{itemNames}</p>
                            </div>
                            <span className="text-lg font-black text-[#0B3B2C]">₹{ord.total}</span>
                          </div>

                          {/* Status Badge */}
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{formatStatus(ord.status)}</span>
                          </div>

                          {/* Link to tracking */}
                          <div className="pt-1">
                            <Link
                              href={`/orders/${ord.id}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B3B2C] hover:bg-[#07281e] text-white font-bold text-xs transition shadow-2xs"
                            >
                              <span>View Order &amp; Delivery Tracking</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Dynamic Empty State */
                <div className="py-8 px-4 text-center border border-dashed border-slate-300 rounded-2xl bg-slate-50/50 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">No Active Confirmed Orders</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {deliveryTiming.deliveryDateFormatted
                        ? `The upcoming delivery is scheduled for ${deliveryTiming.deliveryDateFormatted}. Place your weekly order before ${deliveryTiming.cutoffFormatted}.`
                        : 'Order weekly for direct doorstep delivery from local Telangana farmers.'}
                    </p>
                  </div>
                  <Link
                    href="/baskets/staple-basket"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B3B2C] hover:bg-[#07281e] text-white text-xs font-bold transition shadow-xs"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Order This Week's Box</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Past Delivered Orders Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-900">
                  Past Orders ({deliveredOrders.length})
                </h2>
                <span className="text-xs text-slate-500">Delivered directly to doorstep</span>
              </div>

              {deliveredOrders.length > 0 ? (
                <div className="space-y-3">
                  {deliveredOrders.map((pastOrder) => {
                    const firstItem = pastOrder.order_items?.[0];
                    const orderDateStr = new Date(
                      pastOrder.delivery_date || pastOrder.created_at
                    ).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const reorderSlug = firstItem?.baskets?.slug || 'staple-basket';

                    return (
                      <div
                        key={pastOrder.id}
                        className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-xs">
                            🌿
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900">
                                {firstItem?.basket_name || 'Weekly Vegetable Box'}
                              </h4>
                              <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                                Delivered
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{orderDateStr}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                          <span className="text-sm font-black text-slate-900">₹{pastOrder.total}</span>
                          <Link
                            href={`/baskets/${reorderSlug}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B3B2C] hover:bg-[#07281e] text-white text-xs font-bold transition shadow-2xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reorder Box</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Dynamic Empty Past Orders */
                <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-slate-50/40">
                  <p className="font-semibold text-slate-700">No past orders yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Your completed Sunday deliveries and order receipts will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: EASY COINS & PHYSICAL REWARDS ───────────────────────────── */}
        {activeTab === 'coins' && (
          <EasyCoinsAccountTab
            customerId={profile?.id}
            customerName={profile?.full_name}
          />
        )}

        {/* ── 4. TAB 2: SAVED ADDRESSES (Strictly THIS User's Addresses) ────── */}
        {activeTab === 'addresses' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Saved Delivery Addresses ({addresses.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your doorstep drop locations for Sunday deliveries in {LAUNCH_ZONE} &amp; Pocharam.
                </p>
              </div>

              <button
                type="button"
                onClick={openNewAddressModal}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B3B2C] hover:bg-[#07281e] text-white text-xs font-bold transition shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Address</span>
              </button>
            </div>

            {addresses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-5 rounded-2xl border transition-all space-y-3 relative ${
                      addr.is_default
                        ? 'border-emerald-500 bg-emerald-50/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                          {addr.label || 'Home'}
                        </span>
                        {addr.is_default && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            Default Delivery
                          </span>
                        )}
                      </div>

                      {/* Edit / Delete Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditAddressModal(addr)}
                          className="p-1.5 text-slate-400 hover:text-emerald-800 transition rounded-lg hover:bg-slate-100"
                          title="Edit Address"
                          aria-label="Edit address"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition rounded-lg hover:bg-slate-100"
                          title="Remove Address"
                          aria-label="Delete address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Address Body */}
                    <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
                      <p className="font-bold text-slate-900">{profile?.full_name}</p>
                      <p>
                        {addr.full_address}
                        {addr.apartment ? `, ${addr.apartment}` : ''}
                      </p>
                      <p>
                        {addr.locality}, Hyderabad &ndash; {addr.pincode}
                      </p>
                      {profile?.phone && <p className="text-slate-400">{profile.phone}</p>}
                    </div>

                    {/* Default Toggle Action */}
                    {!addr.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-[11px] font-bold text-emerald-800 hover:underline pt-1 inline-block"
                      >
                        Set as default delivery address
                      </button>
                    )}
                  </div>
                ))}

                {/* Add New Address dashed tile */}
                <button
                  type="button"
                  onClick={openNewAddressModal}
                  className="p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/20 transition flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-emerald-900 min-h-[160px]"
                >
                  <Plus className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-bold">+ Add Another Address</span>
                </button>
              </div>
            ) : (
              /* Dynamic Empty State for Addresses */
              <div className="py-12 text-center text-xs text-slate-500 space-y-3 border border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
                <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">No delivery address saved yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Add your flat number &amp; apartment building in Ghatkesar / Pocharam for smooth drops.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewAddressModal}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0B3B2C] text-white font-bold text-xs shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Delivery Address
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 5. TAB 3: ACCOUNT SETTINGS ────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-900">Profile Details</h2>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(true)}
                  className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 block font-medium">Full Name</span>
                  <span className="font-bold text-slate-900 block text-sm">
                    {profile?.full_name || 'Not provided'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 block font-medium">Phone Number</span>
                  <span className="font-bold text-slate-900 block text-sm">
                    {profile?.phone || 'Not provided'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 block font-medium">Email Address</span>
                  <span className="font-bold text-slate-900 block text-sm">
                    {profile?.email || 'Not provided'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 block font-medium">Delivery Corridor</span>
                  <span className="font-bold text-emerald-900 block text-sm">
                    {LAUNCH_ZONE} &amp; Pocharam Corridor
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/location"
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-500 transition shadow-xs flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:bg-emerald-800 group-hover:text-white transition">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Delivery Service Map</h3>
                    <p className="text-[11px] text-slate-500">Check active communities &amp; boundaries</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
              </Link>

              <Link
                href="/baskets/staple-basket"
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-500 transition shadow-xs flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:bg-emerald-800 group-hover:text-white transition">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Weekly Staple Box</h3>
                    <p className="text-[11px] text-slate-500">View this week's harvest &amp; customize</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
              </Link>
            </div>

            {/* Logout Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-5 py-3 rounded-xl transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Account</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL: EDIT PROFILE ───────────────────────────────────────────── */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Edit Profile Details</h3>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profilePhoneInput}
                  onChange={(e) => setProfilePhoneInput(e.target.value)}
                  placeholder="e.g. 9849012345"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#0B3B2C] hover:bg-[#07281e] text-white font-bold text-xs transition shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Profile Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT ADDRESS ─────────────────────────────────────── */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address Label</label>
                <div className="flex gap-2">
                  {['Home', 'Work', 'Other'].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddressForm({ ...addressForm, label: lbl })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                        addressForm.label === lbl
                          ? 'bg-[#0B3B2C] text-white border-[#0B3B2C] shadow-xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Apartment Building / Gated Community *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Singapore Township / Modi Emerald Heights"
                  value={addressForm.apartment}
                  onChange={(e) => setAddressForm({ ...addressForm, apartment: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Flat No / House / Door Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block C, Flat 402"
                  value={addressForm.flatNo}
                  onChange={(e) => setAddressForm({ ...addressForm, flatNo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Locality</label>
                  <input
                    type="text"
                    required
                    value={addressForm.locality}
                    onChange={(e) => setAddressForm({ ...addressForm, locality: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultAddressCheckbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="w-4 h-4 text-emerald-800 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label
                  htmlFor="defaultAddressCheckbox"
                  className="text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Make this my default delivery address
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#0B3B2C] hover:bg-[#07281e] text-white font-bold text-xs transition shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Delivery Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
      <BottomNav />
    </div>
  );
}
