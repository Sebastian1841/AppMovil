import { useQuery } from '@tanstack/react-query';

import { getPositions } from '@/api';
import { useAuthUser } from '@/store/authStore';

export function usePositions() {
  const user = useAuthUser();

  return useQuery({
    queryKey: ['positions', user?.username],
    queryFn: () => getPositions(user!.token),
    enabled: Boolean(user?.token),
    refetchInterval: 7000,
    staleTime: 5000,
    retry: 1,
  });
}
