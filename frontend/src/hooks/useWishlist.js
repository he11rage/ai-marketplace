import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';

export function useWishlist() {
    const queryClient = useQueryClient();
    
    const token = localStorage.getItem('access_token');
    const wishlistQueryKey = ['wishlist', token];

    const normalizeWishlistItem = (item) => {
        const normalizedProduct = item.product || (item.product_id ? {
            id: item.product_id,
            name: item.product_name,
            price: item.product_price,
            image: item.product_image,
        } : null);

        return {
            ...item,
            product: normalizedProduct,
            productId: normalizedProduct?.id ?? item.product_id,
        };
    };

    const { data: items = [], isLoading } = useQuery({
        queryKey: wishlistQueryKey,
        queryFn: () => apiEndpoints.getWishlist().then(res => (res.data || []).map(normalizeWishlistItem)),
        enabled: !!token,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

    const addMutation = useMutation({
        mutationFn: (productId) => apiEndpoints.addToWishlist({ product: productId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
        },
        onError: (error) => {
            if (error.response?.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/';
            }
        },
    });

    const removeMutation = useMutation({
        mutationFn: (id) => apiEndpoints.removeFromWishlist(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
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
        if (!token) {
            window.location.href = '/login';
            return;
        }
        
        const existing = items.find(i => i.productId === product.id || i.product?.id === product.id);
        if (existing) {
            removeMutation.mutate(existing.id);
        } else {
            addMutation.mutate(product.id);
        }
    };

    const isInWishlist = (productId) => {
        return items.some(i => i.productId === productId || i.product?.id === productId);
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