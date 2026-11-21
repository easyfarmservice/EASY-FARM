/**
 * Easy Farm Native Mobile Location Service
 * Handles debounced address search, device GPS, reverse geocoding,
 * recent search storage, and customer saved addresses.
 */

import * as Location from 'expo-location';
import { SafeStorage } from '../lib/storage';
import { supabase } from '../lib/supabase';
import {
  SERVICEABLE_COMMUNITIES,
  getNearestCommunity,
} from '../constants/delivery';

const RECENT_SEARCHES_KEY = '@easyfarm:recent_searches_v1';
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.easyfarm.co.in';
export const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  'AIzaSyArhi4VQuGUHPY_cBbf4tOlGW1Q4e8JHLI';

export interface LocationSearchResult {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  pincode?: string;
  locality?: string;
  isKnownCommunity?: boolean;
}

export interface ResolvedAddress {
  placeName: string;
  locality: string;
  mandal: string;
  pincode: string;
  fullAddress: string;
  nearText: string;
  latitude: number;
  longitude: number;
}

export interface SavedCustomerAddress {
  id: string;
  label: string;
  full_address: string;
  apartment?: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  is_default?: boolean;
}

/**
 * Search locations matching apartments, townships, buildings, streets, pincodes, localities
 */
export async function searchLocations(
  query: string,
  signal?: AbortSignal
): Promise<LocationSearchResult[]> {
  const clean = query.trim().toLowerCase();
  if (!clean || clean.length < 2) {
    return [];
  }

  const results: LocationSearchResult[] = [];
  const seenKeys = new Set<string>();

  // 1. Instant match in known serviceable corridor communities
  for (const c of SERVICEABLE_COMMUNITIES) {
    const matchesName = c.name.toLowerCase().includes(clean);
    const matchesArea = c.area.toLowerCase().includes(clean);
    const matchesPin = c.pincode.includes(clean);

    if (matchesName || matchesArea || matchesPin) {
      const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        results.push({
          id: `community-${c.name}`,
          title: c.name,
          subtitle: `${c.area}, Hyderabad - ${c.pincode}`,
          fullAddress: `${c.name}, ${c.area}, Ghatkesar mandal, Hyderabad, Telangana ${c.pincode}`,
          latitude: c.lat,
          longitude: c.lng,
          pincode: c.pincode,
          locality: c.area,
          isKnownCommunity: true,
        });
      }
    }
  }

  // If matched 5+ communities directly, return immediately for instant response
  if (results.length >= 6) {
    return results.slice(0, 8);
  }

  // 2. Fetch Google Places Autocomplete if API key is active
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        clean
      )}&location=17.4475,78.6534&radius=25000&components=country:in&key=${GOOGLE_MAPS_API_KEY}`;

      const gRes = await fetch(placesUrl, { signal });
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.status === 'OK' && Array.isArray(gData.predictions)) {
          for (const pred of gData.predictions) {
            const mainText =
              pred.structured_formatting?.main_text || pred.description.split(',')[0];
            const secondaryText =
              pred.structured_formatting?.secondary_text || pred.description;

            results.push({
              id: `google-${pred.place_id}`,
              title: mainText,
              subtitle: secondaryText,
              fullAddress: pred.description,
              latitude: 17.4475,
              longitude: 78.6534,
              locality: secondaryText.split(',')[0]?.trim() || 'Ghatkesar',
              isKnownCommunity: false,
            });

            if (results.length >= 8) break;
          }
        }
      }
    } catch (gErr: any) {
      if (gErr?.name === 'AbortError') return [];
      console.warn('Google Places API search fallback:', gErr);
    }
  }

  if (results.length >= 8) {
    return results.slice(0, 8);
  }

  // 3. Fallback to OpenStreetMap / Nominatim
  try {
    const queryWithContext =
      clean.includes('hyderabad') || clean.includes('ghatkesar')
        ? clean
        : `${clean}, Ghatkesar, Hyderabad`;

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      queryWithContext
    )}&limit=8&countrycodes=in&addressdetails=1`;

    const res = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'EasyFarmMobile/1.0 (contact@easyfarm.co.in)',
        'Accept-Language': 'en',
      },
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;

          if (seenKeys.has(key)) continue;
          seenKeys.add(key);

          const parts = (item.display_name || '').split(',').map((p: string) => p.trim());
          const title = parts[0] || 'Selected Location';
          const subtitle = parts.slice(1, 4).join(', ') || 'Hyderabad, Telangana';

          const pinMatch = (item.display_name || '').match(/\b5\d{5}\b/);
          const pincode = pinMatch ? pinMatch[0] : (item.address?.postcode || '');

          results.push({
            id: `nom-${item.place_id || Math.random()}`,
            title,
            subtitle,
            fullAddress: item.display_name,
            latitude: lat,
            longitude: lng,
            pincode,
            locality: item.address?.suburb || item.address?.town || parts[1] || 'Ghatkesar',
            isKnownCommunity: false,
          });

          if (results.length >= 8) break;
        }
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return [];
    }
    console.warn('Location search API warning:', err?.message || err);
  }

  return results.slice(0, 8);
}

/**
 * Fetch precise coordinates from Google Places API for a place_id
 */
export async function getPlaceCoordinates(
  placeId: string
): Promise<{ latitude: number; longitude: number } | null> {
  const cleanId = placeId.replace(/^google-/, '');
  if (!GOOGLE_MAPS_API_KEY) return null;

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${cleanId}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.result?.geometry?.location) {
        return {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
        };
      }
    }
  } catch (err) {
    console.warn('Google Place Details error:', err);
  }
  return null;
}

/**
 * Reverse geocode a latitude & longitude
 */
export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
): Promise<ResolvedAddress> {
  // 1. First priority: Direct Google Geocoding API for exact doorstep address
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

      const googleRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`,
        { signal: controller.signal }
      );
      clearTimeout(timer);

      if (googleRes.ok) {
        const gData = await googleRes.json();
        if (gData.status === 'OK' && gData.results && gData.results.length > 0) {
          const top = gData.results[0];
          let sublocality = '';
          let locality = '';
          let mandal = '';
          let pincode = '';
          let premise = '';
          let route = '';

          for (const comp of top.address_components || []) {
            const types = comp.types || [];
            if (types.includes('postal_code')) pincode = comp.long_name;
            if (types.includes('sublocality_level_1')) sublocality = comp.long_name;
            if (types.includes('sublocality_level_2')) premise = comp.long_name;
            if (types.includes('locality')) locality = comp.long_name;
            if (
              types.includes('administrative_area_level_3') ||
              types.includes('administrative_area_level_2')
            ) {
              if (!mandal) mandal = comp.long_name;
            }
            if (types.includes('route')) route = comp.long_name;
          }

          // Micro-snap to nearest community if within 250m
          const { community, distanceKm } = getNearestCommunity(latitude, longitude);
          let placeName = '';
          if (distanceKm <= 0.25) {
            placeName = community.name;
          } else {
            placeName =
              premise ||
              sublocality ||
              route ||
              top.address_components?.[0]?.long_name ||
              'Current Location';
          }

          const resolvedPincode = pincode || community?.pincode || '500088';
          const resolvedLocality = sublocality || locality || community?.area || 'Pocharam';
          const resolvedMandal = mandal || 'Ghatkesar mandal';

          return {
            placeName,
            locality: resolvedLocality,
            mandal: resolvedMandal,
            pincode: resolvedPincode,
            fullAddress:
              top.formatted_address || `${placeName}, ${resolvedLocality}, ${resolvedPincode}`,
            nearText: `Near ${placeName}`,
            latitude,
            longitude,
          };
        }
      }
    } catch (gErr) {
      console.warn('Google reverse-geocode fallback:', gErr);
    }
  }

  // 2. Try device-native Expo Geocoder (instant on real mobile devices)
  try {
    const nativeResults = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (nativeResults && nativeResults.length > 0) {
      const item = nativeResults[0];
      const placeName = item.name || item.street || item.subregion || 'Current Location';
      const locality = item.subregion || item.city || item.district || 'Hyderabad';
      const pincode = item.postalCode || '500088';
      const parts = [item.name, item.street, item.subregion, item.city, item.postalCode].filter(Boolean);
      const fullAddress = parts.join(', ');
      return {
        placeName,
        locality,
        mandal: item.district || item.subregion || 'Ghatkesar mandal',
        pincode,
        fullAddress: fullAddress || `${placeName}, ${locality}, ${pincode}`,
        nearText: `Near ${placeName}`,
        latitude,
        longitude,
      };
    }
  } catch (nativeErr) {
    // Continue to backend or nearest community
  }

  // 2. Call the Easy Farm backend endpoint
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE_URL}/api/delivery/reverse-geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ latitude, longitude }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return {
          placeName: data.placeName || 'Ghatkesar',
          locality: data.locality || data.mandal || 'Ghatkesar mandal',
          mandal: data.mandal || 'Ghatkesar mandal',
          pincode: data.pincode || '500088',
          fullAddress: data.fullAddress || `${data.placeName}, ${data.mandal}`,
          nearText: data.nearText || `Near ${data.placeName}`,
          latitude,
          longitude,
        };
      }
    }
  } catch (err) {
    console.warn('Backend reverse-geocode call fallback:', err);
  }

  // 3. Graceful corridor fallback via nearest known community
  const { community } = getNearestCommunity(latitude, longitude);
  return {
    placeName: community.name,
    locality: community.area,
    mandal: 'Ghatkesar mandal',
    pincode: community.pincode,
    fullAddress: `${community.name}, ${community.area}, Ghatkesar mandal, ${community.pincode}`,
    nearText: `Near ${community.name}`,
    latitude,
    longitude,
  };
}

/**
 * Get current device GPS location using Expo Location
 */
export async function getCurrentDeviceLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error(
      'Location permission was denied. Please allow location access to verify delivery to your doorstep.'
    );
  }

  // Try last known first for instant response
  const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
  if (lastKnown?.coords) {
    return {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude,
    };
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

/**
 * Auto-detect user current location with fast fallback and reverse geocoding
 */
export async function getUserCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
  formattedAddress: string;
  locality: string;
  pincode: string;
  isServiceable: boolean;
}> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return {
        latitude: 17.4475,
        longitude: 78.6534,
        formattedAddress: 'Singapore Township, Pocharam, 500088',
        locality: 'Singapore Township',
        pincode: '500088',
        isServiceable: true,
      };
    }

    let coords: { latitude: number; longitude: number } | null = null;

    // 1. First attempt active fresh GPS position with 4.5s timeout
    try {
      const positionPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500));
      const posResult: any = await Promise.race([positionPromise, timeoutPromise]);
      if (posResult?.coords) {
        coords = {
          latitude: posResult.coords.latitude,
          longitude: posResult.coords.longitude,
        };
      }
    } catch {
      // Continue to last known
    }

    // 2. Fall back to last known position if active fix took longer
    if (!coords) {
      const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
      if (lastKnown?.coords) {
        coords = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
      }
    }

    const lat = coords?.latitude || 17.4475;
    const lng = coords?.longitude || 78.6534;

    const resolved = await reverseGeocodeLocation(lat, lng);
    return {
      latitude: lat,
      longitude: lng,
      formattedAddress: resolved.fullAddress,
      locality: resolved.locality,
      pincode: resolved.pincode,
      isServiceable: true,
    };
  } catch (err) {
    console.warn('Auto location fetch fallback:', err);
    return {
      latitude: 17.4475,
      longitude: 78.6534,
      formattedAddress: 'Singapore Township, Pocharam, 500088',
      locality: 'Singapore Township',
      pincode: '500088',
      isServiceable: true,
    };
  }
}

/**
 * Retrieve recent search items from local storage
 */
export async function getRecentSearches(): Promise<LocationSearchResult[]> {
  try {
    const raw = await SafeStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save an address to recent searches (up to 5 unique items)
 */
export async function saveRecentSearch(item: LocationSearchResult): Promise<void> {
  try {
    const existing = await getRecentSearches();
    const filtered = existing.filter(
      (x) =>
        x.id !== item.id &&
        Math.abs(x.latitude - item.latitude) > 0.0001 &&
        Math.abs(x.longitude - item.longitude) > 0.0001
    );
    const updated = [item, ...filtered].slice(0, 5);
    await SafeStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save recent search:', err);
  }
}

/**
 * Clear recent search history
 */
export async function clearRecentSearches(): Promise<void> {
  try {
    await SafeStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {}
}

/**
 * Fetch saved customer delivery addresses from Supabase
 */
export async function getSavedCustomerAddresses(): Promise<SavedCustomerAddress[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data as SavedCustomerAddress[];
  } catch {
    return [];
  }
}

