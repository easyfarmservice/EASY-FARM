'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { LocationValidationResult } from '@/components/checkout/DeliveryMapPicker';
import { ArrowRight, MapPin } from 'lucide-react';

const DeliveryMapPicker = dynamic(
  () => import('@/components/checkout/DeliveryMapPicker').then((mod) => mod.DeliveryMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-[340px] sm:h-[400px] w-full rounded-3xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs font-medium gap-2 animate-pulse">
        <MapPin className="w-7 h-7 text-emerald-600 animate-bounce" />
        <span>Loading interactive delivery map...</span>
      </div>
    ),
  }
);

export function LocationPageMap() {
  const [selectedLocation, setSelectedLocation] = useState<LocationValidationResult | null>(null);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Live Delivery Coverage
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              Locate Your Society or Apartment
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
              Drag the map or search your building. Just like Zepto &amp; Swiggy, the pin targets your exact doorstep in <strong>Ghatkesar &amp; Pocharam</strong>.
            </p>
          </div>
        </div>

        {/* SWIGGY / ZEPTO STYLE MAP PICKER */}
        <DeliveryMapPicker
          initialLat={17.4475}
          initialLng={78.6534}
          onLocationChange={(res) => setSelectedLocation(res)}
        />

        {/* PRIMARY CTA WHEN SERVICEABLE */}
        {selectedLocation?.isServiceable && (
          <div className="pt-2 flex justify-end">
            <Link
              href="/baskets"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-[#123D2B] hover:bg-[#0B291D] text-white text-sm font-bold transition shadow-md hover:shadow-lg gap-2 cursor-pointer"
            >
              Order Weekly Basket for {selectedLocation.placeName || 'This Address'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
