import json
import re
from datetime import datetime

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.categories.models import Category
from api.moderation.audit_export import format_audit_export_filename
from api.moderation.models import AdminActionLog
from api.products.models import Product
from api.stores.models import Store
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


class ProductModerationTests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            username="product_seller",
            password="pass12345",
            role=UserRole.SELLER,
        )
        self.admin = User.objects.create_user(
            username="product_admin",
            password="pass12345",
            role=UserRole.ADMIN,
        )
        self.store = Store.objects.create(
            owner=self.seller,
            name="Test Store",
            status=Store.STATUS_ACTIVE,
        )
        self.verified_category = Category.objects.create(name="Verified", is_verified=True)
        self.pending_category = Category.objects.create(
            name="Custom Pending",
            is_verified=False,
            created_by=self.seller,
        )
        self.product_with_pending_category = Product.objects.create(
            store=self.store,
            category=self.pending_category,
            name="Gadget",
            description="Needs category first",
            price="99.00",
            stock_quantity=1,
            embedding=[0.0] * 1024,
        )
        self.set_status_url = reverse(
            "moderation-products-set-status",
            args=[self.product_with_pending_category.id],
        )

    def test_cannot_approve_product_with_unverified_category(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            self.set_status_url,
            {"status": Product.STATUS_ACTIVE},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("категорию", response.data["detail"].lower())
        self.product_with_pending_category.refresh_from_db()
        self.assertEqual(
            self.product_with_pending_category.status,
            Product.STATUS_PENDING_MODERATION,
        )

    def test_can_approve_product_after_category_verified(self):
        self.pending_category.is_verified = True
        self.pending_category.save(update_fields=["is_verified"])
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            self.set_status_url,
            {"status": Product.STATUS_ACTIVE},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product_with_pending_category.refresh_from_db()
        self.assertEqual(self.product_with_pending_category.status, Product.STATUS_ACTIVE)

    def test_can_reject_product_with_unverified_category(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            self.set_status_url,
            {"status": Product.STATUS_REJECTED, "reason": "spam"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.product_with_pending_category.refresh_from_db()
        self.assertEqual(self.product_with_pending_category.status, Product.STATUS_REJECTED)


class AuditExportTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="audit_admin",
            password="pass12345",
            role=UserRole.ADMIN,
        )
        self.seller = User.objects.create_user(
            username="audit_seller",
            password="pass12345",
            role=UserRole.SELLER,
        )
        self.export_url = reverse("moderation-audit-export-logs")

    def test_admin_can_download_audit_txt(self):
        AdminActionLog.objects.create(
            actor=self.admin,
            action="product.approve",
            object_type="product",
            object_id="1",
            payload={"ok": True},
        )
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.export_url, {"days": 7}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/plain; charset=utf-8")
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertIn("filename*=UTF-8", response["Content-Disposition"])
        self.assertEqual(response["X-Export-Count"], "1")

        body = json.loads(response.content.decode("utf-8"))
        self.assertEqual(body["period_days"], 7)
        self.assertEqual(len(body["entries"]), 1)
        self.assertEqual(body["entries"][0]["action"], "product.approve")
        self.assertTrue(AdminActionLog.objects.filter(action="audit.export").exists())

    def test_export_filename_format(self):
        dt = timezone.make_aware(datetime(2026, 6, 1, 14, 30, 45))
        name = format_audit_export_filename(dt)
        self.assertRegex(
            name,
            re.compile(r"^Экспорт журнала аудита от 01\.06\.2026 14-30-45\.txt$"),
        )

    def test_seller_cannot_export_audit(self):
        self.client.force_authenticate(self.seller)
        response = self.client.post(self.export_url, {"days": 7}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_export_rejects_invalid_days(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.export_url, {"days": 0}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
