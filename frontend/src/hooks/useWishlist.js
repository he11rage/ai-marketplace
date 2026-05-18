import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';

export function useWishlist() {
    const queryClient = useQueryClient();
    
    // 🔍 Проверяем наличие токена
    const token = localStorage.getItem('access_token');

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['wishlist'],
        queryFn: () => apiEndpoints.getWishlist().then(res => res.data),
        enabled: !!token,  // 👈 Запрашиваем ТОЛЬКО если есть токен
        staleTime: 1000 * 60 * 5,
        retry: false,  // 👈 Не повторять запрос при ошибке 401
    });

    const addMutation = useMutation({
        mutationFn: (productId) => apiEndpoints.addToWishlist({ product: productId }),
        enabled: !!token,  // 👈 Мутация только с токеном
        onSuccess: () => {
            queryClient.invalidateQueries(['wishlist']);
        },
        onError: (error) => {
            if (error.response?.status === 401) {
                // Если 401 — чистим токены и редирект на главную
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/';
            }
        },
    });

    const removeMutation = useMutation({
        mutationFn: (id) => apiEndpoints.removeFromWishlist(id),
        enabled: !!token,  // 👈 Мутация только с токеном
        onSuccess: () => {
            queryClient.invalidateQueries(['wishlist']);
        },
        onError: (error) => {
            if (error.response?.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/';
            }
        },
    });

    const toggle = (product) => {
        // 🔴 Если нет токена — не делаем ничего (или можно показать модалку "войдите")
        if (!token) {
            window.location.href = '/login';
            return;
        }
        
        const existing = items.find(i => i.product?.id === product.id);
        if (existing) {
            removeMutation.mutate(existing.id);
        } else {
            addMutation.mutate(product.id);
        }
    };

    const isInWishlist = (productId) => {
        return items.some(i => i.product?.id === productId);
    };

    const removeFromWishlist = (id) => {
        if (!token) return;
        removeMutation.mutate(id);
    };

    return {
        items,
        toggle,
        isInWishlist,
        removeFromWishlist,
        isLoading,
        isAdding: addMutation.isLoading,
        isRemoving: removeMutation.isLoading,
    };
}