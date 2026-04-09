import { Redirect } from 'expo-router';

import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { useAuthStore } from '@/store/authStore';

export default function IndexScreen() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  if (!hasHydrated) {
    return (
      <Screen>
        <LoadingState label="Preparando sesión..." />
      </Screen>
    );
  }

  if (user?.token) {
    return <Redirect href="/(tabs)/map" />;
  }

  return <Redirect href="/(auth)/login" />;
}
