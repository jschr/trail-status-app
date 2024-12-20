import { useMutation } from '@tanstack/react-query';
import api from '@/api';

export function useRunWebhook(webhookId?: string) {
  const result = useMutation({
    mutationFn: async () => {
      if (webhookId) {
        await api.runWebhook(webhookId);
      }
    },
  });

  return result;
}
