from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Store
from .serializers import StoreSerializer

class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    def get_queryset(self):
        return Store.objects.all()

    @action(detail=False, methods=['get'])
    def my_stores(self, request):
        if request.user.is_authenticated:
            my_stores = Store.objects.filter(owner=request.user)
            serializer = self.get_serializer(my_stores, many=True)
            return Response(serializer.data)
        return Response([])