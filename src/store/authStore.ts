import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { UserSession } from '@/types';

import { appStorage } from './storage';

type AuthState = {
  user: UserSession | null;
  hasHydrated: boolean;
  setSession: (user: UserSession) => void;
  signOut: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,
      setSession: (user) => set({ user }),
      signOut: () => set({ user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'auth-session',
      storage: createJSONStorage(() => appStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

export function useAuthUser() {
  return useAuthStore((state) => state.user);
}
