from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Store


User = get_user_model()


class StorePermissionTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="pass12345")
        self.other_user = User.objects.create_user(username="other", password="pass12345")
        self.admin = User.objects.create_user(
            username="admin",
            password="pass12345",
            is_admin=True,
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
        self.owner = User.objects.create_user(username="owner-status", password="pass12345")
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
