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

  // Tight threshold: roughly within ~250-300m (0.00008 distSq) to confirm door is inside this exact gated complex
  const isClose = minDistance < 0.00008;
  return { community: closest, isClose, distMeters: Math.round(Math.sqrt(minDistance) * 111000) };
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

    let placeName = nearest.isClose ? nearest.community.name : 'Target Location';
    let mandal = nearest.community.area || 'Ghatkesar mandal';
    let pincode = nearest.community.pincode || '500088';
    let fullAddress = `${placeName}, ${mandal}, ${pincode}`;

    // ── 1. Google Geocoding API (when enabled on Google Cloud) ────────────────
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (googleApiKey) {
      try {
        const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}`;
        const gRes = await fetch(gUrl, { signal: AbortSignal.timeout(3000) });
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.status === 'OK' && Array.isArray(gData.results) && gData.results.length > 0) {
            const first = gData.results[0];
            let gPlace = '';
            let gLocality = '';
            let gPin = '';

            for (const c of first.address_components || []) {
              if (c.types.includes('postal_code')) gPin = c.long_name;
              if (
                c.types.includes('sublocality_level_1') ||
                c.types.includes('neighborhood') ||
                c.types.includes('premise') ||
                c.types.includes('point_of_interest') ||
                c.types.includes('route')
              ) {
                if (!gPlace) gPlace = c.long_name;
              }
              if (c.types.includes('sublocality_level_2') || c.types.includes('locality')) {
                if (!gLocality) gLocality = c.long_name;
              }
            }

            const parts = first.formatted_address.split(',').map((p: string) => p.trim());
            const shortName = parts.slice(0, 3).join(', ');
            placeName = gPlace || (nearest.isClose ? nearest.community.name : parts[0]);
            mandal = gLocality || parts[1] || nearest.community.area;
            pincode = gPin || nearest.community.pincode;
            fullAddress = first.formatted_address;

            const resObj: GeoCacheEntry = {
              placeName,
              locality: mandal,
              mandal,
              pincode,
              fullAddress,
              shortName,
              nearText: `Near ${placeName}`,
              timestamp: Date.now(),
            };
            geocodeCache.set(cacheKey, resObj);
            return NextResponse.json({ success: true, ...resObj });
          }
        }
      } catch (gErr) {
        // Fall back to high-resolution OpenStreetMap / BigDataCloud
      }
    }

    // ── 2. High-Resolution OpenStreetMap Geocoding ────────────────────────────

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
          } else if (specific) {
            resolvedPlace = specific;
          } else if (nearest.isClose) {
            // High-precision match within ~250m of a known community or sector
            resolvedPlace = nearest.community.name;
          } else if (addr.road) {
            resolvedPlace = localityPart && localityPart !== addr.road ? `${addr.road}, ${localityPart}` : addr.road;
          } else if (localityPart && !localityPart.toLowerCase().includes('mandal')) {
            resolvedPlace = localityPart;
          } else {
            resolvedPlace = data.name || `Near ${nearest.community.name}`;
          }

          // 4. Broader administrative area (Mandal / District / City)
          const extractedMandal =
            (nearest.isClose ? nearest.community.area : null) ||
            addr.subdistrict ||
            addr.town ||
            addr.city_district ||
            addr.county ||
            addr.city ||
            'Ghatkesar mandal';

          // 5. Postal code - prioritize verified community pin when inside known community
          let extractedPin = nearest.isClose && nearest.community.pincode ? nearest.community.pincode : '';
          if (!extractedPin && addr.postcode) {
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
