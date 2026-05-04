from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import CartItem, Cart
from .serializers import CartItemSerializer


class CartItemViewSet(viewsets.ModelViewSet):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user).select_related(
            "product", "cart"
        )

    def perform_create(self, serializer):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        serializer.save(cart=cart)

    def perform_update(self, serializer):
        instance = self.get_object()
        serializer.save(cart=instance.cart)
