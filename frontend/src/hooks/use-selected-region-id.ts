import { useUser } from '@/hooks/use-user';

export function useSelectedRegionId() {
  const result = useUser();
  const user = result.data;

  const selectedRegionId = localStorage.getItem('selectedRegionId');
  const selectedRegion = user?.regions.find((r) => r.id === selectedRegionId);

  const firstRegion = user?.regions[0];

  return { ...result, data: selectedRegion?.id || firstRegion?.id };
}
