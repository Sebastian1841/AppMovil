import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type StorageValue = string | null;

const WEB_KEY_PREFIX = 'sinergy-gps-fuel:';

export const appStorage = {
  getItem: async (name: string): Promise<StorageValue> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(`${WEB_KEY_PREFIX}${name}`);
      }

      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`${WEB_KEY_PREFIX}${name}`, value);
      }
      return;
    }

    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`${WEB_KEY_PREFIX}${name}`);
      }
      return;
    }

    await SecureStore.deleteItemAsync(name);
  },
};
