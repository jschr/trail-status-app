import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { Region } from '@/api';

export interface SaveWebhookInput {
  webhookId?: string;
  webhookName: string;
  description?: string;
  trailId?: string;
  method: string;
  url: string;
  enabled: boolean;
}

export function useSaveWebhook(region?: Region) {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationFn: async (inputs: SaveWebhookInput) => {
      // Remove trailId if it's for the region.
      if (inputs.trailId === 'region') {
        delete inputs.trailId;
      }

      if (inputs.webhookId) {
        return await api.updateWebhook(inputs.webhookId, {
          name: inputs.webhookName,
          description: inputs.description,
          trailId: inputs.trailId,
          method: inputs.method,
          url: inputs.url,
          enabled: inputs.enabled,
        });
      } else if (region) {
        return await api.createWebhook({
          regionId: region.id,
          name: inputs.webhookName,
          description: inputs.description,
          trailId: inputs.trailId,
          method: inputs.method,
          url: inputs.url,
          enabled: inputs.enabled,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['region', region?.id] });
    },
  });

  return result;
}
