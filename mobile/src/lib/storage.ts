/**
 * Easy Farm Safe Storage Adapter
 * Wraps @react-native-async-storage/async-storage with an in-memory/resilient fallback
 * so that missing native bindings, Expo Go quirks, or web fallbacks NEVER crash the app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map<string, string>();

export const SafeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null && val !== undefined) return val;
      return memoryStore.get(key) ?? null;
    } catch (err) {
      return memoryStore.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryStore.set(key, value);
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      // In-memory store already saved it
    }
  },

  async removeItem(key: string): Promise<void> {
    memoryStore.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      // In-memory store already removed it
    }
  },

  async clear(): Promise<void> {
    memoryStore.clear();
    try {
      await AsyncStorage.clear();
    } catch (err) {
      // In-memory store cleared
    }
  },
};

export default SafeStorage;

