from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.orders.models import Order, OrderItem
from api.products.models import Product
from api.stores.models import Store
from api.categories.models import Category


User = get_user_model()


class ReviewApiTests(APITestCase):
    def setUp(self):
        self.buyer = User.objects.create_user(username="buyer", password="pass1234")
        self.other = User.objects.create_user(username="other", password="pass1234")
        self.moderator = User.objects.create_user(
            username="moderator", password="pass1234", is_staff=True
        )

        store_owner = User.objects.create_user(username="owner", password="pass1234")
        store = Store.objects.create(owner=store_owner, name="Store", description="x")
        category = Category.objects.create(name="Cat")
        self.product = Product.objects.create(
            store=store,
            category=category,
            name="P",
            description="D",
            price=Decimal("10.00"),
            stock_quantity=10,
            rating=Decimal("0.0"),
            review_count=0,
            status=Product.STATUS_ACTIVE,
        )

    def test_create_review_requires_auth(self):
        url = reverse("review-list")
        resp = self.client.post(url, {"product": self.product.id, "rating": 5, "text": "ok"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_review_requires_successful_purchase(self):
        self.client.force_authenticate(self.buyer)
        url = reverse("review-list")
        resp = self.client.post(url, {"product": self.product.id, "rating": 5, "text": "ok"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("product", resp.data)

    def test_create_review_after_paid_order(self):
        order = Order.objects.create(
            buyer=self.buyer,
            total_amount=Decimal("10.00"),
            status=Order.STATUS_PAID,
            payment_method="card",
            delivery_address="addr",
        )
        OrderItem.objects.create(order=order, product=self.product, quantity=1, price=Decimal("10.00"))

        self.client.force_authenticate(self.buyer)
        url = reverse("review-list")
        resp = self.client.post(url, {"product": self.product.id, "rating": 4, "text": "nice"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        review_id = resp.data["id"]

        # Unique constraint: one per product per author.
        resp2 = self.client.post(url, {"product": self.product.id, "rating": 5, "text": "again"}, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

        self.product.refresh_from_db()
        # New reviews start with pending_moderation => stats shouldn't include them yet.
        self.assertEqual(self.product.review_count, 0)
        self.assertEqual(str(self.product.rating), "0.0")

        # Approve review => stats should be updated.
        self.client.force_authenticate(self.moderator)
        approve = self.client.post(
            reverse("review-moderation-approve", args=[review_id]),
            {"note": "ok"},
            format="json",
        )
        self.assertEqual(approve.status_code, status.HTTP_200_OK)

        # Store stats should be updated based on real reviews.
        store = self.product.store
        store.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.product.review_count, 1)
        self.assertEqual(str(self.product.rating), "4.0")
        self.assertEqual(store.review_count, 1)
        self.assertEqual(str(store.rating), "4.0")

    def test_delete_only_own_review(self):
        order = Order.objects.create(
            buyer=self.buyer,
            total_amount=Decimal("10.00"),
            status=Order.STATUS_PAID,
            payment_method="card",
            delivery_address="addr",
        )
        OrderItem.objects.create(order=order, product=self.product, quantity=1, price=Decimal("10.00"))

        self.client.force_authenticate(self.buyer)
        create = self.client.post(
            reverse("review-list"),
            {"product": self.product.id, "rating": 5, "text": "ok"},
            format="json",
        )
        review_id = create.data["id"]

        # Approve review so it's visible to other users too (otherwise they'd get 404).
        self.client.force_authenticate(self.moderator)
        approve = self.client.post(
            reverse("review-moderation-approve", args=[review_id]),
            {"note": "ok"},
            format="json",
        )
        self.assertEqual(approve.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.other)
        del_resp = self.client.delete(reverse("review-detail", args=[review_id]))
        self.assertEqual(del_resp.status_code, status.HTTP_403_FORBIDDEN)

