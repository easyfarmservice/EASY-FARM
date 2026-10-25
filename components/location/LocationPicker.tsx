'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, ChevronRight, X, Search, CheckCircle2, Map } from 'lucide-react';
import { SERVICEABLE_COMMUNITIES } from '@/lib/constants';
import dynamic from 'next/dynamic';
import type { LocationValidationResult } from '@/components/checkout/DeliveryMapPicker';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

const DeliveryMapPicker = dynamic(
  () => import('@/components/checkout/DeliveryMapPicker').then((mod) => mod.DeliveryMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] sm:h-[320px] w-full rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
        <EasyFarmLoader size="sm" text="Loading delivery map..." />
      </div>
    ),
  }
);

const STORAGE_KEY = 'easyfarm_selected_location';

export interface SelectedLocation {
  community: string;
  area: string;
  pincode: string;
  setAt: number;
}

// ── Hook — use anywhere to read selected location ────────────────────────────
export function useSelectedLocation() {
  const [location, setLocation] = useState<SelectedLocation | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setLocation(JSON.parse(stored));
    } catch {}
  }, []);

  return location;
}

// ── Save helper ───────────────────────────────────────────────────────────────
function saveLocation(loc: SelectedLocation) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
}

// ── Main Modal Component ──────────────────────────────────────────────────────
export function LocationPickerModal({ onClose, onSelect }: {
  onClose?: () => void;
  onSelect?: (loc: SelectedLocation) => void;
}) {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [step, setStep] = useState<'choose' | 'detect' | 'manual' | 'notfound'>('choose');
  const [detecting, setDetecting] = useState(false);
  const [search, setSearch] = useState('');
  const [detected, setDetected] = useState<SelectedLocation | null>(null);
  const [selectedMapLoc, setSelectedMapLoc] = useState<LocationValidationResult | null>(null);

  const filtered = SERVICEABLE_COMMUNITIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.pincode.includes(search)
  );

  const handleSelect = (community: typeof SERVICEABLE_COMMUNITIES[0]) => {
    const loc: SelectedLocation = {
      community: community.name,
      area: community.area,
      pincode: community.pincode,
      setAt: Date.now(),
    };
    saveLocation(loc);
    onSelect?.(loc);
    onClose?.();
  };

  const handleConfirmMapLocation = () => {
    if (!selectedMapLoc) return;
    const loc: SelectedLocation = {
      community: selectedMapLoc.placeName || selectedMapLoc.communityName || selectedMapLoc.areaName || 'Rajeev Gruha Kalpa',
      area: selectedMapLoc.locality || selectedMapLoc.zoneName || 'Ghatkesar mandal',
      pincode: selectedMapLoc.pincode || '501301',
      setAt: Date.now(),
    };
    saveLocation(loc);
    onSelect?.(loc);
    onClose?.();
  };

  const handleDetect = () => {
    if (!navigator.geolocation) {
      setStep('manual');
      return;
    }
    setDetecting(true);
    setStep('detect');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch('/api/delivery/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          const data = await res.json();

          if (data.available) {
            const loc: SelectedLocation = {
              community: data.area_name || 'My Location (Ghatkesar)',
              area: data.zone_name || 'Ghatkesar',
              pincode: '500088',
              setAt: Date.now(),
            };
            setDetected(loc);
            setDetecting(false);
          } else {
            setDetecting(false);
            setStep('notfound');
          }
        } catch {
          setDetecting(false);
          setStep('manual');
        }
      },
      () => {
        setDetecting(false);
        setStep('manual');
      },
      { timeout: 8000 }
    );
  };

  const confirmDetected = () => {
    if (detected) {
      saveLocation(detected);
      onSelect?.(detected);
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl md:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:fade-in duration-200 flex flex-col max-h-[92vh] sm:max-h-[88vh]">

        {/* HEADER */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Choose delivery location</h2>
              <p className="text-[11px] text-slate-400">Ghatkesar &amp; Pocharam Sunday Delivery</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* MODE TABS (Interactive Map vs Quick List) */}
        <div className="px-5 pt-3 pb-2 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                viewMode === 'map' ? 'bg-white text-emerald-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Map className="w-3.5 h-3.5 text-emerald-700" />
              <span>Interactive Map</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                viewMode === 'list' ? 'bg-white text-emerald-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <span>📋 Community List</span>
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="px-5 py-2 space-y-4 overflow-y-auto flex-1">
          {viewMode === 'map' ? (
            <div className="space-y-3 pb-2">
              <DeliveryMapPicker
                initialLat={17.4475}
                initialLng={78.6534}
                onLocationChange={(res) => setSelectedMapLoc(res)}
              />

              {/* CONFIRM BUTTON */}
              {selectedMapLoc && (
                <div className="pt-1">
                  {selectedMapLoc.isServiceable ? (
                    <button
                      type="button"
                      onClick={handleConfirmMapLocation}
                      className="w-full py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 min-h-[46px]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Deliver to {selectedMapLoc.communityName || 'Selected Location'}</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-1">
                      <p className="text-xs font-bold text-amber-900">
                        Outside Current Launch Corridor
                      </p>
                      <p className="text-[11px] text-amber-700">
                        Move the pin inside the green highlighted area (Ghatkesar &amp; Pocharam) or join the waitlist.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {/* STEP: CHOOSE */}
              {step === 'choose' && (
                <>
                  {/* GPS button */}
                  <button
                    onClick={handleDetect}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition group"
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-200 flex items-center justify-center shrink-0 group-hover:bg-emerald-300 transition">
                      <Navigation className="w-4 h-4 text-emerald-800" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs sm:text-sm font-bold text-emerald-900">Use my current GPS location</p>
                      <p className="text-[11px] text-emerald-600">PostGIS verification</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-500 ml-auto" />
                  </button>

                  {/* Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search community or PIN code..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>

                  {/* Community list */}
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {filtered.length > 0 ? filtered.map(c => (
                      <button
                        key={c.name}
                        onClick={() => handleSelect(c)}
                        className="w-full flex items-center gap-2.5 p-3 rounded-xl hover:bg-emerald-50/60 border border-slate-100 hover:border-emerald-200 transition text-left group"
                      >
                        <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400">{c.area} • PIN {c.pincode}</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                          Active
                        </span>
                      </button>
                    )) : (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No communities matched. Use the map view to pinpoint your exact address.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* STEP: DETECTING */}
              {step === 'detect' && (
                <div className="py-4">
                  <EasyFarmLoader size="sm" text="Checking location serviceability..." />
                </div>
              )}

              {/* STEP: CONFIRM DETECTED */}
              {step === 'choose' && detected && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900">Serviceable Location Detected</span>
                  </div>
                  <p className="text-xs text-slate-700">{detected.community}</p>
                  <button
                    onClick={confirmDetected}
                    className="w-full py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs"
                  >
                    Confirm Delivery Here
                  </button>
                </div>
              )}

              {/* STEP: NOT FOUND */}
              {step === 'notfound' && (
                <div className="space-y-3 py-2 text-center">
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    Your detected location is outside our Ghatkesar launch zone.
                  </p>
                  <button
                    onClick={() => setStep('choose')}
                    className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    ← Choose from Active Communities
                  </button>
                </div>
              )}

              {/* STEP: MANUAL */}
              {step === 'manual' && (
                <div className="space-y-3 py-2">
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    Could not detect GPS location. Please select your community manually below.
                  </p>
                  <button
                    onClick={() => setStep('choose')}
                    className="w-full py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs transition"
                  >
                    Select Community Manually
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Location Picker Trigger (shown in Header) ─────────────────────────────────
export function LocationPickerTrigger() {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState<SelectedLocation | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setLocation(JSON.parse(stored));
    } catch {}
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/80 text-left transition shrink-0 group max-w-[130px] sm:max-w-[170px] lg:max-w-[200px]"
        aria-label="Change delivery location"
      >
        <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
          <MapPin className="w-3 h-3 text-white" />
        </div>
        <div className="flex flex-col min-w-0 pr-0.5">
          <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider leading-none">Deliver to</span>
          <span className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-900 leading-tight mt-0.5">
            {location ? location.community : 'Singapore Township'}
          </span>
        </div>
        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0 hidden sm:block" />
      </button>

      {open && (
        <LocationPickerModal
          onClose={() => setOpen(false)}
          onSelect={(loc) => { setLocation(loc); setOpen(false); }}
        />
      )}
    </>
  );
}
