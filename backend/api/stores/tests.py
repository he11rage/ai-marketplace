from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.categories.models import Category
from api.orders.models import Order, OrderItem
from api.products.models import Product
from api.users.roles import UserRole
from .models import Store


User = get_user_model()


class StorePermissionTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner", password="pass12345", role=UserRole.SELLER
        )
        self.other_user = User.objects.create_user(username="other", password="pass12345")
        self.admin = User.objects.create_user(
            username="admin",
            password="pass12345",
            role=UserRole.ADMIN,
        )
        self.store = Store.objects.create(owner=self.owner, name="Owner Store")
        self.detail_url = reverse("store-detail", args=[self.store.id])

    def test_owner_can_update_own_store(self):
        self.client.force_authenticate(self.owner)

        response = self.client.patch(self.detail_url, {"name": "Updated Store"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.store.refresh_from_db()
        self.assertEqual(self.store.name, "Updated Store")

    def test_regular_user_cannot_update_someone_elses_store(self):
        self.client.force_authenticate(self.other_user)

        response = self.client.patch(self.detail_url, {"name": "Hijacked Store"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.store.refresh_from_db()
        self.assertEqual(self.store.name, "Owner Store")

    def test_admin_can_update_any_store(self):
        self.client.force_authenticate(self.admin)

        response = self.client.patch(self.detail_url, {"name": "Admin Updated Store"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.store.refresh_from_db()
        self.assertEqual(self.store.name, "Admin Updated Store")


class StoreStatusTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner-status", password="pass12345", role=UserRole.SELLER
        )
        self.list_url = reverse("store-list")

    def test_store_defaults_to_pending_moderation(self):
        store = Store.objects.create(owner=self.owner, name="New Store")

        self.assertEqual(store.status, Store.STATUS_PENDING_MODERATION)

    def test_store_status_choices_match_moderation_states(self):
        self.assertEqual(
            [choice for choice, _ in Store.STATUS_CHOICES],
            [
                Store.STATUS_PENDING_MODERATION,
                Store.STATUS_ACTIVE,
                Store.STATUS_LIMITED,
                Store.STATUS_BLOCKED,
                Store.STATUS_REJECTED,
            ],
        )

    def test_api_create_sets_pending_moderation_status(self):
        self.client.force_authenticate(self.owner)

        response = self.client.post(
            self.list_url,
            {
                "name": "New Store",
                "description": "Store waiting for moderation",
                "status": Store.STATUS_ACTIVE,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        store = Store.objects.get(id=response.data["id"])
        self.assertEqual(store.status, Store.STATUS_PENDING_MODERATION)
        self.assertEqual(response.data["status"], Store.STATUS_PENDING_MODERATION)


class StoreCatalogVisibilityTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner-visibility", password="pass12345", role=UserRole.SELLER
        )
        self.other_user = User.objects.create_user(username="other-visibility", password="pass12345")
        self.admin = User.objects.create_user(
            username="admin-visibility",
            password="pass12345",
            role=UserRole.ADMIN,
        )
        self.active_store = Store.objects.create(
            owner=self.owner, name="Active Store", status=Store.STATUS_ACTIVE
        )
        self.pending_store = Store.objects.create(
            owner=self.owner, name="Pending Store", status=Store.STATUS_PENDING_MODERATION
        )
        self.list_url = reverse("store-list")
        self.active_detail_url = reverse("store-detail", args=[self.active_store.id])
        self.pending_detail_url = reverse("store-detail", args=[self.pending_store.id])

    def test_public_store_list_excludes_pending_moderation(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        store_ids = {item["id"] for item in response.data}
        self.assertIn(self.active_store.id, store_ids)
        self.assertNotIn(self.pending_store.id, store_ids)

    def test_anonymous_cannot_retrieve_pending_store(self):
        response = self.client.get(self.pending_detail_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_retrieve_pending_store(self):
        self.client.force_authenticate(self.owner)

        response = self.client.get(self.pending_detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.pending_store.id)

    def test_admin_can_retrieve_pending_store(self):
        self.client.force_authenticate(self.admin)

        response = self.client.get(self.pending_detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.pending_store.id)

    def test_anonymous_can_retrieve_active_store(self):
        response = self.client.get(self.active_detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.active_store.id)


class StoreTotalSalesTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner-sales",
            password="pass12345",
            role=UserRole.SELLER,
        )
        self.buyer = User.objects.create_user(
            username="buyer-sales",
            password="pass12345",
            role=UserRole.BUYER,
        )
        self.store = Store.objects.create(
            owner=self.owner,
            name="Sales Store",
            status=Store.STATUS_ACTIVE,
        )
        self.category = Category.objects.create(name="Sales Category")
        self.product = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Sales Product",
            description="Product for sales count",
            price=Decimal("100.00"),
            stock_quantity=10,
            status=Product.STATUS_ACTIVE,
            embedding=[0.0] * 1024,
        )
        self.detail_url = reverse("store-detail", args=[self.store.id])

    def _create_order(self, order_status, quantity):
        order = Order.objects.create(
            buyer=self.buyer,
            total_amount=Decimal("100.00") * quantity,
            status=order_status,
            delivery_address="Test address",
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=quantity,
            price=Decimal("100.00"),
        )

    def test_store_detail_includes_total_sales_from_paid_orders(self):
        self._create_order(Order.STATUS_PAID, quantity=2)
        self._create_order(Order.STATUS_DELIVERED, quantity=3)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_sales"], 5)

    def test_cancelled_and_unpaid_orders_are_not_counted(self):
        self._create_order(Order.STATUS_PAID, quantity=2)
        self._create_order(Order.STATUS_CREATED, quantity=10)
        self._create_order(Order.STATUS_CANCELLED, quantity=7)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_sales"], 2)
