'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Layers, Plus, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';

export interface ZoneItem {
  id?: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  active: boolean;
  delivery_day: string;
  order_cutoff_day: string;
  order_cutoff_time: string;
  delivery_promise: string;
  delivery_fee: number;
  minimum_order: number;
  polygon: {
    type: 'Polygon';
    coordinates: number[][][]; // [ [ [lng, lat], ... ] ]
  };
}

interface ZoneMapEditorProps {
  zones: ZoneItem[];
  selectedZoneId?: string | null;
  onSelectZone?: (zone: ZoneItem) => void;
  isDrawingMode?: boolean;
  drawnPoints?: [number, number][]; // [lat, lng]
  onDrawnPointsChange?: (points: [number, number][]) => void;
}

export function ZoneMapEditor({
  zones,
  selectedZoneId,
  onSelectZone,
  isDrawingMode = false,
  drawnPoints = [],
  onDrawnPointsChange,
}: ZoneMapEditorProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polygonLayersRef = useRef<any[]>([]);
  const draftLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const LRef = useRef<any>(null);
  const isGoogleMapsRef = useRef<boolean>(false);

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      let gMaps: any = null;

      if (googleApiKey) {
        try {
          if ((window as any).google?.maps) {
            gMaps = (window as any).google;
          } else {
            await new Promise<void>((resolve, reject) => {
              if (document.getElementById('google-maps-js-sdk')) {
                const interval = setInterval(() => {
                  if ((window as any).google?.maps) {
                    clearInterval(interval);
                    resolve();
                  }
                }, 100);
                setTimeout(() => {
                  clearInterval(interval);
                  resolve();
                }, 5000);
                return;
              }
              const script = document.createElement('script');
              script.id = 'google-maps-js-sdk';
              script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places,geometry`;
              script.async = true;
              script.onload = () => resolve();
              script.onerror = (e) => reject(e);
              document.head.appendChild(script);
            });
            if ((window as any).google?.maps) {
              gMaps = (window as any).google;
            }
          }
        } catch (err) {
          console.warn('Google Maps script load caught for admin editor:', err);
        }
      }

      // PRIMARY: Google Maps API
      if (gMaps?.maps) {
        isGoogleMapsRef.current = true;
        const map = new gMaps.maps.Map(mapContainerRef.current, {
          center: { lat: 17.4475, lng: 78.6590 },
          zoom: 12,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: gMaps.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: gMaps.maps.ControlPosition.TOP_LEFT,
          },
          fullscreenControl: true,
          streetViewControl: false,
          zoomControl: true,
        });

        mapInstanceRef.current = map;

        map.addListener('click', (e: any) => {
          if (!mapInstanceRef.current?._isDrawingModeRef || !e.latLng) return;
          const newPt: [number, number] = [e.latLng.lat(), e.latLng.lng()];
          mapInstanceRef.current._addPointCallback?.(newPt);
        });

        return;
      }

      // SECONDARY: Leaflet Fallback
      isGoogleMapsRef.current = false;
      const L = (await import('leaflet')).default;
      LRef.current = L;

      // Add Leaflet CSS if missing
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!isMounted || !mapContainerRef.current) return;

      // Center around Hyderabad / Ghatkesar
      const map = L.map(mapContainerRef.current, {
        center: [17.4475, 78.6590],
        zoom: 12,
        attributionControl: false,
      });

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Click event for drawing new polygons
      map.on('click', (e: any) => {
        if (!mapInstanceRef.current?._isDrawingModeRef) return;
        const newPt: [number, number] = [e.latlng.lat, e.latlng.lng];
        mapInstanceRef.current._addPointCallback?.(newPt);
      });
    }

    init();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        if (!isGoogleMapsRef.current && mapInstanceRef.current.remove) {
          mapInstanceRef.current.remove();
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update drawing mode ref on map instance
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current._isDrawingModeRef = isDrawingMode;
      mapInstanceRef.current._addPointCallback = (pt: [number, number]) => {
        onDrawnPointsChange?.([...drawnPoints, pt]);
      };
    }
  }, [isDrawingMode, drawnPoints, onDrawnPointsChange]);

  // Render existing zones on the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isGoogleMapsRef.current) {
      const g = (window as any).google;
      if (!g?.maps) return;

      // Clear old polygon layers
      polygonLayersRef.current.forEach((layer) => {
        try {
          layer.setMap(null);
        } catch {}
      });
      polygonLayersRef.current = [];

      zones.forEach((zone) => {
        const ring = zone.polygon?.coordinates?.[0];
        if (!ring || ring.length < 3) return;

        // GeoJSON has [lng, lat], Google Maps wants { lat, lng }
        const path = ring.map((pt) => ({ lat: pt[1], lng: pt[0] }));
        const isSelected = zone.id === selectedZoneId;

        const poly = new g.maps.Polygon({
          paths: path,
          strokeColor: zone.active ? (isSelected ? '#047857' : '#059669') : '#64748b',
          strokeOpacity: isSelected ? 1 : 0.8,
          strokeWeight: isSelected ? 3 : 2,
          fillColor: zone.active ? '#10b981' : '#94a3b8',
          fillOpacity: isSelected ? 0.35 : 0.18,
          map,
        });

        poly.addListener('click', () => {
          onSelectZone?.(zone);
        });

        polygonLayersRef.current.push(poly);
      });
      return;
    }

    // Leaflet rendering
    const L = LRef.current;
    if (!L) return;

    // Clear old polygon layers
    polygonLayersRef.current.forEach((layer) => layer.remove());
    polygonLayersRef.current = [];

    zones.forEach((zone) => {
      const ring = zone.polygon?.coordinates?.[0];
      if (!ring || ring.length < 3) return;

      // GeoJSON has [lng, lat], Leaflet wants [lat, lng]
      const latLngs = ring.map((pt) => [pt[1], pt[0]]);
      const isSelected = zone.id === selectedZoneId;

      const polygonLayer = L.polygon(latLngs, {
        color: zone.active ? (isSelected ? '#047857' : '#059669') : '#64748b',
        fillColor: zone.active ? '#10b981' : '#94a3b8',
        fillOpacity: isSelected ? 0.35 : 0.18,
        weight: isSelected ? 3 : 2,
        dashArray: zone.active ? undefined : '5, 5',
      }).addTo(map);

      polygonLayer.bindTooltip(
        `<strong>${zone.name}</strong><br/>${zone.active ? '🟢 ACTIVE' : '⚪ INACTIVE'} • Delivers ${zone.delivery_day}`,
        { sticky: true }
      );

      polygonLayer.on('click', () => {
        onSelectZone?.(zone);
      });

      polygonLayersRef.current.push(polygonLayer);
    });
  }, [zones, selectedZoneId, onSelectZone]);

  // Render draft drawing polygon
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isGoogleMapsRef.current) {
      const g = (window as any).google;
      if (!g?.maps) return;

      // Clear old draft layers and markers
      if (draftLayerRef.current) {
        try {
          draftLayerRef.current.setMap(null);
        } catch {}
        draftLayerRef.current = null;
      }
      markersRef.current.forEach((m) => {
        try {
          m.setMap(null);
        } catch {}
      });
      markersRef.current = [];

      if (drawnPoints.length === 0) return;

      // Markers for each vertex on Google Maps
      drawnPoints.forEach((pt, index) => {
        const marker = new g.maps.Marker({
          position: { lat: pt[0], lng: pt[1] },
          map,
          title: `Point #${index + 1}`,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
        markersRef.current.push(marker);
      });

      if (drawnPoints.length >= 2) {
        const path = drawnPoints.map((pt) => ({ lat: pt[0], lng: pt[1] }));
        const draftPoly = new g.maps.Polygon({
          paths: path,
          strokeColor: '#dc2626',
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: '#f87171',
          fillOpacity: 0.25,
          map,
        });
        draftLayerRef.current = draftPoly;
      }
      return;
    }

    // Leaflet draft rendering
    const L = LRef.current;
    if (!L) return;

    // Clear old draft layers and markers
    if (draftLayerRef.current) {
      draftLayerRef.current.remove();
      draftLayerRef.current = null;
    }
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (drawnPoints.length === 0) return;

    // Markers for each vertex
    drawnPoints.forEach((pt, index) => {
      const marker = L.circleMarker(pt, {
        radius: 6,
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);
      marker.bindTooltip(`Point #${index + 1}`, { permanent: false });
      markersRef.current.push(marker);
    });

    if (drawnPoints.length >= 2) {
      const draftPoly = L.polygon(drawnPoints, {
        color: '#dc2626',
        fillColor: '#f87171',
        fillOpacity: 0.25,
        weight: 2,
        dashArray: '4, 4',
      }).addTo(map);
      draftLayerRef.current = draftPoly;
    }
  }, [drawnPoints]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 h-[360px] sm:h-[440px] w-full">
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Floating map status badge */}
      <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs font-bold text-slate-700 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>{zones.filter((z) => z.active).length} Active Zones Loaded</span>
      </div>

      {isDrawingMode && (
        <div className="absolute bottom-4 left-4 right-4 z-[400] bg-white/95 backdrop-blur-md p-3 rounded-2xl border-2 border-emerald-600 shadow-xl flex items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-extrabold text-emerald-950">
              ✏️ Drawing Polygon: {drawnPoints.length} point{drawnPoints.length === 1 ? '' : 's'} added
            </p>
            <p className="text-slate-500 text-[11px]">
              Click on the map to add boundary points (minimum 3 points required).
            </p>
          </div>
          {drawnPoints.length > 0 && (
            <button
              type="button"
              onClick={() => onDrawnPointsChange?.([])}
              className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-bold transition flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Points
            </button>
          )}
        </div>
      )}
    </div>
  );
}
