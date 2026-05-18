import { useQuery } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';

export function useProducts(filters = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const response = await apiEndpoints.getProducts();
      return response.data;
    },
  });
}

export function useProduct(id) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await apiEndpoints.getProduct(id);
      return response.data;
    },
    enabled: !!id,
  });
}