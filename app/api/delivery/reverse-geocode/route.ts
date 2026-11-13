import { NextRequest, NextResponse } from 'next/server';
import { SERVICEABLE_COMMUNITIES } from '@/lib/constants';

interface GeoCacheEntry {
  placeName: string;
  locality: string;
  mandal: string;
  pincode: string;
  fullAddress: string;
  shortName: string;
  nearText: string;
  timestamp: number;
}

// In-memory cache for fast reverse geocoding (stores up to 200 recent locations)
const geocodeCache = new Map<string, GeoCacheEntry>();

function getNearestKnownCommunity(lat: number, lng: number) {
  let closest = SERVICEABLE_COMMUNITIES[0];
  let minDistance = Infinity;

  for (const c of SERVICEABLE_COMMUNITIES) {
    const dLat = c.lat - lat;
    const dLng = c.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistance) {
      minDistance = distSq;
      closest = c;
    }
  }

  // Roughly within ~2.5km (0.025 degrees latitude/longitude)
  const isClose = minDistance < 0.0006;
  return { community: closest, isClose };
}

export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude } = await req.json();

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hr cache
      return NextResponse.json({ success: true, ...cached });
    }

    const nearest = getNearestKnownCommunity(latitude, longitude);

    let placeName = nearest.community.name;
    let mandal = nearest.community.area || 'Ghatkesar mandal';
    let pincode = nearest.community.pincode || '500088';
    let fullAddress = `${placeName}, ${mandal}, ${pincode}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'EasyFarmPlatform/1.0 (contact@easyfarm.in)',
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;

          // 1. Specific local landmark, building, apartment, or society
          const specific =
            addr.house_name ||
            addr.building ||
            addr.amenity ||
            addr.residential ||
            addr.neighbourhood ||
            addr.quarter ||
            addr.allotments ||
            addr.estate ||
            addr.colony;

          // 2. Locality or Suburb
          const localityPart =
            addr.suburb ||
            addr.village ||
            addr.hamlet ||
            addr.town ||
            addr.road;

          // 3. Combine specific + locality if both exist and differ
          let resolvedPlace = '';
          if (specific && localityPart && !specific.toLowerCase().includes(localityPart.toLowerCase())) {
            resolvedPlace = `${specific}, ${localityPart}`;
          } else {
            resolvedPlace =
              specific ||
              localityPart ||
              data.name ||
              (nearest.isClose ? nearest.community.name : 'Pinned Location');
          }

          // 4. Broader administrative area (Mandal / District / City)
          const extractedMandal =
            addr.subdistrict ||
            addr.town ||
            addr.city_district ||
            addr.county ||
            addr.city ||
            (nearest.isClose ? nearest.community.area : 'Ghatkesar mandal');

          // 5. Postal code - prioritize real 6-digit pin from Nominatim
          let extractedPin = '';
          if (addr.postcode) {
            const clean = String(addr.postcode).replace(/\D/g, '').slice(0, 6);
            if (clean.length === 6 && clean.startsWith('5')) {
              extractedPin = clean;
            }
          }
          if (!extractedPin && data.display_name) {
            const match = data.display_name.match(/\b5\d{5}\b/);
            if (match) {
              extractedPin = match[0];
            }
          }
          if (!extractedPin) {
            if (nearest.isClose && nearest.community.pincode) {
              extractedPin = nearest.community.pincode;
            } else {
              // Heuristic based on longitude / latitude coordinates across Hyderabad corridor
              if (longitude < 78.60) extractedPin = '500039'; // Boduppal
              else if (longitude < 78.625) extractedPin = '500092'; // Peerzadiguda / Medipally
              else if (longitude < 78.655) extractedPin = '500098'; // Narapally
              else if (latitude > 17.47) extractedPin = '501401'; // Rampally / Keesara
              else if (longitude >= 78.67) extractedPin = '501301'; // Ghatkesar
              else extractedPin = '500088'; // Pocharam / Singapore Township
            }
          }

          placeName = resolvedPlace;
          mandal = extractedMandal;
          pincode = extractedPin;
          fullAddress = data.display_name || `${placeName}, ${mandal}, ${pincode}`;
        }
      }
    } catch (e) {
      console.warn('Nominatim reverse geocode fallback to nearest known community:', e);
    }

    const parts = [placeName, mandal, pincode].filter(Boolean);
    const shortName = parts.join(', ');

    // Format "Near [Exact Location]"
    let cleanNearby = placeName.replace(/^Near\s+/i, '').trim();
    if (!cleanNearby || cleanNearby === 'Pinned Location') {
      cleanNearby = nearest.community.name;
    }
    const nearText = `Near ${cleanNearby}`;

    const result: GeoCacheEntry = {
      placeName,
      locality: mandal,
      mandal,
      pincode,
      fullAddress,
      shortName,
      nearText,
      timestamp: Date.now(),
    };

    if (geocodeCache.size > 200) {
      geocodeCache.clear();
    }
    geocodeCache.set(cacheKey, result);

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Error in reverse geocode endpoint:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reverse geocode',
        placeName: 'Pinned Location',
        locality: 'Ghatkesar & Pocharam Corridor',
        mandal: 'Ghatkesar & Pocharam Corridor',
        pincode: '500088',
        shortName: 'Pinned Location, Ghatkesar & Pocharam, 500088',
        fullAddress: 'Pinned Location, Ghatkesar & Pocharam, 500088',
        nearText: 'Near Singapore Township, Pocharam',
      },
      { status: 500 }
    );
  }
}
