/**
 * Easy Farm Active Delivery Address Manager
 * Keeps active delivery address in AsyncStorage and syncs to Supabase when logged in.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export const ACTIVE_ADDRESS_KEY = '@easyfarm:active_delivery_address_v1';

export interface ActiveDeliveryAddress {
  id?: string;
  label: 'Home' | 'Work' | 'Other';
  flatNo: string;
  apartment: string;
  locality: string;
  pincode: string;
  fullAddress: string;
  landmark?: string;
  instructions?: string;
  latitude: number;
  longitude: number;
  isServiceable: boolean;
  zoneName?: string;
  areaName?: string;
  deliveryDay?: string;
  deliveryPromise?: string;
  isDefault?: boolean;
}

export async function getActiveDeliveryAddress(): Promise<ActiveDeliveryAddress | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_ADDRESS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setActiveDeliveryAddress(
  address: ActiveDeliveryAddress
): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_ADDRESS_KEY, JSON.stringify(address));
  } catch (err) {
    console.warn('Failed to save active address locally:', err);
  }
}

export async function saveAddressToSupabase(
  address: ActiveDeliveryAddress
): Promise<string | undefined> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return undefined;
    }

    // Lookup customer profile id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return undefined;
    }

    const { data: inserted, error } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: profile.id,
        label: address.label,
        full_address: `${address.flatNo}, ${address.apartment}`,
        apartment: address.apartment,
        locality: address.locality,
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: address.pincode,
        latitude: address.latitude,
        longitude: address.longitude,
        is_default: !!address.isDefault,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.warn('Supabase insert customer_addresses warning:', error.message);
      return undefined;
    }

    return inserted?.id;
  } catch (err) {
    console.warn('Failed to sync address to Supabase:', err);
    return undefined;
  }
}

export type SavedAddressItem = ActiveDeliveryAddress;
export const getSelectedDeliveryAddress = getActiveDeliveryAddress;

export async function getSavedAddresses(): Promise<SavedAddressItem[]> {
  try {
    const active = await getActiveDeliveryAddress();
    if (active) {
      return [active];
    }
    return [];
  } catch {
    return [];
  }
}


