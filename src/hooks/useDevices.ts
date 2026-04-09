import { useQuery } from '@tanstack/react-query';

import { getDevices } from '@/api';
import { useAuthUser } from '@/store/authStore';

export function useDevices() {
  const user = useAuthUser();

  return useQuery({
    queryKey: ['devices', user?.username],
    queryFn: () => getDevices(user!.token),
    enabled: Boolean(user?.token),
    staleTime: 60_000,
    retry: 1,
  });
}
