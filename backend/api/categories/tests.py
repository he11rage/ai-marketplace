from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Category


User = get_user_model()


class CategoryPermissionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="user", password="pass12345")
        self.admin = User.objects.create_user(
            username="admin",
            password="pass12345",
            is_admin=True,
        )
        self.category = Category.objects.create(name="Electronics")
        self.list_url = reverse("category-list")
        self.detail_url = reverse("category-detail", args=[self.category.id])

    def test_anonymous_user_can_read_categories(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_regular_user_cannot_create_category(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.list_url, {"name": "Books"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Category.objects.filter(name="Books").exists())

    def test_regular_user_cannot_update_category(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(self.detail_url, {"name": "Phones"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, "Electronics")

    def test_admin_can_create_category(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(self.list_url, {"name": "Books"})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Category.objects.filter(name="Books").exists())
