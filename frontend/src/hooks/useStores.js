import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';

export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const response = await apiEndpoints.getStores();
      return response.data;
    },
  });
}