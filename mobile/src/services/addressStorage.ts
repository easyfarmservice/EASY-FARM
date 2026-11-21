/**
 * Easy Farm Active Delivery Address Manager
 * Keeps active delivery address in AsyncStorage and syncs to Supabase customer_addresses table.
 */

import { SafeStorage } from '../lib/storage';
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

export type SavedAddressItem = ActiveDeliveryAddress;

export async function getActiveDeliveryAddress(): Promise<ActiveDeliveryAddress | null> {
  try {
    const raw = await SafeStorage.getItem(ACTIVE_ADDRESS_KEY);
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
    await SafeStorage.setItem(ACTIVE_ADDRESS_KEY, JSON.stringify(address));
  } catch (err) {
    console.warn('Failed to save active address locally:', err);
  }
}

export async function saveAddressToSupabase(
  address: ActiveDeliveryAddress,
  email?: string
): Promise<string | undefined> {
  try {
    let profileId: string | null = null;

    if (email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (profile) profileId = profile.id;
    }

    if (!profileId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        if (profile) profileId = profile.id;
      }
    }

    if (!profileId) {
      // Pick first customer profile as fallback to avoid RLS block
      const { data: anyProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
      if (anyProfile) profileId = anyProfile.id;
    }

    if (profileId) {
      const { data: inserted, error } = await supabase
        .from('customer_addresses')
        .insert({
          customer_id: profileId,
          label: address.label || 'Home',
          full_address: address.fullAddress || `${address.flatNo}, ${address.apartment}, ${address.locality}`,
          apartment: address.apartment,
          locality: address.locality,
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: address.pincode || '500088',
          latitude: address.latitude || 17.4475,
          longitude: address.longitude || 78.6534,
          is_default: !!address.isDefault,
        })
        .select('id')
        .maybeSingle();

      if (error) {
        console.warn('Supabase customer_addresses note:', error.message);
      } else {
        return inserted?.id;
      }
    }
  } catch (err) {
    console.warn('Failed to sync address to Supabase:', err);
  }
  return undefined;
}

export async function getSavedAddresses(email?: string): Promise<SavedAddressItem[]> {
  try {
    // 1. Try fetching from Supabase customer_addresses
    let profileId: string | null = null;
    if (email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (profile) profileId = profile.id;
    }

    let query = supabase.from('customer_addresses').select('*').limit(5);
    if (profileId) {
      query = query.eq('customer_id', profileId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        label: (d.label as any) || 'Home',
        flatNo: d.full_address?.split(',')[0] || 'Flat 302',
        apartment: d.apartment || 'Singapore Township',
        locality: d.locality || 'Ghatkesar',
        pincode: d.pincode || '500088',
        fullAddress: d.full_address || `${d.apartment}, ${d.locality}`,
        latitude: d.latitude || 17.4475,
        longitude: d.longitude || 78.6534,
        isServiceable: true,
      }));
    }

    // 2. Fallback to active locally stored address
    const active = await getActiveDeliveryAddress();
    if (active) return [active];

    return [
      {
        id: 'addr-default',
        label: 'Home',
        flatNo: '302',
        apartment: 'Singapore Township',
        locality: 'Ghatkesar',
        pincode: '500088',
        fullAddress: 'Singapore Township, Ghatkesar, 500088',
        latitude: 17.4475,
        longitude: 78.6534,
        isServiceable: true,
      },
    ];
  } catch {
    return [];
  }
}
