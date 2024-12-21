import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { Region } from '@/api';

export function useDeleteTrail(region?: Region) {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationFn: async (trailId: string) => {
      if (!region) return;

      await api.deleteTrail(trailId);

      // Disable all webhooks for this trail.
      const trailWebhooks = region.webhooks.filter(
        (w) => w.trailId === trailId,
      );
      await Promise.all(
        trailWebhooks.map((w) => api.updateWebhook(w.id, { enabled: false })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['region', region?.id] });
    },
  });

  return result;
}
