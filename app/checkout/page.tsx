'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { useCart } from '@/components/cart/CartProvider';
import { CheckCircle2, ShieldCheck, MapPin, CreditCard, ShoppingBag, Plus, Check, RefreshCw } from 'lucide-react';
import { PaymentService } from '@/services/payment.service';
import { createClient } from '@/lib/supabase/client';
import { getSavedAddresses, saveUserAddresses, SavedAddressItem as SavedAddress } from '@/lib/utils/address';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import type { LocationValidationResult } from '@/components/checkout/DeliveryMapPicker';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

const DeliveryMapPicker = dynamic(
  () => import('@/components/checkout/DeliveryMapPicker').then((mod) => mod.DeliveryMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] w-full rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
        <EasyFarmLoader size="sm" text="Loading Ghatkesar delivery map..." />
      </div>
    ),
  }
);

export type { SavedAddress };

interface ServerTotal {
  valid: boolean;
  subtotal: number;
  couponDiscount: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  isFreeDelivery: boolean;
  totalPayable: number;
  couponCode?: string;
  message?: string;
  itemsBreakdown?: Array<{
    basketId: string;
    basketName: string;
    quantity: number;
    unitPrice: number;
    compareAtPrice?: number;
    totalPrice: number;
  }>;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Address management states
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id?: string; email?: string } | null>(null);

  // Map and Location validation states
  const [isLocationServiceable, setIsLocationServiceable] = useState(true);
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number }>({
    lat: 17.4475,
    lng: 78.6534,
  });

  // Form inputs for new address
  const [formAddress, setFormAddress] = useState<SavedAddress>({
    id: '',
    label: 'Home',
    fullName: '',
    phone: '',
    email: '',
    apartment: 'Singapore Township',
    flatNo: '',
    locality: 'Ghatkesar',
    pincode: '500088',
  });

  const handleMapLocationChange = useCallback((result: LocationValidationResult) => {
    setIsLocationServiceable(result.isServiceable);
    setPinnedCoords({ lat: result.lat, lng: result.lng });
    setFormAddress((prev) => ({
      ...prev,
      locality: result.locality || 'Ghatkesar mandal',
      pincode: result.pincode || '501301',
      apartment: result.placeName || result.communityName || prev.apartment || 'Rajeev Gruha Kalpa',
    }));
    if (result.isServiceable) {
      setError((prev) => (prev && (prev.includes('corridor') || prev.includes('Outside') || prev.includes('Pinned')) ? null : prev));
    } else {
      setError('Pinned location is outside our active Ghatkesar Sunday delivery corridor. Please move the pin to Rajeev Gruha Kalpa, Singapore Township, or nearby Ghatkesar communities.');
    }
  }, []);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Server-authoritative pricing state
  const [serverTotal, setServerTotal] = useState<ServerTotal | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  // Recalculate server-authoritative pricing whenever cart items or coupon changes
  const recalculateTotal = useCallback(async (coupon?: string) => {
    if (items.length === 0) return;
    setPricingLoading(true);
    try {
      const res = await fetch('/api/checkout/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            basketId: i.basket.id,
            quantity: i.quantity,
            customPrice: i.basket.price,
            compareAtPrice: i.basket.compare_at_price,
          })),
          couponCode: coupon ?? appliedCouponCode ?? undefined,
          customerEmail: currentUser?.email,
        }),
      });
      const data: ServerTotal = await res.json();
      setServerTotal(data);
    } catch {
      // On network error keep existing calculation
    } finally {
      setPricingLoading(false);
    }
  }, [items, appliedCouponCode, currentUser?.email]);

  // Recalculate on mount and when cart changes
  useEffect(() => {
    recalculateTotal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      // Pre-validate coupon via coupons/validate first to get human-readable error message
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          subtotal: serverTotal?.subtotal ?? subtotal,
          customerEmail: currentUser?.email && currentUser.email.includes('@') ? currentUser.email : undefined,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCouponCode(data.code);
        setCouponCode(data.code);
        setCouponError(null);
        // Recalculate server total with the coupon
        await recalculateTotal(data.code);
      } else {
        setCouponError(data.message || 'Invalid coupon code');
        setAppliedCouponCode(null);
      }
    } catch {
      setCouponError('Failed to apply coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  // Server-authoritative totals (fallback to cart subtotal during loading)
  const displaySubtotal = serverTotal?.subtotal ?? subtotal;
  const displayCouponDiscount = serverTotal?.couponDiscount ?? 0;
  const displayDeliveryFee = serverTotal?.deliveryFee ?? 0;
  const displayTotal = serverTotal?.totalPayable ?? Math.max(0, subtotal - displayCouponDiscount);
  const isFreeDelivery = serverTotal?.isFreeDelivery ?? false;

  useEffect(() => {
    async function loadUserAndAddresses() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let initialName = '';
        let initialPhone = '';
        let initialEmail = '';
        let userIdent: { id?: string; email?: string } | null = null;
        let profileId: string | null = null;

        if (user) {
          userIdent = { id: user.id, email: user.email };
          initialEmail = user.email || '';
          initialName = user.user_metadata?.full_name || '';
          initialPhone = user.user_metadata?.phone || '';

          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, phone, email')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          if (profile) {
            profileId = profile.id;
            initialName = profile.full_name || initialName;
            initialPhone = profile.phone || initialPhone;
            initialEmail = profile.email || initialEmail;
          }
        } else if (typeof window !== 'undefined') {
          const demoUserStr = localStorage.getItem('easyfarm_user');
          if (demoUserStr) {
            try {
              const demoUser = JSON.parse(demoUserStr);
              initialName = demoUser.fullName || '';
              initialPhone = demoUser.phone || '';
              initialEmail = demoUser.email || '';
              userIdent = { email: demoUser.email };
            } catch {}
          }
        }

        setCurrentUser(userIdent);

        // 1. Fetch persistent database addresses if user has a profile
        let dbAddresses: SavedAddress[] = [];
        if (profileId) {
          try {
            const { data: rows } = await supabase
              .from('customer_addresses')
              .select('*')
              .eq('customer_id', profileId)
              .order('created_at', { ascending: false });

            if (rows && rows.length > 0) {
              dbAddresses = rows.map((r: any) => ({
                id: r.id,
                label: r.label || 'Home',
                fullName: initialName || 'Resident',
                phone: initialPhone || '',
                email: initialEmail,
                apartment: r.apartment || 'Singapore Township',
                flatNo: r.full_address || '',
                locality: r.locality || 'Singapore Township & Pocharam Corridor',
                pincode: r.pincode || '500088',
                latitude: Number(r.latitude) || 17.4475,
                longitude: Number(r.longitude) || 78.6534,
                isDefault: Boolean(r.is_default),
              }));
            }
          } catch (e) {
            console.warn('Error loading addresses from DB:', e);
          }
        }

        // 2. Load locally saved addresses
        const localAddresses = getSavedAddresses(userIdent);

        // 3. Merge DB and local addresses without duplicates
        const combined: SavedAddress[] = [...dbAddresses];
        for (const localAddr of localAddresses) {
          if (!combined.some((a) => a.id === localAddr.id || (a.flatNo === localAddr.flatNo && a.apartment === localAddr.apartment))) {
            combined.push({
              ...localAddr,
              fullName: localAddr.fullName || initialName || 'Resident',
              phone: localAddr.phone || initialPhone || '',
              email: localAddr.email || initialEmail,
            });
          }
        }

        if (combined.length > 0) {
          // Normalize coordinates & contact info for saved addresses
          const normalized = combined.map((addr) => {
            let lat = addr.latitude;
            let lng = addr.longitude;
            if (!lat || !lng) {
              // Default to Singapore Township, Ghatkesar launch center
              lat = 17.4475;
              lng = 78.6534;
            }
            return {
              ...addr,
              fullName: addr.fullName || initialName || 'Resident',
              phone: addr.phone || initialPhone || '',
              latitude: lat,
              longitude: lng,
            };
          });

          setSavedAddresses(normalized);
          const defaultAddr = normalized.find((a) => a.isDefault) || normalized[0];
          setSelectedAddressId(defaultAddr.id);
          const targetLat = defaultAddr.latitude || 17.4475;
          const targetLng = defaultAddr.longitude || 78.6534;
          setPinnedCoords({ lat: targetLat, lng: targetLng });
          setShowAddForm(false);

          // Authoritatively verify serviceability for the initial saved address
          try {
            const checkRes = await fetch('/api/delivery/check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude: targetLat, longitude: targetLng }),
            });
            const checkData = await checkRes.json();
            setIsLocationServiceable(Boolean(checkData.available));
          } catch {
            setIsLocationServiceable(true);
          }
        } else {
          // If no saved addresses exist yet, open form with user's initial name/email/phone
          setFormAddress((prev) => ({
            ...prev,
            fullName: initialName,
            phone: initialPhone,
            email: initialEmail,
          }));
          setShowAddForm(true);
        }
      } catch (err) {
        console.error('Error initializing checkout address data:', err);
      }
    }

    loadUserAndAddresses();
  }, []);

  const activeAddress = savedAddresses.find((a) => a.id === selectedAddressId) || formAddress;

  const handleSelectSavedAddress = async (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    const lat = addr.latitude || 17.4475;
    const lng = addr.longitude || 78.6534;
    setPinnedCoords({ lat, lng });

    try {
      const checkRes = await fetch('/api/delivery/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      const checkData = await checkRes.json();
      setIsLocationServiceable(Boolean(checkData.available));
      if (!checkData.available) {
        setError(
          `Selected address (${addr.apartment || addr.locality}) is outside our active Ghatkesar Sunday delivery zone. Please update the pinned location on the map.`
        );
      } else {
        setError(null);
      }
    } catch {
      setIsLocationServiceable(true);
    }
  };

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAddress.fullName || !formAddress.phone || !formAddress.apartment || !formAddress.flatNo) {
      setError('Please fill in all required address fields.');
      return;
    }

    if (!isLocationServiceable) {
      setError('Selected address is outside our Ghatkesar delivery zone. Please choose a location within Singapore Township, Emerald Heights, or nearby Ghatkesar communities.');
      return;
    }

    let newId = `addr-${Date.now()}`;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (profile) {
          const { data: inserted } = await supabase
            .from('customer_addresses')
            .insert({
              customer_id: profile.id,
              label: formAddress.label,
              full_address: formAddress.flatNo,
              apartment: formAddress.apartment,
              locality: formAddress.locality,
              pincode: formAddress.pincode,
              latitude: pinnedCoords.lat,
              longitude: pinnedCoords.lng,
              is_default: savedAddresses.length === 0,
            })
            .select()
            .maybeSingle();

          if (inserted?.id) {
            newId = inserted.id;
          }
        }
      }
    } catch (err) {
      console.error('Error saving address to database during checkout:', err);
    }

    const newAddrObj: SavedAddress = {
      ...formAddress,
      id: newId,
      latitude: pinnedCoords.lat,
      longitude: pinnedCoords.lng,
      isDefault: savedAddresses.length === 0,
    };

    const updatedAddresses = [...savedAddresses, newAddrObj];
    setSavedAddresses(updatedAddresses);
    setSelectedAddressId(newId);
    saveUserAddresses(currentUser, updatedAddresses);
    setShowAddForm(false);
    setError(null);
  };

  const handlePlaceOrder = async () => {
    const rawPhone = (activeAddress.phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone;
    const cleanPincode = (activeAddress.pincode || '500088').replace(/\D/g, '').slice(0, 6) || '500088';

    if (!activeAddress.fullName || !cleanPhone || !activeAddress.apartment || !activeAddress.flatNo) {
      const missing = [];
      if (!activeAddress.fullName) missing.push('Full Name');
      if (!cleanPhone) missing.push('Phone Number (10 digits)');
      if (!activeAddress.apartment) missing.push('Apartment / Building Name');
      if (!activeAddress.flatNo) missing.push('Flat / Door Number');
      setError(`Please provide recipient details: ${missing.join(', ')}.`);
      setShowAddForm(true);
      setStep(1);
      return;
    }

    const orderLat = Number(activeAddress.latitude) || pinnedCoords.lat || 17.4475;
    const orderLng = Number(activeAddress.longitude) || pinnedCoords.lng || 78.6534;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            basketId: i.basket.id,
            quantity: i.quantity,
            customPrice: i.basket.price,
            compareAtPrice: i.basket.compare_at_price,
            customizedItems: i.customizedItems,
          })),
          address: {
            ...activeAddress,
            fullName: activeAddress.fullName || 'Resident',
            phone: cleanPhone,
            pincode: cleanPincode,
            email: activeAddress.email && activeAddress.email.includes('@') ? activeAddress.email : undefined,
            locality: activeAddress.locality || 'Singapore Township & Pocharam Corridor',
            latitude: orderLat,
            longitude: orderLng,
          },
          couponCode: appliedCouponCode || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.unserviceable) {
          setIsLocationServiceable(false);
          setShowAddForm(true);
          setStep(1);
        }
        throw new Error(data.error || 'Failed to process checkout order.');
      }

      const confirmedOrderId = data.orderId;
      const paymentOrder = data.paymentOrder;

      // Helper to dynamically load Razorpay checkout script if not yet loaded
      const loadRazorpayScript = (): Promise<boolean> => {
        return new Promise((resolve) => {
          if (typeof window === 'undefined') return resolve(false);
          if ((window as any).Razorpay) return resolve(true);
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || !(window as any).Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // If Razorpay order is returned, launch standard checkout modal
      if (paymentOrder?.id) {
        const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';

        const razorpayOptions = {
          key: razorpayKey,
          amount: paymentOrder.amount, // in paise
          currency: paymentOrder.currency || 'INR',
          name: 'Easy Farm',
          description: 'Fresh Farm Produce Sunday Delivery',
          image: '/images/easyfarm-logo.png',
          order_id: paymentOrder.id,
          handler: async function (paymentResp: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) {
            try {
              setLoading(true);

              // Verify signature on backend
              const verifyRes = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: paymentResp.razorpay_order_id,
                  razorpay_payment_id: paymentResp.razorpay_payment_id,
                  razorpay_signature: paymentResp.razorpay_signature,
                  app_order_id: confirmedOrderId,
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || !verifyData.success) {
                throw new Error(verifyData.error || 'Payment signature verification failed.');
              }

              // Save order to localStorage and track in order IDs list
              if (typeof window !== 'undefined') {
                const orderData = {
                  orderId: confirmedOrderId,
                  address: activeAddress,
                  items,
                  subtotal: data.subtotal,
                  couponDiscount: data.couponDiscount,
                  couponCode: appliedCouponCode,
                  deliveryFee: data.deliveryFee,
                  total: data.total,
                  deliveryZone: data.deliveryZone,
                  paymentId: paymentResp.razorpay_payment_id,
                  paymentStatus: 'paid',
                  status: 'confirmed',
                  createdAt: new Date().toISOString(),
                };

                localStorage.setItem(`easyfarm_order_${confirmedOrderId}`, JSON.stringify(orderData));

                try {
                  const existingIdsStr = localStorage.getItem('easyfarm_order_ids');
                  const existingIds: string[] = existingIdsStr ? JSON.parse(existingIdsStr) : [];
                  if (!existingIds.includes(confirmedOrderId)) {
                    existingIds.unshift(confirmedOrderId);
                    localStorage.setItem('easyfarm_order_ids', JSON.stringify(existingIds));
                  }
                } catch {}
              }

              clearCart();
              router.push(`/orders/${confirmedOrderId}?success=true&payment_id=${paymentResp.razorpay_payment_id}`);
            } catch (vErr: any) {
              setError(vErr.message || 'Payment verification failed. Please contact support.');
              setLoading(false);
            }
          },
          prefill: {
            name: activeAddress.fullName || '',
            email: activeAddress.email || '',
            contact: cleanPhone || '',
          },
          theme: {
            color: '#065F46',
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(razorpayOptions);

        rzp.on('payment.failed', function (failResp: any) {
          console.error('Razorpay payment failed:', failResp.error);
          setError(`Payment Failed: ${failResp.error?.description || failResp.error?.reason || 'Transaction could not be completed'}`);
          setLoading(false);
        });

        rzp.open();
      } else {
        // Fallback if no payment order returned
        clearCart();
        router.push(`/orders/${confirmedOrderId}?success=true`);
      }
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed. Please check your delivery location.');
      setLoading(false);
    }
  };


  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <ShoppingBag className="w-16 h-16 text-slate-300 mb-3" />
          <h2 className="text-xl font-bold text-slate-800">Your cart is empty</h2>
          <p className="text-xs text-slate-500 mt-1">Please add a basket to proceed with checkout.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-16 md:pb-0">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* CHECKOUT STEPS HEADER */}
        <div className="mb-8 flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-wider">
          <span className={`flex items-center gap-1.5 ${step === 1 ? 'text-emerald-800' : 'text-slate-400'}`}>
            <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs">1</span>
            Delivery Address
          </span>
          <span className="text-slate-300">——</span>
          <span className={`flex items-center gap-1.5 ${step === 2 ? 'text-emerald-800' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
            Payment & Review
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* LEFT FORM */}
          <div className="md:col-span-7 space-y-6">
            {step === 1 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-700" />
                    Delivery Destination
                  </h2>
                  {savedAddresses.length > 0 && !showAddForm && (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add New Address
                    </button>
                  )}
                </div>

                {/* SAVED ADDRESSES SELECTOR */}
                {savedAddresses.length > 0 && !showAddForm && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700">Select Saved Address for Sunday Delivery:</label>
                    <div className="space-y-2.5">
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            onClick={() => handleSelectSavedAddress(addr)}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start justify-between gap-3 ${
                              isSelected
                                ? 'border-emerald-700 bg-emerald-50/60 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                            }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-emerald-900 text-white">
                                  {addr.label}
                                </span>
                                <span className="font-bold text-slate-900 text-sm">{addr.fullName}</span>
                                <span className="text-xs text-slate-500">({addr.phone})</span>
                              </div>
                              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                {addr.flatNo}, {addr.apartment}, {addr.locality} — {addr.pincode}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                              isSelected ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Selected Address Serviceability Status Badge */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isLocationServiceable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        <div>
                          <p className="text-xs font-bold text-emerald-950">
                            {isLocationServiceable
                              ? 'Verified Ghatkesar Delivery Corridor'
                              : '⚠️ Selected Address Outside Service Corridor'}
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            {isLocationServiceable
                              ? 'Sunday weekly doorstep delivery confirmed'
                              : 'Please re-pin your address in Singapore Township or Ghatkesar'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(true)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 shadow-xs transition"
                      >
                        📍 Re-pin on Map
                      </button>
                    </div>
                  </div>
                )}

                {/* ADD NEW ADDRESS FORM */}
                {(showAddForm || savedAddresses.length === 0) && (
                  <form onSubmit={handleSaveNewAddress} className="space-y-4 pt-2">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-800">
                        {savedAddresses.length === 0 ? '1. Pin Delivery Location on Map' : 'Add Another Delivery Address'}
                      </span>
                      {savedAddresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {/* BIGBASKET / ZEPTO INTERACTIVE MAP PICKER */}
                    <div className="pt-1">
                      <DeliveryMapPicker onLocationChange={handleMapLocationChange} />
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Address Label *</label>
                      <div className="flex gap-2">
                        {['Home', 'Work', "Parent's Flat", 'Other'].map((lbl) => (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => setFormAddress({ ...formAddress, label: lbl })}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                              formAddress.label === lbl
                                ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Kumar"
                        value={formAddress.fullName}
                        onChange={(e) => setFormAddress({ ...formAddress, fullName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (10 digits) *</label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 9849012345"
                          value={formAddress.phone}
                          onChange={(e) => setFormAddress({ ...formAddress, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. name@example.com"
                          value={formAddress.email}
                          onChange={(e) => setFormAddress({ ...formAddress, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Gated Community / Apartment / Building Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Singapore Township / Emerald Heights / Modi Emerald"
                        value={formAddress.apartment}
                        onChange={(e) => setFormAddress({ ...formAddress, apartment: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Flat / Tower / House / Door Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Block C, Flat 402 / Tower 3, Flat 1204"
                        value={formAddress.flatNo}
                        onChange={(e) => setFormAddress({ ...formAddress, flatNo: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Zone</label>
                        <input
                          type="text"
                          disabled
                          value={formAddress.locality || 'Ghatkesar'}
                          className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-bold text-sm min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">PIN Code</label>
                        <input
                          type="text"
                          disabled
                          value={formAddress.pincode || '500088'}
                          className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-bold text-sm min-h-[44px]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!isLocationServiceable}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm transition shadow-md flex items-center justify-center gap-2 ${
                        isLocationServiceable
                          ? 'bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isLocationServiceable ? 'Save Address & Select' : '⚠️ Location Outside Service Zone — Move Pin to Ghatkesar'}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!isLocationServiceable) {
                      setShowAddForm(true);
                      setError('Your delivery location needs to be confirmed on the map within the Ghatkesar Sunday delivery corridor.');
                      return;
                    }

                    const target = savedAddresses.find((a) => a.id === selectedAddressId) || formAddress;
                    const rawPhone = (target.phone || '').replace(/\D/g, '');
                    const cleanPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone;

                    if (!target.fullName || target.fullName.trim().length === 0) {
                      setShowAddForm(true);
                      setError('Please enter Recipient Full Name before continuing.');
                      return;
                    }

                    if (!cleanPhone || cleanPhone.length < 10) {
                      setShowAddForm(true);
                      setError('Please enter a valid 10-digit Phone Number.');
                      return;
                    }

                    if (!target.apartment || target.apartment.trim().length === 0) {
                      setShowAddForm(true);
                      setError('Please enter your Apartment / Building / Community Name.');
                      return;
                    }

                    if (!target.flatNo || target.flatNo.trim().length === 0) {
                      setShowAddForm(true);
                      setError('Please enter your Flat / House / Door Number.');
                      return;
                    }

                    // Auto-save address if user filled form without clicking "Save Address & Select"
                    if (showAddForm || savedAddresses.length === 0 || !savedAddresses.some((a) => a.id === selectedAddressId)) {
                      const newId = `addr_${Date.now()}`;
                      const newAddrObj: SavedAddress = {
                        ...formAddress,
                        id: newId,
                        fullName: target.fullName.trim(),
                        phone: cleanPhone,
                        apartment: target.apartment.trim(),
                        flatNo: target.flatNo.trim(),
                        latitude: pinnedCoords.lat,
                        longitude: pinnedCoords.lng,
                        isDefault: savedAddresses.length === 0,
                      };
                      const updated = [...savedAddresses, newAddrObj];
                      setSavedAddresses(updated);
                      setSelectedAddressId(newId);
                      saveUserAddresses(currentUser, updated);
                      setShowAddForm(false);
                    }

                    setError(null);
                    setStep(2);
                  }}
                  className={`w-full py-4 rounded-xl font-bold text-base transition shadow-md min-h-[48px] mt-4 flex items-center justify-center gap-2 cursor-pointer ${
                    isLocationServiceable
                      ? 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-emerald-900/20'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {isLocationServiceable ? (
                    'Continue to Payment →'
                  ) : (
                    '📍 Confirm Location on Map to Continue →'
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-700" />
                  Select Payment Method
                </h2>

                <div className="space-y-3">
                  <div className="p-4 border-2 border-emerald-600 bg-emerald-50/50 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Razorpay Secure Checkout</h4>
                      <p className="text-xs text-slate-500">UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, NetBanking</p>
                    </div>
                    <ShieldCheck className="w-6 h-6 text-emerald-700" />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-600 space-y-1.5 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Delivering to:</span>
                    <span className="text-[10px] font-bold uppercase bg-emerald-800 text-white px-2 py-0.5 rounded">
                      {activeAddress.label}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">{activeAddress.fullName} ({activeAddress.phone})</p>
                  <p>{activeAddress.flatNo}, {activeAddress.apartment}, {activeAddress.locality || 'Ghatkesar'}, PIN {activeAddress.pincode || '500088'}</p>
                </div>

                {serverTotal && !serverTotal.valid && (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs font-bold space-y-1">
                    <p className="flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{serverTotal.message || 'Cannot place order. Please check your cart.'}</span>
                    </p>
                    <p className="text-[11px] font-normal text-amber-700">
                      💡 Tip: Use coupon code <strong className="font-mono font-bold text-amber-900">TEST1</strong> to pay ₹1 for testing!
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition min-h-[48px]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={loading || pricingLoading || (serverTotal ? !serverTotal.valid : false)}
                    className="w-2/3 py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-base transition shadow-lg min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : pricingLoading ? 'Calculating...' : `Pay ₹${displayTotal.toFixed(2)} & Place Order`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SUMMARY */}
          <div className="md:col-span-5">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-md sticky top-24">
              <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
                Order Review ({items.length} item)
              </h3>

              <div className="space-y-3">
                {items.map(({ basket, quantity, customizedItems }) => (
                  <div key={basket.id} className="space-y-1.5 text-xs text-slate-700 border-b border-slate-100 pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900">{basket.name} x {quantity}</p>
                        {basket.compare_at_price && basket.compare_at_price > basket.price && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="line-through text-slate-400">₹{(basket.compare_at_price * quantity).toFixed(2)}</span>
                            <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">
                              Save ₹{((basket.compare_at_price - basket.price) * quantity).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-slate-900">₹{(basket.price * quantity).toFixed(2)}</span>
                    </div>

                    {customizedItems && customizedItems.length > 0 && (
                      <div className="mt-1 pl-2 border-l-2 border-emerald-400 bg-emerald-50/40 p-1.5 rounded-r-lg text-[11px] space-y-1">
                        <span className="font-bold text-emerald-950 block text-[10px] uppercase tracking-wider">
                          Selected 5 Items:
                        </span>
                        <div className="grid grid-cols-1 gap-0.5">
                          {customizedItems.map((ci: any, cidx: number) => (
                            <div key={cidx} className="flex justify-between text-[11px] text-slate-600">
                              <span>• {ci.productName || ci.name} ({ci.quantity} {ci.unit})</span>
                              <span className="font-semibold text-slate-700">₹{ci.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* COUPON SECTION */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon Code (e.g. EASY50)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs disabled:opacity-50 transition"
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </form>

                {couponError && (
                  <p className="text-[11px] font-semibold text-red-600 pl-1">{couponError}</p>
                )}

                {appliedCouponCode && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                    <div>
                      <span className="font-bold font-mono">{appliedCouponCode}</span> applied!
                      {displayCouponDiscount > 0 && (
                        <p className="text-[10px] text-emerald-700">You save ₹{displayCouponDiscount.toFixed(2)}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCouponCode(null);
                        setCouponCode('');
                        recalculateTotal(undefined);
                      }}
                      className="text-[10px] text-red-600 font-bold underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                {pricingLoading ? (
                  <div className="flex items-center justify-center py-3">
                    <EasyFarmLoader size="sm" text="Calculating secure total..." inline />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-900">₹{displaySubtotal.toFixed(2)}</span>
                    </div>

                    {displayCouponDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Coupon Discount ({appliedCouponCode})</span>
                        <span>- ₹{displayCouponDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Fee</span>
                      <span className={`font-bold ${isFreeDelivery ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {isFreeDelivery ? 'FREE' : `₹${displayDeliveryFee.toFixed(2)}`}
                      </span>
                    </div>

                    {!isFreeDelivery && serverTotal && (
                      <p className="text-[10px] text-slate-400">
                        Free delivery on orders above ₹{serverTotal.freeDeliveryThreshold}
                      </p>
                    )}

                    <div className="border-t border-slate-100 pt-2 flex justify-between text-base font-black text-slate-900">
                      <span>Total Payable</span>
                      <span className="text-emerald-800">₹{displayTotal.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-emerald-900 text-white p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-300">Sunday Delivery Promised</p>
                  <p className="text-emerald-200 mt-0.5">Vegetables will be plucked fresh on Saturday morning in Chevella/Shankarpally and delivered to your doorstep.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

