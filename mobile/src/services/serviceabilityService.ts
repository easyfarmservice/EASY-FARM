/**
 * Easy Farm Serviceability Service
 * Verifies if coordinates or pincodes fall within Easy Farm's active delivery zones.
 * Reuses the existing /api/delivery/check endpoint and Supabase check_delivery_availability RPC.
 */

import { supabase } from '../lib/supabase';
import { SERVICEABLE_PINCODES, getNearestCommunity } from '../constants/delivery';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.easyfarm.co.in';

export interface ServiceabilityResult {
  available: boolean;
  zone_id?: string;
  zone_name?: string;
  area_id?: string;
  area_name?: string;
  delivery_fee: number;
  minimum_order: number;
  delivery_day?: string;
  delivery_promise?: string;
  message?: string;
}

export async function checkDeliveryServiceability(
  latitude: number,
  longitude: number,
  pincode?: string
): Promise<ServiceabilityResult> {
  // 1. Try calling the existing Easy Farm backend endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(`${API_BASE_URL}/api/delivery/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude,
        longitude,
        ...(pincode ? { pincode } : {}),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        available: !!data.available,
        zone_id: data.zone_id,
        zone_name: data.zone_name,
        area_id: data.area_id,
        area_name: data.area_name,
        delivery_fee: Number(data.delivery_fee || 0),
        minimum_order: Number(data.minimum_order || 0),
        delivery_day: data.delivery_day || 'Sunday',
        delivery_promise: data.delivery_promise || 'Sunday by 6 PM',
        message: data.message,
      };
    }
  } catch (err) {
    console.warn('API /api/delivery/check call fallback:', err);
  }

  // 2. Direct Supabase PostGIS RPC check fallback
  try {
    const { data, error } = await supabase.rpc('check_delivery_availability', {
      lat: latitude,
      lng: longitude,
    });

    if (!error && data && data.length > 0 && data[0].available) {
      const row = data[0];
      return {
        available: true,
        zone_id: row.zone_id,
        zone_name: row.zone_name,
        area_id: row.area_id,
        area_name: row.area_name,
        delivery_fee: Number(row.delivery_fee || 0),
        minimum_order: Number(row.minimum_order || 0),
        delivery_day: row.delivery_day || 'Sunday',
        delivery_promise: row.delivery_promise || 'Sunday by 6 PM',
      };
    }
  } catch (rpcErr) {
    console.warn('Supabase PostGIS RPC check fallback:', rpcErr);
  }

  // 3. Fallback: Check if pincode or nearest community is in corridor
  if (pincode && SERVICEABLE_PINCODES.includes(pincode.trim())) {
    return {
      available: true,
      zone_name: 'Ghatkesar & Pocharam',
      area_name: 'Corridor Delivery Area',
      delivery_fee: 0,
      minimum_order: 250,
      delivery_day: 'Sunday',
      delivery_promise: 'Sunday by 6 PM',
    };
  }

  const { community, isClose } = getNearestCommunity(latitude, longitude);
  if (isClose) {
    return {
      available: true,
      zone_name: 'Ghatkesar & Pocharam',
      area_name: `${community.name} & Surrounding Area`,
      delivery_fee: 0,
      minimum_order: 250,
      delivery_day: 'Sunday',
      delivery_promise: 'Sunday by 6 PM',
    };
  }

  return {
    available: false,
    delivery_fee: 0,
    minimum_order: 0,
    message:
      "We don't deliver to this exact location yet. We currently serve our active launch corridor from Uppal to Ghatkesar & Pocharam.",
  };
}

