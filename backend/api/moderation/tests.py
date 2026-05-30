from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.categories.models import Category
from api.users.roles import UserRole


User = get_user_model()


class CategoryModerationTests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            username="seller",
            password="pass12345",
            role=UserRole.SELLER,
        )
        self.admin = User.objects.create_user(
            username="admin",
            password="pass12345",
            role=UserRole.ADMIN,
        )
        self.pending = Category.objects.create(
            name="Custom",
            is_verified=False,
            created_by=self.seller,
        )
        self.list_url = reverse("moderation-categories-list")
        self.verify_url = reverse("moderation-categories-verify", args=[self.pending.id])
        self.reject_url = reverse("moderation-categories-reject", args=[self.pending.id])

    def test_admin_can_list_pending_categories(self):
        self.client.force_authenticate(self.admin)

        response = self.client.get(self.list_url, {"verified": "false"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data]
        self.assertIn("Custom", names)

    def test_admin_can_verify_category(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(self.verify_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pending.refresh_from_db()
        self.assertTrue(self.pending.is_verified)

    def test_admin_can_reject_category(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(self.reject_url, {"reason": "duplicate"})

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(id=self.pending.id).exists())

    def test_seller_cannot_access_category_moderation(self):
        self.client.force_authenticate(self.seller)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
