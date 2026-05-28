from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.categories.models import Category
from api.products.models import Product
from api.reviews.models import Review
from api.stores.models import Store


User = get_user_model()


class ReportsApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="u1", password="pass1234")
        self.mod = User.objects.create_user(
            username="mod", password="pass1234", is_staff=True
        )
        owner = User.objects.create_user(username="owner2", password="pass1234")
        self.store = Store.objects.create(owner=owner, name="Store2", description="x")
        self.category = Category.objects.create(name="Cat2")
        self.product = Product.objects.create(
            store=self.store,
            category=self.category,
            name="P2",
            description="D",
            price=Decimal("10.00"),
            stock_quantity=10,
            rating=Decimal("0.0"),
            review_count=0,
            status=Product.STATUS_ACTIVE,
        )
        self.review = Review.objects.create(
            product=self.product,
            author=self.user,
            rating=5,
            text="t",
            status=Review.STATUS_APPROVED,
        )

    def test_create_report_requires_auth(self):
        url = reverse("report-list")
        resp = self.client.post(
            url,
            {"target_type": "product", "product": self.product.id, "reason": "spam"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_can_create_and_see_own_reports(self):
        self.client.force_authenticate(self.user)
        url = reverse("report-list")
        create = self.client.post(
            url,
            {
                "target_type": "review",
                "review": self.review.id,
                "reason": "spam",
                "description": "x",
            },
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)

        lst = self.client.get(url)
        self.assertEqual(lst.status_code, status.HTTP_200_OK)
        self.assertEqual(len(lst.data), 1)

    def test_moderator_can_resolve_report(self):
        self.client.force_authenticate(self.user)
        url = reverse("report-list")
        create = self.client.post(
            url,
            {
                "target_type": "store",
                "store": self.store.id,
                "reason": "abuse",
                "description": "x",
            },
            format="json",
        )
        report_id = create.data["id"]

        self.client.force_authenticate(self.mod)
        resolve = self.client.post(reverse("report-resolve", args=[report_id]), {"note": "handled"}, format="json")
        self.assertEqual(resolve.status_code, status.HTTP_200_OK)
        self.assertEqual(resolve.data["status"], "resolved")

