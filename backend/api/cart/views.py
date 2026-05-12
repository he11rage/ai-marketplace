from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import CartItem, Cart
from .serializers import CartItemSerializer


class CartItemViewSet(viewsets.ModelViewSet):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user
                                       ).select_related('product', 'cart')

    def perform_create(self, serializer):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        serializer.save(cart=cart)

    @action(detail=False, methods=['post'])
    def update_selected(self, request):
        item_ids = request.data.get('item_ids', [])
        selected = request.data.get('selected', True)
        
        CartItem.objects.filter(
            id__in=item_ids,
            cart__user=request.user
        ).update(selected=selected)
        
        return Response({'status': 'updated'})

    @action(detail=False, methods=['post'])
    def toggle_all(self, request):
        select_all = request.data.get('select_all', True)
        
        CartItem.objects.filter(
            cart__user=request.user
        ).update(selected=select_all)
        
        return Response({'status': 'toggled'})
