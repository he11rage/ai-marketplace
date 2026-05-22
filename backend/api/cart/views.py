from rest_framework import serializers, viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from .models import CartItem, Cart
from .serializers import CartItemSerializer


@extend_schema_view(
    list=extend_schema(tags=["cart"]),
    retrieve=extend_schema(tags=["cart"]),
    create=extend_schema(tags=["cart"]),
    update=extend_schema(tags=["cart"]),
    partial_update=extend_schema(tags=["cart"]),
    destroy=extend_schema(tags=["cart"]),
    update_selected=extend_schema(
        tags=["cart"],
        request=inline_serializer(
            name="CartUpdateSelectedRequest",
            fields={
                "item_ids": serializers.ListField(child=serializers.IntegerField(), help_text="Cart item ids."),
                "selected": serializers.BooleanField(default=True),
            },
        ),
        responses=inline_serializer(
            name="CartUpdateSelectedResponse",
            fields={"status": serializers.CharField(default="updated")},
        ),
    ),
    toggle_all=extend_schema(
        tags=["cart"],
        request=inline_serializer(
            name="CartToggleAllRequest",
            fields={"select_all": serializers.BooleanField(default=True)},
        ),
        responses=inline_serializer(
            name="CartToggleAllResponse",
            fields={"status": serializers.CharField(default="toggled")},
        ),
    ),
)
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

    def create(self, request, *args, **kwargs):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = serializer.validated_data['product']
        quantity = serializer.validated_data.get('quantity', 1)
        selected = serializer.validated_data.get('selected', True)

        existing_items = CartItem.objects.filter(cart=cart, product=product).order_by('id')
        cart_item = existing_items.first()
        created = cart_item is None

        if created:
            cart_item = CartItem.objects.create(
                cart=cart,
                product=product,
                quantity=quantity,
                selected=selected
            )
        else:
            duplicate_quantity = sum(item.quantity for item in existing_items[1:])
            existing_items.exclude(id=cart_item.id).delete()
            cart_item.quantity += quantity + duplicate_quantity
            cart_item.selected = selected
            cart_item.save(update_fields=['quantity', 'selected'])

        response_serializer = self.get_serializer(cart_item)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

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
