/**
 * Easy Farm Native Mobile Location Service
 * Handles debounced address search, device GPS, reverse geocoding,
 * recent search storage, and customer saved addresses.
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  SERVICEABLE_COMMUNITIES,
  getNearestCommunity,
} from '../constants/delivery';

const RECENT_SEARCHES_KEY = '@easyfarm:recent_searches_v1';
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.easyfarm.co.in';

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

  // 2. Fetch external geocoding suggestions
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
      // Intentionally aborted due to newer keystroke
      return [];
    }
    console.warn('Location search API warning:', err?.message || err);
  }

  return results.slice(0, 8);
}

/**
 * Reverse geocode a latitude & longitude
 */
export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
): Promise<ResolvedAddress> {
  // Call the existing Easy Farm backend endpoint
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

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

  // Graceful local fallback via nearest known community
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

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

/**
 * Retrieve recent search items from local storage
 */
export async function getRecentSearches(): Promise<LocationSearchResult[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
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
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save recent search:', err);
  }
}

/**
 * Clear recent search history
 */
export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
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

