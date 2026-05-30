from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.users.roles import UserRole
from .models import Category


User = get_user_model()


class CategoryPermissionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="user", password="pass12345")
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
        self.category = Category.objects.create(name="Electronics")
        self.list_url = reverse("category-list")
        self.detail_url = reverse("category-detail", args=[self.category.id])

    def test_anonymous_user_can_read_verified_categories(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_anonymous_user_cannot_see_unverified_categories(self):
        Category.objects.create(name="Custom", is_verified=False)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_regular_user_cannot_create_category(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.list_url, {"name": "Books"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Category.objects.filter(name="Books").exists())

    def test_seller_can_create_unverified_category(self):
        self.client.force_authenticate(self.seller)

        response = self.client.post(self.list_url, {"name": "Books"})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        category = Category.objects.get(name="Books")
        self.assertFalse(category.is_verified)
        self.assertEqual(category.created_by_id, self.seller.id)
        self.assertFalse(response.data["is_verified"])

    def test_seller_sees_own_unverified_categories_in_list(self):
        custom = Category.objects.create(
            name="Custom",
            is_verified=False,
            created_by=self.seller,
        )
        self.client.force_authenticate(self.seller)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {item["id"] for item in response.data}
        self.assertIn(self.category.id, ids)
        self.assertIn(custom.id, ids)

    def test_regular_user_cannot_update_category(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(self.detail_url, {"name": "Phones"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, "Electronics")

    def test_admin_can_create_verified_category(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(self.list_url, {"name": "Books"})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        category = Category.objects.get(name="Books")
        self.assertTrue(category.is_verified)

    def test_admin_can_verify_category(self):
        category = Category.objects.create(
            name="Custom",
            is_verified=False,
            created_by=self.seller,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            reverse("category-detail", args=[category.id]),
            {"is_verified": True},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        category.refresh_from_db()
        self.assertTrue(category.is_verified)
