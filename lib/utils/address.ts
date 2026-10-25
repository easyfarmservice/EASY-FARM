export interface SavedAddressItem {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  email: string;
  apartment: string;
  flatNo: string;
  locality: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

/**
 * Returns a strictly isolated storage key for each user.
 * Each user has their own unique key. Never falls back to a global key.
 */
export function getUserAddressKey(user: { id?: string; email?: string } | null | undefined): string | null {
  if (typeof window === 'undefined') return null;

  const email = user?.email?.toLowerCase().trim();
  if (email) {
    return `easyfarm_saved_addresses_${email}`;
  }

  const id = user?.id;
  if (id && id !== 'demo-user' && id !== 'guest') {
    return `easyfarm_saved_addresses_${id}`;
  }

  return null;
}

/**
 * Retrieves saved addresses strictly for the current authenticated user.
 * Does NOT leak or migrate addresses from other accounts or global storage.
 */
export function getSavedAddresses(user: { id?: string; email?: string } | null | undefined): SavedAddressItem[] {
  if (typeof window === 'undefined') return [];

  const key = getUserAddressKey(user);
  if (!key) return [];

  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved addresses for key:', key, e);
    }
  }

  return [];
}

/**
 * Saves addresses strictly under the user's isolated key.
 * Never writes to global shared keys.
 */
export function saveUserAddresses(
  user: { id?: string; email?: string } | null | undefined,
  addresses: SavedAddressItem[]
): void {
  if (typeof window === 'undefined') return;

  const key = getUserAddressKey(user);
  if (!key) return;

  const data = JSON.stringify(addresses);
  localStorage.setItem(key, data);
}

/**
 * Clean up legacy global address keys that could leak across user sessions.
 */
export function clearLegacyGlobalAddresses(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('easyfarm_saved_addresses');
  localStorage.removeItem('easyfarm_saved_addresses_guest');
}
