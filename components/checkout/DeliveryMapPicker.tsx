'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation, AlertTriangle, CheckCircle2, Search, ArrowRight, Compass, RefreshCw, X, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { EasyFarmLoader } from '@/components/ui/EasyFarmLoader';

export interface LocationValidationResult {
  lat: number;
  lng: number;
  isServiceable: boolean;
  zoneName?: string;
  areaName?: string;
  deliveryDay?: string;
  deliveryPromise?: string;
  deliveryFee?: number;
  minimumOrder?: number;
  message?: string;
  addressLabel?: string;
  locality?: string;
  pincode?: string;
  communityName?: string;
  placeName?: string;
  formattedAddress?: string;
}

interface GeocodedAddressInfo {
  shortName: string;
  placeName: string;
  mandal: string;
  pincode: string;
  fullAddress: string;
}

interface DeliveryMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationChange?: (result: LocationValidationResult) => void;
}

interface SearchSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export function DeliveryMapPicker({
  initialLat = 17.4475,
  initialLng = 78.6534,
  onLocationChange,
}: DeliveryMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Pinned location & verification state
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });

  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  const [validation, setValidation] = useState<LocationValidationResult>({
    lat: initialLat,
    lng: initialLng,
    isServiceable: true,
    zoneName: 'Ghatkesar & Pocharam',
    areaName: 'Singapore Township & Pocharam Corridor',
    deliveryDay: 'Sunday',
    deliveryPromise: 'Sunday by 6 PM',
    deliveryFee: 0,
    minimumOrder: 250,
    placeName: 'Singapore Township',
    locality: 'Ghatkesar mandal',
    pincode: '500088',
  });

  // Loading & Error states
  const [checkingServiceability, setCheckingServiceability] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Address Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Reverse geocoded address label
  const [resolvedAddress, setResolvedAddress] = useState<string>('Singapore Township, Pocharam, Ghatkesar');
  const [detectedPlaceName, setDetectedPlaceName] = useState<string>('Singapore Township');
  const [detectedMandal, setDetectedMandal] = useState<string>('Ghatkesar mandal');
  const [detectedPincode, setDetectedPincode] = useState<string>('500088');

  // Highlighted delivery zone polygon refs & state
  const zoneLayersRef = useRef<any[]>([]);
  const zoneBoundsRef = useRef<any>(null);
  const [hasZoneBounds, setHasZoneBounds] = useState(false);

  const handleFitToZone = useCallback(() => {
    if (mapInstanceRef.current && zoneBoundsRef.current) {
      mapInstanceRef.current.fitBounds(zoneBoundsRef.current, { padding: [35, 35], maxZoom: 14 });
    }
  }, []);

  // Backend authoritative serviceability check
  const verifyServiceabilityBackend = useCallback(
    async (lat: number, lng: number, geoInfo?: GeocodedAddressInfo): Promise<LocationValidationResult> => {
      setCheckingServiceability(true);
      try {
        const res = await fetch('/api/delivery/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: lat, longitude: lng }),
        });

        const data = await res.json();

        const resolvedPin = geoInfo?.pincode || (lat < 17.435 || lat > 17.46 ? '501301' : '500088');
        const resolvedLocality = geoInfo?.mandal || data.area_name || 'Ghatkesar mandal';
        const resolvedPlace = geoInfo?.placeName || 'Ghatkesar';

        const result: LocationValidationResult = {
          lat,
          lng,
          isServiceable: Boolean(data.available),
          zoneName: data.zone_name,
          areaName: data.area_name,
          deliveryDay: data.delivery_day || 'Sunday',
          deliveryPromise: data.delivery_promise || 'Sunday by 6 PM',
          deliveryFee: data.delivery_fee ?? 0,
          minimumOrder: data.minimum_order ?? 250,
          message: data.message,
          addressLabel: geoInfo?.shortName,
          locality: resolvedLocality,
          pincode: resolvedPin,
          communityName: resolvedPlace,
          placeName: resolvedPlace,
          formattedAddress: geoInfo?.fullAddress || geoInfo?.shortName,
        };

        setValidation(result);
        onLocationChangeRef.current?.(result);
        return result;
      } catch (err: any) {
        console.error('Backend delivery check error:', err);
        const fallbackResult: LocationValidationResult = {
          lat,
          lng,
          isServiceable: false,
          message: 'Unable to verify delivery serviceability. Please check your internet connection.',
        };
        setValidation(fallbackResult);
        onLocationChangeRef.current?.(fallbackResult);
        return fallbackResult;
      } finally {
        setCheckingServiceability(false);
      }
    },
    []
  );

  // Reverse geocode to get a readable building/street label, place name, mandal, and pincode
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<GeocodedAddressInfo | undefined> => {
    try {
      const res = await fetch('/api/delivery/reverse-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      const data = await res.json();
      if (data && data.success) {
        const placeName = data.placeName || 'Ghatkesar';
        const mandal = data.mandal || data.locality || 'Ghatkesar mandal';
        const pincode = data.pincode || '501301';
        const shortName = data.shortName || `${placeName}, ${mandal}, ${pincode}`;
        const fullAddress = data.fullAddress || shortName;

        setResolvedAddress(shortName);
        setDetectedPlaceName(placeName);
        setDetectedMandal(mandal);
        setDetectedPincode(pincode);

        // Update popup on map marker
        if (markerRef.current) {
          try {
            markerRef.current
              .bindPopup(
                `<div style="font-family: inherit; font-size: 11px; padding: 2px 4px; line-height: 1.4;">
                  <strong style="color: #064e3b; font-size: 12px; display: block;">📍 ${placeName}</strong>
                  <span style="color: #475569; font-size: 11px;">${mandal} • PIN <strong>${pincode}</strong></span>
                </div>`,
                { closeButton: false, offset: [0, -32] }
              )
              .openPopup();
          } catch {}
        }

        return {
          shortName,
          placeName,
          mandal,
          pincode,
          fullAddress,
        };
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    }
    return undefined;
  }, []);

  // Update pin position and trigger authoritative check
  const updatePosition = useCallback(
    async (
      newLat: number,
      newLng: number,
      updateMapCenter = false,
      customInfo?: string | { placeName?: string; mandal?: string; pincode?: string; label?: string }
    ) => {
      setCoords({ lat: newLat, lng: newLng });
      setGpsError(null);

      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
      }
      if (updateMapCenter && mapInstanceRef.current) {
        mapInstanceRef.current.setView([newLat, newLng], 15, { animate: true });
      }

      let geoInfo: GeocodedAddressInfo | undefined;
      if (typeof customInfo === 'string') {
        const place = customInfo.split(',')[0].trim();
        const pinMatch = customInfo.match(/\b\d{6}\b/);
        const pin = pinMatch ? pinMatch[0] : (newLat < 17.435 || newLat > 17.46 ? '501301' : '500088');
        geoInfo = {
          shortName: customInfo,
          placeName: place,
          mandal: 'Ghatkesar mandal',
          pincode: pin,
          fullAddress: customInfo,
        };
        setResolvedAddress(customInfo);
        setDetectedPlaceName(place);
        setDetectedMandal('Ghatkesar mandal');
        setDetectedPincode(pin);
      } else if (customInfo && typeof customInfo === 'object') {
        const place = customInfo.placeName || 'Ghatkesar';
        const mandal = customInfo.mandal || 'Ghatkesar mandal';
        const pin = customInfo.pincode || '500088';
        const label = customInfo.label || `${place}, ${mandal}, ${pin}`;
        geoInfo = {
          shortName: label,
          placeName: place,
          mandal,
          pincode: pin,
          fullAddress: label,
        };
        setResolvedAddress(label);
        setDetectedPlaceName(place);
        setDetectedMandal(mandal);
        setDetectedPincode(pin);
      } else {
        geoInfo = await reverseGeocode(newLat, newLng);
      }

      await verifyServiceabilityBackend(newLat, newLng, geoInfo);
    },
    [reverseGeocode, verifyServiceabilityBackend]
  );

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      const L = (await import('leaflet')).default;

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      try {
        if ((mapContainerRef.current as any)._leaflet_id) {
          delete (mapContainerRef.current as any)._leaflet_id;
        }
      } catch {}

      let map: any;
      try {
        map = L.map(mapContainerRef.current, {
          center: [coords.lat, coords.lng],
          zoom: 14,
          zoomControl: true,
          attributionControl: false,
        });
      } catch (e) {
        console.warn('Map initialization duplicate caught:', e);
        return;
      }

      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom sleek Pin Marker
      const customIcon = L.divIcon({
        className: 'custom-delivery-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -100%);">
            <div style="width: 36px; height: 36px; background: #065f46; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.35); border: 2.5px solid white;">
              <div style="width: 12px; height: 12px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
            </div>
            <div style="position: absolute; bottom: -8px; width: 14px; height: 6px; background: rgba(0,0,0,0.25); border-radius: 50%; filter: blur(1px);"></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([coords.lat, coords.lng], {
        draggable: true,
        icon: customIcon,
      }).addTo(map);

      markerRef.current = marker;

      marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        updatePosition(pos.lat, pos.lng, false);
      });

      map.on('click', (e: any) => {
        updatePosition(e.latlng.lat, e.latlng.lng, false);
      });

      // Fetch active delivery zones and visually highlight serviceable regions
      try {
        const zonesRes = await fetch('/api/delivery/zones');
        const zonesData = await zonesRes.json();
        if (zonesData.success && Array.isArray(zonesData.zones) && isMounted) {
          const allLatLngs: [number, number][] = [];

          zonesData.zones.forEach((zone: any) => {
            if (zone.polygon?.coordinates?.[0]) {
              const latLngs: [number, number][] = zone.polygon.coordinates[0].map(
                ([lng, lat]: [number, number]) => [lat, lng]
              );
              allLatLngs.push(...latLngs);

              const poly = L.polygon(latLngs, {
                color: '#059669', // Emerald 600 border
                fillColor: '#10b981', // Emerald 500 fill
                fillOpacity: 0.18,
                weight: 2.5,
                dashArray: '6, 6',
              }).addTo(map);

              poly.bindTooltip(
                `<div style="font-family: inherit; font-size: 11px; font-weight: 700; color: #064e3b; padding: 2px 4px;">
                  <div>🟢 ${zone.name}</div>
                  <div style="font-weight: 500; font-size: 10px; color: #047857;">${zone.delivery_promise || 'Weekly Sunday Delivery Area'}</div>
                </div>`,
                { permanent: false, direction: 'top', sticky: true }
              );

              zoneLayersRef.current.push(poly);
            }
          });

          if (allLatLngs.length > 0) {
            const bounds = L.latLngBounds(allLatLngs as any);
            zoneBoundsRef.current = bounds;
            setHasZoneBounds(true);
          }
        }
      } catch (err) {
        console.warn('Failed to load active delivery zones on map:', err);
      }

      // Run initial authoritative verification
      verifyServiceabilityBackend(coords.lat, coords.lng, {
        shortName: resolvedAddress,
        placeName: detectedPlaceName,
        mandal: detectedMandal,
        pincode: detectedPincode,
        fullAddress: resolvedAddress,
      });

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 600);
    }

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    init();

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      zoneLayersRef.current.forEach((layer) => {
        try {
          layer.remove();
        } catch {}
      });
      zoneLayersRef.current = [];
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current) {
        try {
          delete (mapContainerRef.current as any)._leaflet_id;
        } catch {}
      }
    };
  }, []);

  // Address search with autocomplete
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchTimeoutRef.current);

    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const queryWithContext = val.toLowerCase().includes('hyderabad') || val.toLowerCase().includes('ghatkesar')
          ? val
          : `${val}, Ghatkesar, Hyderabad`;

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            queryWithContext
          )}&limit=5&countrycodes=in`
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.warn('Location search error:', err);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleSelectSuggestion = (s: SearchSuggestion) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setSearchQuery(s.display_name.split(',')[0]);
    setShowSuggestions(false);
    updatePosition(lat, lng, true, s.display_name);
  };

  // GPS "Use Current Location" with graceful error handling
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDetectingGps(false);
        const { latitude, longitude } = position.coords;
        updatePosition(latitude, longitude, true);
      },
      (error) => {
        setDetectingGps(false);
        let msg = 'Unable to determine your GPS location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. You can search your address or move the pin manually on the map.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please drag the pin on the map to set your address.';
        }
        setGpsError(msg);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-3">
      {/* SEARCH BAR & GPS BUTTON */}
      <div className="space-y-2">
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search apartment, society, or area (e.g. Singapore Township, Ghatkesar)..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[42px]"
            />
            {searching && (
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin absolute right-3" />
            )}
            {!searching && searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 absolute right-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* AUTOCOMPLETE SUGGESTIONS DROPDOWN */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.place_id}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/60 transition flex items-start gap-2.5 text-xs"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <span className="text-slate-800 font-medium line-clamp-2 leading-relaxed">
                    {s.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={detectingGps}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition shadow-xs disabled:opacity-50 min-h-[38px]"
          >
            <Navigation className={`w-3.5 h-3.5 text-emerald-700 ${detectingGps ? 'animate-spin' : ''}`} />
            {detectingGps ? 'Detecting your location...' : 'Use My Current Location'}
          </button>

          <span className="text-[11px] text-slate-400">
            📍 Drag the pin to place it on your exact tower/door
          </span>
        </div>

        {/* QUICK SELECT POPULAR COMMUNITIES & LOCALITIES */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
          <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap shrink-0">📍 Quick Pick:</span>
          {[
            { name: 'Rajeev Gruha Kalpa', pincode: '501301', mandal: 'Ghatkesar mandal', lat: 17.4296638, lng: 78.6696088 },
            { name: 'Singapore Township', pincode: '500088', mandal: 'Ghatkesar mandal', lat: 17.4475, lng: 78.6534 },
            { name: 'Emerald Heights', pincode: '500088', mandal: 'Ghatkesar mandal', lat: 17.4520, lng: 78.6650 },
            { name: 'Modi Emerald Park', pincode: '501301', mandal: 'Ghatkesar mandal', lat: 17.4410, lng: 78.6750 },
            { name: 'Sanskruti Township', pincode: '500088', mandal: 'Ghatkesar mandal', lat: 17.4468, lng: 78.6540 },
          ].map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() =>
                updatePosition(c.lat, c.lng, true, {
                  placeName: c.name,
                  mandal: c.mandal,
                  pincode: c.pincode,
                  label: `${c.name}, ${c.mandal}, ${c.pincode}`,
                })
              }
              className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
            >
              <span>{c.name}</span>
              <span className="text-[10px] text-emerald-700 font-semibold">({c.pincode})</span>
            </button>
          ))}
        </div>
      </div>

      {gpsError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium flex items-center justify-between">
          <span>{gpsError}</span>
          <button
            type="button"
            onClick={() => setGpsError(null)}
            className="text-amber-900 font-bold ml-2 underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* MAP VIEW CONTAINER */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 h-[280px] sm:h-[320px] w-full">
        <div ref={mapContainerRef} className="h-full w-full z-0" />

        {/* Service Zone Highlight Control Overlay */}
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5 items-end pointer-events-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/85 backdrop-blur-md border border-emerald-500/50 shadow-md text-[11px] font-bold text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>Serviceable Area (Green)</span>
          </div>
          {hasZoneBounds && (
            <button
              type="button"
              onClick={handleFitToZone}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/95 hover:bg-white text-emerald-900 text-[11px] font-bold shadow-md transition border border-emerald-200 hover:border-emerald-300"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-700" />
              <span>Fit Delivery Zone</span>
            </button>
          )}
        </div>

        {/* Loading overlay while checking serviceability */}
        {checkingServiceability && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex items-center justify-center z-[400]">
            <EasyFarmLoader size="sm" text="Verifying delivery zone..." center={false} />
          </div>
        )}
      </div>

      {/* DETECTED ADDRESS & SERVICEABILITY FEEDBACK BANNER */}
      {validation.isServiceable ? (
        <div className="p-4 rounded-2xl bg-emerald-50/90 border-2 border-emerald-300 flex items-start gap-3 transition shadow-xs">
          <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-emerald-950 tracking-wider">
                  Serviceable Delivery Location
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-950 font-bold px-2 py-0.5 rounded">
                  {validation.deliveryDay || 'Sunday'} Delivery
                </span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800 text-white text-xs font-black shadow-xs">
                <span className="text-emerald-300 font-medium">PIN</span>
                <span>{validation.pincode || detectedPincode || '501301'}</span>
              </div>
            </div>

            {/* Prominent Place Name and Mandal Area Card */}
            <div className="bg-white/95 rounded-xl border border-emerald-200 p-2.5 space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-sm font-black text-slate-900 truncate">
                  {validation.placeName || detectedPlaceName || 'Rajeev Gruha Kalpa'}
                </span>
                <span className="text-xs font-semibold text-emerald-800 truncate">
                  • {validation.locality || detectedMandal || 'Ghatkesar mandal'}
                </span>
              </div>
              <p className="text-xs text-slate-600 pl-6 leading-relaxed">
                {resolvedAddress}
              </p>
            </div>

            <p className="text-[11px] text-emerald-800 font-medium">
              Delivery Zone: <strong>{validation.zoneName || 'Ghatkesar & Pocharam'}</strong> • {validation.deliveryPromise || 'Delivered by 6 PM Sunday'}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-amber-950 tracking-wider">
                  Outside Sunday Delivery Zone
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-200 text-amber-950 text-xs font-black">
                  PIN {validation.pincode || detectedPincode || '500088'}
                </span>
              </div>

              {/* Detected Place Details */}
              <div className="bg-white/90 rounded-xl border border-amber-200 p-2.5 space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="text-sm font-black text-slate-900 truncate">
                    {validation.placeName || detectedPlaceName || 'Pinned Location'}
                  </span>
                  <span className="text-xs font-semibold text-amber-800 truncate">
                    • {validation.locality || detectedMandal || 'Outside Zone'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 pl-6 leading-relaxed">
                  {resolvedAddress}
                </p>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                Easy Farm currently delivers exclusively to active launch zones in <strong>Ghatkesar &amp; Pocharam</strong> (Rajeev Gruha Kalpa, Singapore Township, Emerald Heights, etc.).
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
            <Link
              href={`/waitlist?lat=${coords.lat}&lng=${coords.lng}&locality=${encodeURIComponent(
                resolvedAddress.split(',')[0]
              )}`}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Join Waitlist for My Area
            </Link>
            <button
              type="button"
              onClick={() => updatePosition(17.4475, 78.6534, true, 'Singapore Township, Pocharam, Ghatkesar')}
              className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1"
            >
              <Compass className="w-3.5 h-3.5" />
              Singapore Township
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
