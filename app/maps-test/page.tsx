'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Compass,
  ArrowRight,
  ShieldCheck,
  Search,
  ExternalLink,
  Info,
} from 'lucide-react';
import { DeliveryMapPicker, LocationValidationResult } from '@/components/checkout/DeliveryMapPicker';

export default function MapsTestPage() {
  const [apiKey, setApiKey] = useState<string>('');
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [googleVersion, setGoogleVersion] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Individual Google API Service statuses
  const [mapsJsStatus, setMapsJsStatus] = useState<'testing' | 'active' | 'error'>('testing');
  const [geocodingStatus, setGeocodingStatus] = useState<'testing' | 'active' | 'denied'>('testing');
  const [geocodingMsg, setGeocodingMsg] = useState<string>('');
  const [placesStatus, setPlacesStatus] = useState<'testing' | 'active' | 'denied'>('testing');
  const [placesMsg, setPlacesMsg] = useState<string>('');

  const [testLocation, setTestLocation] = useState<LocationValidationResult | null>(null);

  // Places Autocomplete test
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlace, setSelectedPlace] = useState<string>('');

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    setApiKey(key);

    if (!key) {
      setLoadError('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not defined in .env.local');
      setMapsJsStatus('error');
      setGeocodingStatus('denied');
      setPlacesStatus('denied');
      return;
    }

    const testGoogleServices = () => {
      const g = (window as any).google;
      if (!g?.maps) return;

      setScriptLoaded(true);
      setGoogleVersion(g.maps.version || 'Loaded');
      setMapsJsStatus('active');

      // Test 1: Geocoder API
      try {
        const geocoder = new g.maps.Geocoder();
        geocoder.geocode({ location: { lat: 17.4475, lng: 78.6534 } }, (results: any, status: any) => {
          if (status === 'OK' && results && results.length > 0) {
            setGeocodingStatus('active');
            setGeocodingMsg(`Working: Resolved "${results[0].formatted_address?.slice(0, 40)}..."`);
          } else {
            setGeocodingStatus('denied');
            setGeocodingMsg(status === 'REQUEST_DENIED' ? 'REQUEST_DENIED (API not enabled in Cloud Console)' : status);
          }
        });
      } catch (err: any) {
        setGeocodingStatus('denied');
        setGeocodingMsg(err?.message || 'Geocoder error');
      }

      // Test 2: Places API
      try {
        if (g.maps.places?.AutocompleteService) {
          const placesService = new g.maps.places.AutocompleteService();
          placesService.getPlacePredictions(
            { input: 'Singapore Township', componentRestrictions: { country: 'in' } },
            (predictions: any, status: any) => {
              if (status === 'OK' && predictions && predictions.length > 0) {
                setPlacesStatus('active');
                setPlacesMsg(`Working: Found ${predictions.length} local places`);
              } else {
                setPlacesStatus('denied');
                setPlacesMsg(status === 'REQUEST_DENIED' ? 'REQUEST_DENIED (API not enabled in Cloud Console)' : status);
              }
            }
          );
        } else {
          setPlacesStatus('denied');
          setPlacesMsg('Places library not loaded');
        }
      } catch (err: any) {
        setPlacesStatus('denied');
        setPlacesMsg(err?.message || 'Places error');
      }

      initAutocomplete();
    };

    if ((window as any).google?.maps) {
      testGoogleServices();
    } else {
      const scriptId = 'google-maps-test-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          testGoogleServices();
        };
        script.onerror = () => {
          setLoadError('Failed to load Google Maps JavaScript API script.');
          setMapsJsStatus('error');
        };
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', testGoogleServices);
      }
    }
  }, []);

  const initAutocomplete = () => {
    if ((window as any).google?.maps?.places && searchInputRef.current) {
      try {
        const autocomplete = new (window as any).google.maps.places.Autocomplete(searchInputRef.current, {
          componentRestrictions: { country: 'in' },
          fields: ['formatted_address', 'geometry', 'name'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            setSelectedPlace(
              `${place.name || ''} - ${place.formatted_address || ''} (${lat.toFixed(4)}, ${lng.toFixed(4)})`
            );
          }
        });
      } catch (e: any) {
        console.warn('Autocomplete init error:', e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                API Diagnostics
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Google Maps JavaScript API Verification
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Diagnostic status for Maps JavaScript API, Geocoding API, and Places API with your key.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/location"
                className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
              >
                /location Page ➔
              </Link>
              <Link
                href="/checkout"
                className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition-all"
              >
                /checkout Page ➔
              </Link>
            </div>
          </div>

          {/* 3-Part API Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
            {/* 1. Maps JavaScript API */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">1. Maps JavaScript API</span>
              <p className="text-xs font-bold text-slate-900">
                {mapsJsStatus === 'active' ? `Active (v${googleVersion})` : mapsJsStatus === 'error' ? 'Load Error' : 'Connecting...'}
              </p>
              {mapsJsStatus === 'active' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" /> Map Tiles & Canvas Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                  <AlertCircle className="w-3 h-3" /> Inactive
                </span>
              )}
            </div>

            {/* 2. Geocoding API */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">2. Geocoding API</span>
              <p className="text-xs font-bold text-slate-900">
                {geocodingStatus === 'active' ? 'Active' : geocodingStatus === 'denied' ? 'Needs Activation' : 'Testing...'}
              </p>
              {geocodingStatus === 'active' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" /> Doorstep Lookup Working
                </span>
              ) : geocodingStatus === 'denied' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                  <AlertCircle className="w-3 h-3" /> Enable in Cloud Console
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Testing...
                </span>
              )}
            </div>

            {/* 3. Places API */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-xs font-semibold text-slate-500">3. Places API</span>
              <p className="text-xs font-bold text-slate-900">
                {placesStatus === 'active' ? 'Active' : placesStatus === 'denied' ? 'Needs Activation' : 'Testing...'}
              </p>
              {placesStatus === 'active' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" /> Places Autocomplete Working
                </span>
              ) : placesStatus === 'denied' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                  <AlertCircle className="w-3 h-3" /> Enable in Cloud Console
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Testing...
                </span>
              )}
            </div>
          </div>

          {/* Actionable Notice for Geocoding / Places */}
          {(geocodingStatus === 'denied' || placesStatus === 'denied') && (
            <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Why it's fetching only main places right now:</span>
              </div>
              <p className="leading-relaxed">
                Your API key has <strong>Maps JavaScript API</strong> enabled (so the map canvas displays perfectly),
                but <strong>Geocoding API</strong> and <strong>Places API</strong> are not turned on yet in your Google Cloud Console.
                Because Google denies reverse-geocoding requests (<code>REQUEST_DENIED</code>), the app falls back to our local list of primary communities.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <a
                  href="https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-[11px] transition-colors"
                >
                  Enable Geocoding API <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-[11px] transition-colors"
                >
                  Enable Places API (New) <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Places Autocomplete Test */}
          {scriptLoaded && (
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-600" />
                Direct Google Places Autocomplete Test
              </label>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="e.g. Singapore Township, Pocharam, Modi Emerald Park..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
              />
              {selectedPlace && (
                <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  Selected Place: {selectedPlace}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Live DeliveryMapPicker Component */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Interactive Map Canvas (Drag Pin or Click to Target Doorstep)
            </h2>
            {testLocation && (
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  testLocation.isServiceable
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {testLocation.isServiceable ? '🟢 Serviceable' : '🔴 Outside Zone'}
              </span>
            )}
          </div>

          <DeliveryMapPicker
            initialLat={17.4475}
            initialLng={78.6534}
            onLocationChange={(res) => setTestLocation(res)}
          />

          {testLocation && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p>
                <strong>Resolved Address:</strong> {testLocation.formattedAddress || testLocation.addressLabel}
              </p>
              <p>
                <strong>Coordinates:</strong> {testLocation.lat.toFixed(5)}° N, {testLocation.lng.toFixed(5)}° E
              </p>
              <p>
                <strong>Area / Mandal:</strong> {testLocation.locality} (PIN: {testLocation.pincode})
              </p>
              <p>
                <strong>Delivery Promise:</strong> {testLocation.deliveryPromise} • Fee: ₹{testLocation.deliveryFee}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
