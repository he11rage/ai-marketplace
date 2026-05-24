from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.cart.models import Cart, CartItem
from api.categories.models import Category
from api.orders.models import Order, OrderItem
from api.products.models import Product
from api.stores.models import Store


User = get_user_model()


class OrderStockLockTests(APITestCase):
    def setUp(self):
        self.buyer = User.objects.create_user(username="buyer", password="pass12345")
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
        self.cart = Cart.objects.create(user=self.buyer)
        self.list_url = reverse("order-list")
        self.client.force_authenticate(self.buyer)

    def test_checkout_locks_product_rows_and_decreases_stock(self):
        CartItem.objects.create(cart=self.cart, product=self.product, quantity=2)

        with CaptureQueriesContext(connection) as queries:
            response = self.client.post(
                self.list_url,
                {"delivery_address": "Moscow, Test street 1", "payment_method": "card"},
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            any("FOR UPDATE" in query["sql"].upper() for query in queries),
            "Checkout must lock product rows with SELECT FOR UPDATE.",
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 3)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderItem.objects.get().quantity, 2)
        self.assertFalse(CartItem.objects.filter(cart=self.cart).exists())

    def test_checkout_rejects_order_when_locked_stock_is_not_enough(self):
        CartItem.objects.create(cart=self.cart, product=self.product, quantity=6)

        response = self.client.post(
            self.list_url,
            {"delivery_address": "Moscow, Test street 1", "payment_method": "card"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 5)
        self.assertFalse(Order.objects.exists())
        self.assertTrue(CartItem.objects.filter(cart=self.cart).exists())

    def test_checkout_rejects_order_when_product_is_out_of_stock(self):
        CartItem.objects.create(cart=self.cart, product=self.product, quantity=1)
        self.product.stock_quantity = 0
        self.product.save(update_fields=["stock_quantity"])

        response = self.client.post(
            self.list_url,
            {"delivery_address": "Moscow, Test street 1", "payment_method": "card"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 0)
        self.assertFalse(Order.objects.exists())
        self.assertTrue(CartItem.objects.filter(cart=self.cart).exists())

    def test_cancel_order_locks_rows_and_returns_stock_once(self):
        CartItem.objects.create(cart=self.cart, product=self.product, quantity=2)
        create_response = self.client.post(
            self.list_url,
            {"delivery_address": "Moscow, Test street 1", "payment_method": "card"},
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(id=create_response.data["id"])
        cancel_url = reverse("order-cancel", args=[order.id])

        with CaptureQueriesContext(connection) as queries:
            cancel_response = self.client.post(cancel_url)

        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            any("FOR UPDATE" in query["sql"].upper() for query in queries),
            "Cancellation must lock order and product rows with SELECT FOR UPDATE.",
        )
        order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(order.status, "cancelled")
        self.assertEqual(self.product.stock_quantity, 5)

        second_cancel_response = self.client.post(cancel_url)

        self.assertEqual(second_cancel_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 5)
