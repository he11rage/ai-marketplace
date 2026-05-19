import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiEndpoints } from '../api/axios';

export function useCart() {
  const queryClient = useQueryClient();
  const token = localStorage.getItem('access_token');

  const normalizeCartItem = (item) => {
    const product = item.product || {};

    return {
      ...product,
      id: product.id,
      cartItemId: item.id,
      quantity: item.quantity,
      selected: item.selected,
      oldPrice: product.old_price,
    };
  };

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiEndpoints.getCart().then(res => res.data.map(normalizeCartItem)),
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const invalidateCart = () => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  };

  const addMutation = useMutation({
    mutationFn: (product) => apiEndpoints.addToCart({
      product_id: product.id,
      quantity: product.quantity || 1,
    }),
    onSuccess: invalidateCart,
  });

  const updateMutation = useMutation({
    mutationFn: ({ cartItemId, quantity }) => (
      apiEndpoints.updateCartItem(cartItemId, { quantity })
    ),
    onSuccess: invalidateCart,
  });

  const removeMutation = useMutation({
    mutationFn: (cartItemId) => apiEndpoints.removeFromCart(cartItemId),
    onSuccess: invalidateCart,
  });

  const updateSelectedMutation = useMutation({
    mutationFn: ({ cartItemIds, selected }) => apiEndpoints.updateCartSelected({
      item_ids: cartItemIds,
      selected,
    }),
    onSuccess: invalidateCart,
  });

  const toggleAllMutation = useMutation({
    mutationFn: (selectAll) => apiEndpoints.toggleAllCart({ select_all: selectAll }),
    onSuccess: invalidateCart,
  });

  const checkoutMutation = useMutation({
    mutationFn: (data) => apiEndpoints.createOrder(data),
    onSuccess: () => {
      invalidateCart();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const addToCart = (product) => {
    if (!token) {
      window.location.href = '/login';
      return;
    }

    addMutation.mutate(product);
  };

  const removeFromCart = (productId) => {
    const item = items.find(cartItem => cartItem.id === productId);
    if (item?.cartItemId) {
      removeMutation.mutate(item.cartItemId);
    }
  };

  const updateQuantity = (productId, delta) => {
    const item = items.find(cartItem => cartItem.id === productId);
    if (!item?.cartItemId) return;

    const quantity = Math.max(1, item.quantity + delta);
    updateMutation.mutate({ cartItemId: item.cartItemId, quantity });
  };

  const updateSelected = (productId, selected) => {
    const item = items.find(cartItem => cartItem.id === productId);
    if (!item?.cartItemId) return;

    updateSelectedMutation.mutate({ cartItemIds: [item.cartItemId], selected });
  };

  const toggleAll = (selectAll) => {
    toggleAllMutation.mutate(selectAll);
  };

  const checkout = (data, options) => {
    checkoutMutation.mutate(data, options);
  };

  const clearCart = () => {
    items.forEach(item => {
      if (item.cartItemId) {
        removeMutation.mutate(item.cartItemId);
      }
    });
  };

  const selectedItems = items.filter(item => item.selected);
  const total = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const selectedTotal = selectedItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const count = items.length;
  const selectedCount = selectedItems.length;
  const allSelected = items.length > 0 && selectedCount === items.length;

  return {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateSelected,
    toggleAll,
    checkout,
    clearCart,
    total,
    selectedTotal,
    count,
    selectedCount,
    allSelected,
    isLoading,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isRemoving: removeMutation.isPending,
    isSelectionUpdating: updateSelectedMutation.isPending || toggleAllMutation.isPending,
    isCheckingOut: checkoutMutation.isPending,
  };
}