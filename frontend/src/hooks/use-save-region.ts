import api from '@/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface SaveRegionInput {
  regionId: string;
  regionName: string;
  openHashtag: string;
  closeHashtag: string;
  statusLookbackDays?: number | null;
}

export function useSaveRegion() {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationFn: async (input: SaveRegionInput) => {
      return await api.updateRegion(input.regionId, {
        name: input.regionName,
        openHashtag: input.openHashtag,
        closeHashtag: input.closeHashtag,
        statusLookbackDays: input.statusLookbackDays ?? null,
      });
    },
    onSuccess: (region) => {
      queryClient.invalidateQueries({ queryKey: ['region', region.id] });
    },
  });

  return result;
}

