import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api';

export interface SaveRegionInput {
  regionId: string;
  regionName: string;
  openHashtag: string;
  closeHashtag: string;
}

export function useSaveRegion() {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationFn: async (input: SaveRegionInput) => {
      return await api.updateRegion(input.regionId, {
        name: input.regionName,
        openHashtag: input.openHashtag,
        closeHashtag: input.closeHashtag,
      });
    },
    onSuccess: (region) => {
      queryClient.invalidateQueries({ queryKey: ['region', region.id] });
    },
  });

  return result;
}
