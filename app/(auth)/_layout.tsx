import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/store/authStore';

export default function AuthLayout() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  if (!hasHydrated) return null;

  if (user?.token) {
    return <Redirect href="/(tabs)/map" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
