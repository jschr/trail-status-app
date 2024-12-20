import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { Region } from '@/api';

export function useDeleteWebhook(region?: Region) {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationFn: async (webhookId: string) => {
      if (!region) return;

      await api.deleteWebhook(webhookId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['region', region?.id] });
    },
  });

  return result;
}
