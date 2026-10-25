import { NextRequest, NextResponse } from 'next/server';
import { SERVICEABLE_COMMUNITIES } from '@/lib/constants';

interface GeoCacheEntry {
  placeName: string;
  locality: string;
  mandal: string;
  pincode: string;
  fullAddress: string;
  shortName: string;
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
    let pincode = nearest.community.pincode || '501301';
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

          const extractedPlace =
            addr.suburb ||
            addr.residential ||
            addr.building ||
            addr.amenity ||
            addr.neighbourhood ||
            addr.hamlet ||
            addr.village ||
            addr.road ||
            data.name ||
            (nearest.isClose ? nearest.community.name : 'Pinned Location');

          const extractedMandal =
            addr.town ||
            addr.county ||
            addr.subdistrict ||
            addr.city_district ||
            addr.city ||
            (nearest.isClose ? nearest.community.area : 'Ghatkesar mandal');

          const rawPin = addr.postcode ? String(addr.postcode).replace(/\D/g, '').slice(0, 6) : '';
          const extractedPin =
            rawPin && rawPin.length === 6
              ? rawPin
              : nearest.isClose
              ? nearest.community.pincode
              : latitude < 17.435 || latitude > 17.46
              ? '501301'
              : '500088';

          placeName = extractedPlace;
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

    const result: GeoCacheEntry = {
      placeName,
      locality: mandal,
      mandal,
      pincode,
      fullAddress,
      shortName,
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
        locality: 'Ghatkesar mandal',
        mandal: 'Ghatkesar mandal',
        pincode: '501301',
        shortName: 'Pinned Location, Ghatkesar mandal, 501301',
        fullAddress: 'Pinned Location, Ghatkesar mandal, 501301',
      },
      { status: 500 }
    );
  }
}
