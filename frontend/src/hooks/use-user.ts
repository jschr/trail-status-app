import { useQuery } from '@tanstack/react-query';
import api from '@/api';

export function useUser() {
  const result = useQuery({
    queryKey: ['user'],
    queryFn: () => api.getUser(),
  });

  return result;
}
