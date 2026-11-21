import { supabase } from '../lib/supabase';

export interface AdminDeliverySettings {
  baseDeliveryFee: number;
  freeDeliveryThreshold: number;
  isDeliveryFree: boolean;
  minimumOrderValue: number;
  deliveryDay: string;
  deliveryPromise: string;
}

export const DEFAULT_DELIVERY_SETTINGS: AdminDeliverySettings = {
  baseDeliveryFee: 40,
  freeDeliveryThreshold: 499,
  isDeliveryFree: false,
  minimumOrderValue: 100,
  deliveryDay: 'Sunday',
  deliveryPromise: 'Sunday by 6:00 PM',
};

/**
 * Fetches the delivery fee, free delivery threshold, and scheduling rules
 * dynamically managed from the Admin Panel in the Supabase database.
 */
export async function fetchDeliverySettings(): Promise<AdminDeliverySettings> {
  try {
    const { data, error } = await supabase
      .from('business_settings')
      .select('key, value');

    if (error || !data || data.length === 0) {
      return DEFAULT_DELIVERY_SETTINGS;
    }

    const settingsMap: Record<string, any> = {};
    data.forEach((row) => {
      settingsMap[row.key] = row.value;
    });

    const isDeliveryFree = Boolean(
      settingsMap.is_delivery_free === true ||
      settingsMap.is_delivery_free === 'true' ||
      Number(settingsMap.base_delivery_fee) === 0
    );

    const baseDeliveryFee = isDeliveryFree
      ? 0
      : Number(settingsMap.base_delivery_fee ?? DEFAULT_DELIVERY_SETTINGS.baseDeliveryFee);

    const freeDeliveryThreshold = Number(
      settingsMap.free_delivery_threshold ?? DEFAULT_DELIVERY_SETTINGS.freeDeliveryThreshold
    );

    const minimumOrderValue = Number(
      settingsMap.minimum_order_value ?? DEFAULT_DELIVERY_SETTINGS.minimumOrderValue
    );

    const deliveryDay = String(
      settingsMap.delivery_day ?? DEFAULT_DELIVERY_SETTINGS.deliveryDay
    ).replace(/"/g, '');

    const deliveryPromise = String(
      settingsMap.delivery_promise ?? DEFAULT_DELIVERY_SETTINGS.deliveryPromise
    ).replace(/"/g, '');

    return {
      baseDeliveryFee,
      freeDeliveryThreshold,
      isDeliveryFree,
      minimumOrderValue,
      deliveryDay,
      deliveryPromise,
    };
  } catch (err) {
    console.warn('Could not load admin delivery settings from database:', err);
    return DEFAULT_DELIVERY_SETTINGS;
  }
}
