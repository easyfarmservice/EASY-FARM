'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { CheckCircle, MapPin } from 'lucide-react';

function WaitlistFormContent() {
  const searchParams = useSearchParams();
  const urlLat = searchParams.get('lat');
  const urlLng = searchParams.get('lng');
  const urlLocality = searchParams.get('locality');
  const urlPincode = searchParams.get('pincode');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    pincode: urlPincode || '',
    locality: urlLocality || '',
    apartment: '',
    latitude: urlLat ? parseFloat(urlLat) : undefined,
    longitude: urlLng ? parseFloat(urlLng) : undefined,
  });

  useEffect(() => {
    if (urlLocality || urlLat || urlPincode) {
      setFormData((prev) => ({
        ...prev,
        locality: urlLocality || prev.locality,
        pincode: urlPincode || prev.pincode,
        latitude: urlLat ? parseFloat(urlLat) : prev.latitude,
        longitude: urlLng ? parseFloat(urlLng) : prev.longitude,
      }));
    }
  }, [urlLocality, urlLat, urlLng, urlPincode]);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit waitlist form');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
          Expansion Waitlist
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          Want Easy Farm in your community?
        </h1>
        <p className="text-sm text-slate-600">
          We're currently launching in Ghatkesar (Singapore Township &amp; Emerald Heights). Join the waitlist to vote for expansion to Uppal, Narapally, Boduppal, or Secunderabad!
        </p>
      </div>

      {formData.latitude && formData.longitude && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Location coordinates recorded: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}</span>
        </div>
      )}

      {submitted ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-xl font-bold text-emerald-950">You're on the waitlist!</h2>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Thank you! We'll notify you as soon as Easy Farm begins weekly Sunday deliveries in <strong>{formData.locality || formData.pincode}</strong>.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="10-digit mobile"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">PIN Code *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="e.g. 500039"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Locality / Area *</label>
              <input
                type="text"
                required
                value={formData.locality}
                onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                placeholder="e.g. Uppal / Narapally / Boduppal"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Apartment / Gated Community Name</label>
            <input
              type="text"
              value={formData.apartment}
              onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
              placeholder="e.g. Modi Emerald Heights / Sanskruti"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[44px]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-base transition shadow-md min-h-[48px]"
          >
            {loading ? 'Submitting...' : 'Join Expansion Waitlist'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-16 md:pb-0">
      <Header />
      <main className="flex-1 py-12 px-4 sm:px-6">
        <Suspense fallback={<div className="max-w-xl mx-auto p-12 text-center text-slate-400">Loading waitlist form...</div>}>
          <WaitlistFormContent />
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
