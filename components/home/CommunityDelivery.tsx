'use client';

import React, { useState } from 'react';
import { Building2, Send, CheckCircle2, X } from 'lucide-react';

export function CommunityDelivery({
  tagline,
  title,
  subtitle,
  buttonText,
}: {
  tagline?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
} = {}) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [flatCount, setFlatCount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const displayTagline = tagline || 'Gated Communities & Apartments';
  const displayTitle = title || 'Bring Easy Farm to Your Community';
  const displaySubtitle =
    subtitle ||
    'If your gated community or apartment has multiple families interested in fresh Telangana farm produce, we can coordinate weekly Sunday deliveries together.';
  const displayButtonText = buttonText || 'Request Community Delivery →';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Save to waitlist / community requests endpoint
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email: `${phone}@community.easyfarm.in`,
          pincode: '500088',
          locality: 'Ghatkesar',
          apartment: `${communityName} (${flatCount} flats)`,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit community request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-16 md:py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 border border-emerald-800">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-900 text-emerald-300 font-bold text-xs border border-emerald-700">
              <Building2 className="w-4 h-4 text-amber-300" />
              {displayTagline}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {displayTitle}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed">
              {displaySubtitle}
            </p>
          </div>

          <button
            onClick={() => {
              setSubmitted(false);
              setShowModal(true);
            }}
            className="px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm rounded-2xl transition shadow-xl shrink-0 min-h-[48px]"
          >
            {displayButtonText}
          </button>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
                <h3 className="text-xl font-bold text-slate-900">Request Received!</h3>
                <p className="text-xs text-slate-600">
                  Thank you! Our operations team will contact you to set up coordinated Sunday drops for <strong>{communityName}</strong>.
                </p>
                <button
                  onClick={() => setShowModal(false)}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900">Request Community Setup</h3>
                  <p className="text-xs text-slate-500">Coordinated deliveries for Ghatkesar gated communities.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9849012345"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Building / Gated Community Name *</label>
                  <input
                    type="text"
                    required
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    placeholder="e.g. Singapore Township / Emerald Heights"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Approximate Number of Flats</label>
                  <input
                    type="text"
                    value={flatCount}
                    onChange={(e) => setFlatCount(e.target.value)}
                    placeholder="e.g. 200 flats"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm transition shadow-md flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting Request...' : 'Submit Community Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
