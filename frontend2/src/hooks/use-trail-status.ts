import { useQuery } from '@tanstack/react-query';
import api from '@/api';

export function useTrailStatus(trailId?: string) {
  const result = useQuery({
    queryKey: ['trailStatus', trailId],
    queryFn: () => (trailId ? api.getTrailStatus(trailId) : undefined),
    enabled: !!trailId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  return result;
}
