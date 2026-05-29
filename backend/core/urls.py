"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.apps import apps
from django.contrib import admin
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from drf_spectacular.utils import OpenApiResponse, extend_schema
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

MY_APPS = ["users", "stores", "products", "orders", "categories", "cart", "reviews", "ai_chat"]

for app_label in MY_APPS:
    app_config = apps.get_app_config(app_label)
    for model in app_config.get_models():
        try:
            admin.site.register(model)
        except admin.sites.AlreadyRegistered:
            pass


@extend_schema(
    tags=["api"],
    responses={
        200: OpenApiResponse(description="Links to main API resources."),
    },
)
@api_view(["GET"])
def api_root(request, format=None):
    return Response({
        "products": reverse("product-list", request=request, format=format),
        "stores": reverse("store-list", request=request, format=format),
        "category": reverse("category-list", request=request, format=format),
        "cart": reverse("cart-item-list", request=request, format=format),
        "orders": reverse("order-list", request=request, format=format),
        "auth": request.build_absolute_uri("/auth/"), 
    })


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("api/", api_root),
    path("api/", include("api.products.urls")),
    path("api/stores/", include("api.stores.urls")),
    path("api/cart/", include("api.cart.urls")),
    path("api/categories/", include("api.categories.urls")),
    path('api/orders/', include('api.orders.urls')),
    path("api/reviews/", include("api.reviews.urls")),
    path("api/reports/", include("api.reports.urls")),
    path('api/ai/', include('api.ai_chat.urls')),
    path("api/moderation/", include("api.moderation.urls")),
    path("api/seller/", include("api.seller.urls")),
    path("auth/", include("djoser.urls")),
    path("auth/", include("djoser.urls.jwt")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
