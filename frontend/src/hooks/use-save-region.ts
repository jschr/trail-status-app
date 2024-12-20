import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { Region } from '@/api';

export function useSaveRegion(region?: Region) {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationFn: async () => {
      if (region) {
        return await api.updateRegion(region.id, {
          name: region.name,
          openHashtag: region.openHashtag,
          closeHashtag: region.closeHashtag,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['region', region?.id] });
    },
  });

  return result;
}
