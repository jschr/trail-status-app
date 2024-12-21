import { useQuery } from '@tanstack/react-query';
import api from '@/api';

export function useRegionStatus(regionId?: string) {
  const result = useQuery({
    queryKey: ['regionStatus', regionId],
    queryFn: () => (regionId ? api.getRegionStatus(regionId) : undefined),
    enabled: !!regionId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2.5 * 60 * 1000,
  });

  return result;
}
