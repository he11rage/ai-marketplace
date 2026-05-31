import math
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.categories.models import Category
from api.products.models import Product
from api.stores.models import Store
from api.users.roles import UserRole


def _unit_embedding(first: float = 1.0, second: float = 0.0) -> list[float]:
    vector = [0.0] * 1024
    vector[0] = first
    vector[1] = second
    norm = math.sqrt(sum(value * value for value in vector))
    return [value / norm for value in vector]


User = get_user_model()


class ProductStatusTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner", password="pass12345", role=UserRole.SELLER
        )
        self.store = Store.objects.create(
            owner=self.owner, name="Owner Store", status=Store.STATUS_ACTIVE
        )
        self.category = Category.objects.create(name="Electronics")
        self.list_url = reverse("product-list")

    def test_product_defaults_to_pending_moderation(self):
        product = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Phone",
            description="Test phone",
            price="100.00",
            stock_quantity=5,
            embedding=[0.0] * 1024,
        )

        self.assertEqual(product.status, Product.STATUS_PENDING_MODERATION)

    @patch("api.products.models.get_embedding", return_value=[0.0] * 1024)
    def test_api_create_sets_pending_moderation_status(self, get_embedding_mock):
        self.client.force_authenticate(self.owner)

        response = self.client.post(
            self.list_url,
            {
                "store": self.store.id,
                "category": self.category.id,
                "name": "Phone",
                "description": "Test phone",
                "price": "100.00",
                "stock_quantity": 5,
                "status": Product.STATUS_ACTIVE,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product = Product.objects.get(id=response.data["id"])
        self.assertEqual(product.status, Product.STATUS_PENDING_MODERATION)
        self.assertEqual(response.data["status"], Product.STATUS_PENDING_MODERATION)
        get_embedding_mock.assert_called_once()

    def test_seller_edit_active_product_via_products_api_goes_to_pending_moderation(self):
        active = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Live Gadget",
            description="On sale",
            price="150.00",
            stock_quantity=2,
            status=Product.STATUS_ACTIVE,
            embedding=[0.0] * 1024,
        )
        self.client.force_authenticate(self.owner)
        url = reverse("product-detail", kwargs={"pk": active.id})
        response = self.client.patch(url, {"name": "Live Gadget v2"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Product.STATUS_PENDING_MODERATION)
        active.refresh_from_db()
        self.assertEqual(active.status, Product.STATUS_PENDING_MODERATION)


class ProductCatalogFilterTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="pass12345")
        self.store = Store.objects.create(
            owner=self.owner, name="Owner Store", status=Store.STATUS_ACTIVE
        )
        self.phones = Category.objects.create(name="Phones")
        self.laptops = Category.objects.create(name="Laptops")
        self.list_url = reverse("product-list")
        self.brands_url = reverse("product-brands")

        for kwargs in (
            dict(
                store=self.store,
                category=self.phones,
                name="Budget Phone",
                description="Cheap phone",
                price="100.00",
                brand="Acme",
                stock_quantity=0,
                rating="3.0",
            ),
            dict(
                store=self.store,
                category=self.laptops,
                name="Pro Laptop",
                description="Powerful laptop",
                price="500.00",
                brand="Globex",
                stock_quantity=10,
                rating="4.8",
            ),
            dict(
                store=self.store,
                category=self.phones,
                name="Flagship Phone",
                description="Premium phone",
                price="300.00",
                brand="Acme",
                stock_quantity=3,
                rating="4.6",
            ),
        ):
            Product.objects.create(
                status=Product.STATUS_ACTIVE,
                embedding=[0.0] * 1024,
                **kwargs,
            )

    def test_filter_by_multiple_categories(self):
        response = self.client.get(
            self.list_url,
            {"categories": f"{self.phones.id},{self.laptops.id}"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_filter_by_price_range(self):
        response = self.client.get(self.list_url, {"price_min": "200", "price_max": "400"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Flagship Phone")

    def test_filter_by_min_rating_and_in_stock(self):
        response = self.client.get(self.list_url, {"min_rating": "4.5", "in_stock": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = {item["name"] for item in response.data}
        self.assertEqual(names, {"Pro Laptop", "Flagship Phone"})

    def test_filter_by_brands(self):
        response = self.client.get(self.list_url, {"brands": "Acme"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertTrue(all(item["brand"].lower() == "acme" for item in response.data))

    def test_brands_endpoint_returns_distinct_values(self):
        response = self.client.get(self.brands_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, ["Acme", "Globex"])

    def test_list_without_page_returns_unpaginated_array(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 3)

    def test_list_with_page_returns_paginated_payload(self):
        response = self.client.get(self.list_url, {"page": 1, "page_size": 2})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertIn("count", response.data)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertIsNotNone(response.data["next"])
        self.assertIsNone(response.data["previous"])

    def test_list_second_page(self):
        response = self.client.get(self.list_url, {"page": 2, "page_size": 2})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNone(response.data["next"])
        self.assertIsNotNone(response.data["previous"])


class ProductCatalogOrderingTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="pass12345")
        self.store = Store.objects.create(
            owner=self.owner, name="Owner Store", status=Store.STATUS_ACTIVE
        )
        self.category = Category.objects.create(name="Phones")
        self.list_url = reverse("product-list")

        self.budget_phone = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Budget Phone",
            price="100.00",
            description="Cheap phone",
            rating="3.0",
            review_count=5,
            status=Product.STATUS_ACTIVE,
            embedding=[0.0] * 1024,
        )
        self.flagship_phone = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Flagship Phone",
            price="500.00",
            description="Premium phone",
            rating="4.8",
            review_count=50,
            status=Product.STATUS_ACTIVE,
            embedding=[0.0] * 1024,
        )
        self.mid_phone = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Mid Phone",
            price="300.00",
            description="Balanced phone",
            rating="4.0",
            review_count=20,
            status=Product.STATUS_ACTIVE,
            embedding=[0.0] * 1024,
        )

        Product.objects.filter(id=self.budget_phone.id).update(created_at="2024-01-01T00:00:00Z")
        Product.objects.filter(id=self.mid_phone.id).update(created_at="2024-06-01T00:00:00Z")
        Product.objects.filter(id=self.flagship_phone.id).update(created_at="2024-12-01T00:00:00Z")

    def _product_names(self, response):
        return [item["name"] for item in response.data]

    def test_order_by_price_ascending(self):
        response = self.client.get(self.list_url, {"ordering": "price"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._product_names(response), ["Budget Phone", "Mid Phone", "Flagship Phone"])

    def test_order_by_price_descending(self):
        response = self.client.get(self.list_url, {"ordering": "-price"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._product_names(response), ["Flagship Phone", "Mid Phone", "Budget Phone"])

    def test_order_by_newest(self):
        response = self.client.get(self.list_url, {"ordering": "-created_at"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._product_names(response), ["Flagship Phone", "Mid Phone", "Budget Phone"])

    def test_order_by_popularity(self):
        response = self.client.get(self.list_url, {"ordering": "popular"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._product_names(response)[0], "Flagship Phone")

    def test_order_by_rating(self):
        response = self.client.get(self.list_url, {"ordering": "-rating"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._product_names(response), ["Flagship Phone", "Mid Phone", "Budget Phone"])


class ProductStoreModerationVisibilityTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="pass12345")
        self.active_store = Store.objects.create(
            owner=self.owner, name="Active Store", status=Store.STATUS_ACTIVE
        )
        self.pending_store = Store.objects.create(
            owner=self.owner, name="Pending Store", status=Store.STATUS_PENDING_MODERATION
        )
        self.category = Category.objects.create(name="Phones")
        self.list_url = reverse("product-list")

        Product.objects.create(
            store=self.active_store,
            category=self.category,
            name="Visible Product",
            description="From active store",
            price="100.00",
            stock_quantity=5,
            status=Product.STATUS_ACTIVE,
            embedding=[0.0] * 1024,
        )
        Product.objects.create(
            store=self.pending_store,
            category=self.category,
            name="Hidden Product",
            description="From pending store",
            price="200.00",
            stock_quantity=5,
            status=Product.STATUS_ACTIVE,
            embedding=[0.0] * 1024,
        )

    def test_catalog_excludes_products_from_pending_moderation_store(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = {item["name"] for item in response.data}
        self.assertEqual(names, {"Visible Product"})

    def test_catalog_excludes_products_when_filtering_by_pending_store(self):
        response = self.client.get(self.list_url, {"store": self.pending_store.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class ProductSimilarEndpointTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="similar_owner", password="pass12345")
        self.store = Store.objects.create(
            owner=self.owner, name="Similar Store", status=Store.STATUS_ACTIVE
        )
        self.category = Category.objects.create(name="Gadgets")
        self.target = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Target Phone",
            description="Main product",
            price="200.00",
            stock_quantity=5,
            status=Product.STATUS_ACTIVE,
            embedding=_unit_embedding(1.0, 0.0),
        )
        self.close_match = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Close Match Phone",
            description="Very similar embedding",
            price="210.00",
            stock_quantity=3,
            status=Product.STATUS_ACTIVE,
            embedding=_unit_embedding(0.99, 0.01),
        )
        self.orthogonal = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Unrelated Laptop",
            description="Different embedding direction",
            price="900.00",
            stock_quantity=2,
            status=Product.STATUS_ACTIVE,
            embedding=_unit_embedding(0.0, 1.0),
        )
        self.similar_url = reverse("product-similar", kwargs={"pk": self.target.id})

    def test_similar_endpoint_returns_close_embedding_matches(self):
        response = self.client.get(self.similar_url, {"limit": 4})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data]
        self.assertIn("Close Match Phone", names)
        self.assertNotIn("Target Phone", names)
        self.assertNotIn("Unrelated Laptop", names)

    def test_similar_endpoint_respects_limit(self):
        for index in range(3):
            Product.objects.create(
                store=self.store,
                category=self.category,
                name=f"Variant {index}",
                description="Near duplicate",
                price="205.00",
                stock_quantity=1,
                status=Product.STATUS_ACTIVE,
                embedding=_unit_embedding(0.98, 0.02 + index * 0.001),
            )

        response = self.client.get(self.similar_url, {"limit": 2})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    @patch("api.products.models.get_embedding", return_value=[0.0] * 1024)
    def test_similar_endpoint_empty_when_no_embedding(self, _embedding_mock):
        no_embedding = Product.objects.create(
            store=self.store,
            category=self.category,
            name="No Vector",
            description="Missing embedding",
            price="50.00",
            stock_quantity=1,
            status=Product.STATUS_ACTIVE,
            embedding=None,
        )
        Product.objects.filter(pk=no_embedding.pk).update(embedding=None)
        url = reverse("product-similar", kwargs={"pk": no_embedding.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_similar_endpoint_excludes_inactive_products(self):
        Product.objects.create(
            store=self.store,
            category=self.category,
            name="Draft Twin",
            description="Pending",
            price="199.00",
            stock_quantity=1,
            status=Product.STATUS_PENDING_MODERATION,
            embedding=_unit_embedding(0.99, 0.01),
        )

        response = self.client.get(self.similar_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = {item["name"] for item in response.data}
        self.assertNotIn("Draft Twin", names)


class ProductQuestionsAndHistoryTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner2", password="pass12345", role=UserRole.SELLER
        )
        self.other_user = User.objects.create_user(username="other", password="pass12345")
        self.store = Store.objects.create(owner=self.owner, name="Owner Store 2")
        self.category = Category.objects.create(name="Accessories")
        self.product = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Case",
            description="Phone case",
            price="10.00",
            stock_quantity=5,
            embedding=[0.0] * 1024,
        )

    def test_can_create_question_anonymously(self):
        url = reverse("product-questions", kwargs={"pk": self.product.id})
        resp = self.client.post(
            url,
            {"question": "Есть ли гарантия?", "guest_name": "Иван"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["question"], "Есть ли гарантия?")

    def test_owner_can_answer_question(self):
        q_url = reverse("product-questions", kwargs={"pk": self.product.id})
        q_resp = self.client.post(q_url, {"question": "Какие цвета?", "guest_email": "a@b.com"}, format="json")
        self.assertEqual(q_resp.status_code, status.HTTP_201_CREATED)
        qid = q_resp.data["id"]

        self.client.force_authenticate(self.owner)
        ans_url = reverse("product-answer-question", kwargs={"pk": self.product.id, "question_id": qid})
        ans_resp = self.client.post(ans_url, {"answer": "Чёрный и прозрачный"}, format="json")
        self.assertEqual(ans_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(ans_resp.data["status"], "answered")
        self.assertEqual(ans_resp.data["answer"], "Чёрный и прозрачный")

    def test_history_visible_only_to_owner(self):
        self.client.force_authenticate(self.owner)
        update_url = reverse("product-detail", kwargs={"pk": self.product.id})
        resp = self.client.patch(update_url, {"price": "12.00"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        history_url = reverse("product-history", kwargs={"pk": self.product.id})
        hist = self.client.get(history_url)
        self.assertEqual(hist.status_code, status.HTTP_200_OK)
        self.assertTrue(len(hist.data) >= 1)

        self.client.force_authenticate(self.other_user)
        denied = self.client.get(history_url)
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)
