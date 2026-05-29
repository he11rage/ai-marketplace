from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from api.users.roles import UserRole

User = get_user_model()


class UserRoleModelTests(TestCase):
    def test_admin_role_syncs_is_admin(self):
        user = User.objects.create_user(username="admin_user", password="pass1234", role=UserRole.ADMIN)
        self.assertEqual(user.role, UserRole.ADMIN)
        self.assertTrue(user.is_admin)

    def test_buyer_role_clears_is_admin(self):
        user = User.objects.create_user(
            username="buyer_user",
            password="pass1234",
            role=UserRole.ADMIN,
        )
        user.role = UserRole.BUYER
        user.save()
        user.refresh_from_db()
        self.assertEqual(user.role, UserRole.BUYER)
        self.assertFalse(user.is_admin)


class UserRegistrationRoleTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_as_buyer_by_default(self):
        response = self.client.post(
            "/auth/users/",
            {"username": "new_buyer", "password": "Str0ngPass!234", "email": "buyer@test.com"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(username="new_buyer")
        self.assertEqual(user.role, UserRole.BUYER)

    def test_register_as_seller(self):
        response = self.client.post(
            "/auth/users/",
            {
                "username": "new_seller",
                "password": "Str0ngPass!234",
                "email": "seller@test.com",
                "role": UserRole.SELLER,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(username="new_seller")
        self.assertEqual(user.role, UserRole.SELLER)

    def test_cannot_register_as_admin(self):
        response = self.client.post(
            "/auth/users/",
            {
                "username": "fake_admin",
                "password": "Str0ngPass!234",
                "email": "admin@test.com",
                "role": UserRole.ADMIN,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
