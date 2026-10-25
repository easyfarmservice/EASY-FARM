'use client';

import React, { useState } from 'react';
import { Search, Navigation, CheckCircle, AlertCircle, ArrowRight, Send, CheckCircle2, MapPin } from 'lucide-react';
import Link from 'next/link';
import { DeliveryCheckResult } from '@/types/database';

export function ServiceabilityCheck() {
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeliveryCheckResult | null>(null);

  // Waitlist state
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  const handleCheckPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode || pincode.length < 6) return;

    setLoading(true);
    setResult(null);
    setShowWaitlistForm(false);
    setWaitlistSubmitted(false);

    try {
      const res = await fetch('/api/delivery/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode: pincode.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        available: false,
        delivery_fee: 0,
        minimum_order: 0,
        message: 'Unable to check PIN code availability. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setResult(null);
    setShowWaitlistForm(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch('/api/delivery/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          const data = await res.json();
          setResult(data);
        } catch {
          setResult({
            available: false,
            delivery_fee: 0,
            minimum_order: 0,
            message: 'Network error checking your location. Please try again.',
          });
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        alert('Unable to retrieve GPS location. Please enter your PIN code manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistPhone) return;

    setWaitlistSubmitting(true);
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: waitlistName || 'Valued Customer',
          phone: waitlistPhone,
          email: `${waitlistPhone}@waitlist.easyfarm.in`,
          pincode: pincode || '500000',
          locality: 'Hyderabad',
        }),
      });
      setWaitlistSubmitted(true);
    } catch (err) {
      console.error('Failed to submit waitlist:', err);
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  return (
    <section className="py-14 sm:py-20 bg-white border-y border-slate-100" id="delivery-check">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-emerald-950 text-white rounded-3xl p-7 sm:p-11 shadow-2xl relative overflow-hidden border border-emerald-900">
          {/* BACKGROUND DECORATION */}
          <div className="absolute -right-16 -bottom-16 w-72 h-72 bg-emerald-800/30 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-900/80 px-3.5 py-1 rounded-full border border-emerald-700/80 inline-flex items-center gap-1.5 shadow-xs">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Delivery Coverage
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Where should we deliver?
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed max-w-md mx-auto">
                Enter your 6-digit PIN code or check your location to confirm Sunday doorstep delivery to your home or gated community.
              </p>
            </div>

            {/* INPUT FORM */}
            <form onSubmit={handleCheckPincode} className="max-w-md mx-auto space-y-3">
              <div className="relative flex items-center shadow-lg rounded-2xl overflow-hidden">
                <Search className="w-5 h-5 absolute left-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter PIN code (e.g. 500088)"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-12 pr-28 py-3.5 bg-white text-slate-900 placeholder:text-slate-400 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[50px]"
                />
                <button
                  type="submit"
                  disabled={loading || pincode.length < 6}
                  className="absolute right-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition min-h-[40px] shadow"
                >
                  {loading ? 'Checking...' : 'Check'}
                </button>
              </div>

              <div className="text-center flex items-center justify-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white font-semibold transition py-1 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  Use my GPS location
                </button>
                <span className="text-emerald-700">•</span>
                <Link
                  href="/location"
                  className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-white font-semibold transition py-1"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#6FE343]" />
                  Open Live Map Pin →
                </Link>
              </div>
            </form>

            {/* RESULTS UI */}
            {result && (
              <div className="max-w-md mx-auto pt-2">
                {result.available ? (
                  <div className="bg-emerald-900/90 border border-emerald-400/50 rounded-2xl p-5 text-center space-y-3 animate-in fade-in shadow-lg">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-300">
                      <CheckCircle className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">✓ Easy Farm delivers to your location!</h3>
                      <p className="text-xs text-emerald-200 mt-1">
                        Active Zone: <strong>{result.zone_name}</strong> • Delivery: <strong>{result.delivery_promise}</strong>
                      </p>
                    </div>
                    <Link
                      href="#boxes"
                      className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm transition shadow-md min-h-[44px]"
                    >
                      Start Shopping
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="bg-amber-950/80 border border-amber-600/40 rounded-2xl p-5 text-center space-y-3 animate-in fade-in shadow-lg">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 text-amber-300">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-amber-200">We're not delivering here yet.</h3>
                      <p className="text-xs text-amber-100/70 mt-1 leading-relaxed">
                        Easy Farm currently serves gated communities and homes in <strong>Ghatkesar &amp; Pocharam</strong> (Singapore Township, Sanskruti, Modi Emerald Heights &amp; surrounding areas).
                      </p>
                    </div>

                    {!showWaitlistForm && !waitlistSubmitted ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowWaitlistForm(true)}
                          className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition shadow-md min-h-[44px]"
                        >
                          Join Waitlist for PIN {pincode}
                        </button>
                      </div>
                    ) : waitlistSubmitted ? (
                      <div className="p-3 bg-amber-900/60 rounded-xl border border-amber-500/40 text-amber-100 text-xs flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                        <span>You're on the waitlist! We'll notify you as soon as we expand to {pincode}.</span>
                      </div>
                    ) : (
                      <form onSubmit={handleWaitlistSubmit} className="space-y-2 pt-2 text-left">
                        <input
                          type="text"
                          placeholder="Your Name (Optional)"
                          value={waitlistName}
                          onChange={(e) => setWaitlistName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-600/40 text-white placeholder:text-slate-400 text-xs focus:outline-none focus:border-amber-400"
                        />
                        <input
                          type="tel"
                          required
                          placeholder="Phone Number *"
                          value={waitlistPhone}
                          onChange={(e) => setWaitlistPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-600/40 text-white placeholder:text-slate-400 text-xs focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="submit"
                          disabled={waitlistSubmitting}
                          className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {waitlistSubmitting ? 'Submitting...' : 'Submit Priority Waitlist'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
