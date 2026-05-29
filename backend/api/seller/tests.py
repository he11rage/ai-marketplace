from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.categories.models import Category
from api.orders.models import Order, OrderItem
from api.products.models import Product
from api.reviews.models import Review
from api.stores.models import Store
from api.users.roles import UserRole


User = get_user_model()


class SellerCabinetTests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            username="seller1",
            password="pass12345",
            role=UserRole.SELLER,
        )
        self.buyer = User.objects.create_user(
            username="buyer1",
            password="pass12345",
            role=UserRole.BUYER,
        )
        self.other_seller = User.objects.create_user(
            username="seller2",
            password="pass12345",
            role=UserRole.SELLER,
        )
        self.store = Store.objects.create(
            owner=self.seller,
            name="Seller Store",
            status=Store.STATUS_ACTIVE,
        )
        self.other_store = Store.objects.create(
            owner=self.other_seller,
            name="Other Store",
            status=Store.STATUS_ACTIVE,
        )
        self.category = Category.objects.create(name="Gadgets")
        self.product = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Draft Phone",
            description="Draft",
            price="100.00",
            stock_quantity=3,
            status=Product.STATUS_DRAFT,
            embedding=[0.0] * 1024,
        )
        self.active_product = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Active Phone",
            description="Active",
            price="200.00",
            stock_quantity=5,
            status=Product.STATUS_ACTIVE,
            embedding=[0.0] * 1024,
        )

    def test_seller_lists_own_products(self):
        self.client.force_authenticate(self.seller)
        response = self.client.get(reverse("seller-products-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = {item["name"] for item in response.data}
        self.assertIn("Draft Phone", names)
        self.assertIn("Active Phone", names)

    def test_seller_filters_drafts(self):
        self.client.force_authenticate(self.seller)
        response = self.client.get(reverse("seller-products-list"), {"status": "draft"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["status"], Product.STATUS_DRAFT)

    def test_seller_submits_draft(self):
        self.client.force_authenticate(self.seller)
        url = reverse("seller-products-submit", kwargs={"pk": self.product.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.status, Product.STATUS_PENDING_MODERATION)

    def test_seller_archives_and_restores_product(self):
        self.client.force_authenticate(self.seller)
        archive_url = reverse("seller-products-archive", kwargs={"pk": self.active_product.id})
        archive_resp = self.client.post(archive_url)
        self.assertEqual(archive_resp.status_code, status.HTTP_200_OK)
        self.active_product.refresh_from_db()
        self.assertEqual(self.active_product.status, Product.STATUS_ARCHIVED)

        restore_url = reverse("seller-products-restore", kwargs={"pk": self.active_product.id})
        restore_resp = self.client.post(restore_url)
        self.assertEqual(restore_resp.status_code, status.HTTP_200_OK)
        self.active_product.refresh_from_db()
        self.assertEqual(self.active_product.status, Product.STATUS_ACTIVE)

    def test_seller_lists_orders_with_own_items(self):
        order = Order.objects.create(
            buyer=self.buyer,
            total_amount="200.00",
            status=Order.STATUS_PAID,
            delivery_address="Test address",
        )
        OrderItem.objects.create(
            order=order,
            product=self.active_product,
            quantity=1,
            price="200.00",
        )
        OrderItem.objects.create(
            order=order,
            product=Product.objects.create(
                store=self.other_store,
                category=self.category,
                name="Other item",
                description="Other",
                price="50.00",
                stock_quantity=1,
                status=Product.STATUS_ACTIVE,
                embedding=[0.0] * 1024,
            ),
            quantity=1,
            price="50.00",
        )

        self.client.force_authenticate(self.seller)
        response = self.client.get(reverse("seller-orders-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(len(response.data[0]["items"]), 1)
        self.assertEqual(response.data[0]["items"][0]["product_name"], "Active Phone")

    def test_seller_updates_order_status(self):
        order = Order.objects.create(
            buyer=self.buyer,
            total_amount="200.00",
            status=Order.STATUS_PAID,
            delivery_address="Test address",
        )
        OrderItem.objects.create(
            order=order,
            product=self.active_product,
            quantity=1,
            price="200.00",
        )

        self.client.force_authenticate(self.seller)
        url = reverse("seller-orders-set-status", kwargs={"pk": order.id})
        response = self.client.post(url, {"status": Order.STATUS_PROCESSING}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_PROCESSING)

    def test_seller_edit_active_product_goes_to_pending_moderation(self):
        self.client.force_authenticate(self.seller)
        url = reverse("seller-products-detail", kwargs={"pk": self.active_product.id})
        response = self.client.patch(url, {"name": "Active Phone v2"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Product.STATUS_PENDING_MODERATION)
        self.active_product.refresh_from_db()
        self.assertEqual(self.active_product.status, Product.STATUS_PENDING_MODERATION)
        self.assertEqual(self.active_product.name, "Active Phone v2")
        self.assertIsNone(self.active_product.moderated_by)
        self.assertEqual(self.active_product.moderation_reason, "")

    def test_seller_edit_draft_keeps_draft_status(self):
        self.client.force_authenticate(self.seller)
        url = reverse("seller-products-detail", kwargs={"pk": self.product.id})
        response = self.client.patch(url, {"name": "Draft Phone v2"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.status, Product.STATUS_DRAFT)

    @patch("api.products.models.get_embedding", return_value=[0.0] * 1024)
    def test_seller_creates_draft_product(self, _embedding_mock):
        self.client.force_authenticate(self.seller)
        response = self.client.post(
            reverse("seller-products-list"),
            {
                "store": self.store.id,
                "category": self.category.id,
                "name": "New Draft",
                "description": "Desc",
                "price": "99.00",
                "stock_quantity": 1,
                "save_as_draft": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Product.STATUS_DRAFT)

    def test_non_seller_denied(self):
        self.client.force_authenticate(self.buyer)
        response = self.client.get(reverse("seller-products-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SellerAnalyticsTests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            username="analytics_seller",
            password="pass12345",
            role=UserRole.SELLER,
        )
        self.buyer = User.objects.create_user(
            username="analytics_buyer",
            password="pass12345",
            role=UserRole.BUYER,
        )
        self.store = Store.objects.create(
            owner=self.seller,
            name="Analytics Store",
            status=Store.STATUS_ACTIVE,
            is_verified=True,
            rating="4.5",
            review_count=2,
        )
        self.category = Category.objects.create(name="Analytics Cat")
        self.low_stock_product = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Low Stock Item",
            description="Low",
            price="50.00",
            stock_quantity=2,
            status=Product.STATUS_ACTIVE,
            embedding=[0.0] * 1024,
        )
        self.top_product = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Top Seller",
            description="Top",
            price="100.00",
            stock_quantity=20,
            status=Product.STATUS_ACTIVE,
            embedding=[0.0] * 1024,
        )

    def _create_confirmed_order(self, product, quantity, price):
        order = Order.objects.create(
            buyer=self.buyer,
            total_amount=str(Decimal(price) * quantity),
            status=Order.STATUS_DELIVERED,
            delivery_address="Addr",
        )
        order.created_at = timezone.now() - timedelta(days=2)
        order.save(update_fields=["created_at"])
        OrderItem.objects.create(
            order=order,
            product=product,
            quantity=quantity,
            price=price,
        )
        return order

    def test_analytics_overview_returns_sales(self):
        self._create_confirmed_order(self.top_product, 3, "100.00")
        self.client.force_authenticate(self.seller)
        response = self.client.get(reverse("seller-analytics-overview"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["units_sold"], 3)
        self.assertEqual(response.data["total_revenue"], "300.00")
        self.assertGreaterEqual(response.data["orders_total"], 1)
        self.assertEqual(len(response.data["sales_by_day"]), 14)

    def test_analytics_products_top_by_revenue(self):
        self._create_confirmed_order(self.top_product, 2, "100.00")
        self._create_confirmed_order(self.low_stock_product, 1, "50.00")
        self.client.force_authenticate(self.seller)
        response = self.client.get(reverse("seller-analytics-products"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        top = response.data["top_by_revenue"]
        self.assertGreaterEqual(len(top), 2)
        self.assertEqual(top[0]["name"], "Top Seller")
        self.assertEqual(top[0]["units_sold"], 2)

    def test_analytics_low_stock_lists_items(self):
        self.client.force_authenticate(self.seller)
        response = self.client.get(reverse("seller-analytics-low-stock"), {"threshold": 5})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)
        names = {item["name"] for item in response.data["items"]}
        self.assertIn("Low Stock Item", names)

    def test_analytics_quality_per_store(self):
        Review.objects.create(
            product=self.top_product,
            author=self.buyer,
            rating=5,
            text="Great",
            status=Review.STATUS_APPROVED,
        )
        self.client.force_authenticate(self.seller)
        response = self.client.get(reverse("seller-analytics-quality"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["stores"]), 1)
        store_data = response.data["stores"][0]
        self.assertEqual(store_data["store_name"], "Analytics Store")
        self.assertIn("quality_score", store_data)
        self.assertGreaterEqual(store_data["quality_score"], 50)

    def test_analytics_denied_for_buyer(self):
        self.client.force_authenticate(self.buyer)
        response = self.client.get(reverse("seller-analytics-overview"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
