import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { Region } from '@/api';

export interface SaveTrailInput {
  trailId?: string;
  trailName: string;
  closeHashtag: string;
}

export function useSaveTrail(region?: Region) {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationFn: async (inputs: SaveTrailInput) => {
      if (inputs.trailId) {
        return await api.updateTrail(inputs.trailId, {
          name: inputs.trailName,
          closeHashtag: inputs.closeHashtag,
        });
      } else {
        return await api.createTrail({
          name: inputs.trailName,
          closeHashtag: inputs.closeHashtag,
          regionId: region!.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['region', region?.id] });
    },
  });

  return result;
}
