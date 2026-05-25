from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.categories.models import Category
from api.products.models import Product
from api.stores.models import Store


User = get_user_model()


class ProductStatusTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="pass12345")
        self.store = Store.objects.create(owner=self.owner, name="Owner Store")
        self.category = Category.objects.create(name="Electronics")
        self.list_url = reverse("product-list")

    def test_product_defaults_to_pending_moderation(self):
        product = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Phone",
            description="Test phone",
            price="100.00",
            stock_quantity=5,
            embedding=[0.0] * 1024,
        )

        self.assertEqual(product.status, Product.STATUS_PENDING_MODERATION)

    @patch("api.products.models.get_embedding", return_value=[0.0] * 1024)
    def test_api_create_sets_pending_moderation_status(self, get_embedding_mock):
        self.client.force_authenticate(self.owner)

        response = self.client.post(
            self.list_url,
            {
                "store": self.store.id,
                "category": self.category.id,
                "name": "Phone",
                "description": "Test phone",
                "price": "100.00",
                "stock_quantity": 5,
                "status": Product.STATUS_ACTIVE,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product = Product.objects.get(id=response.data["id"])
        self.assertEqual(product.status, Product.STATUS_PENDING_MODERATION)
        self.assertEqual(response.data["status"], Product.STATUS_PENDING_MODERATION)
        get_embedding_mock.assert_called_once()
