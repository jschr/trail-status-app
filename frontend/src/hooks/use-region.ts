import { useQuery } from '@tanstack/react-query';
import api from '@/api';

export function useRegion(regionId?: string) {
  const result = useQuery({
    queryKey: ['region', regionId],
    queryFn: () => (regionId ? api.getRegion(regionId) : undefined),
    enabled: !!regionId,
  });

  return result;
}
