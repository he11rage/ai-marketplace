from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.categories.models import Category
from api.products.models import Product
from api.stores.models import Store
from .models import CartItem


User = get_user_model()


class CartStockTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="buyer", password="pass12345")
        self.owner = User.objects.create_user(username="owner", password="pass12345")
        self.store = Store.objects.create(owner=self.owner, name="Owner Store")
        self.category = Category.objects.create(name="Electronics")
        self.product = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Phone",
            description="Test phone",
            price="100.00",
            stock_quantity=5,
            embedding=[0.0] * 1024,
        )
        self.list_url = reverse("cart-item-list")
        self.client.force_authenticate(self.user)

    def test_cannot_add_more_than_available_stock(self):
        response = self.client.post(
            self.list_url,
            {"product_id": self.product.id, "quantity": 6},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(CartItem.objects.exists())

    def test_repeated_add_checks_total_cart_quantity(self):
        first_response = self.client.post(
            self.list_url,
            {"product_id": self.product.id, "quantity": 3},
        )
        second_response = self.client.post(
            self.list_url,
            {"product_id": self.product.id, "quantity": 3},
        )

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CartItem.objects.get().quantity, 3)

    def test_cannot_update_quantity_above_available_stock(self):
        create_response = self.client.post(
            self.list_url,
            {"product_id": self.product.id, "quantity": 2},
        )
        detail_url = reverse("cart-item-detail", args=[create_response.data["id"]])

        response = self.client.patch(detail_url, {"quantity": 6})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CartItem.objects.get().quantity, 2)
