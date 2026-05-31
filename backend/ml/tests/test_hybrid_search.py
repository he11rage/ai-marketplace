from unittest.mock import patch

from django.contrib.postgres.search import SearchQuery
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.categories.models import Category
from api.products.models import Product
from api.stores.models import Store
from django.contrib.auth import get_user_model

User = get_user_model()
from ml.hybrid_search import hybrid_search_products


class HybridSearchUnitTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="hybrid_owner", password="pass12345")
        self.store = Store.objects.create(
            owner=self.owner, name="Tech Store", status=Store.STATUS_ACTIVE
        )
        self.category = Category.objects.create(name="Electronics")

    @patch("ml.hybrid_search.get_embedding", return_value=[1.0] + [0.0] * 1023)
    def test_hybrid_search_prefers_full_text_match(self, _embedding_mock):
        query_vector = [1.0] + [0.0] * 1023
        phone = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Смартфон Galaxy",
            description="Android телефон",
            price="100.00",
            stock_quantity=5,
            status=Product.STATUS_ACTIVE,
            embedding=query_vector,
        )
        laptop = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Ноутбук Pro",
            description="Мощный ноутбук для работы",
            price="500.00",
            stock_quantity=5,
            status=Product.STATUS_ACTIVE,
            embedding=[0.0, 1.0] + [0.0] * 1022,
        )

        base = Product.objects.filter(status=Product.STATUS_ACTIVE)
        results = list(
            hybrid_search_products(
                base,
                "Galaxy",
                min_vector_similarity=0.99,
            ).values_list("id", flat=True)
        )

        self.assertEqual(results, [phone.id])

    @patch("ml.hybrid_search.get_embedding", return_value=[1.0] + [0.0] * 1023)
    def test_search_vector_indexed_for_websearch(self, _embedding_mock):
        product = Product.objects.create(
            store=self.store,
            category=self.category,
            name="Умная колонка",
            description="Голосовой ассистент",
            price="50.00",
            stock_quantity=2,
            status=Product.STATUS_ACTIVE,
            embedding=[0.0] * 1024,
        )
        product.refresh_from_db()
        self.assertTrue(
            Product.objects.filter(
                pk=product.pk,
                search_vector=SearchQuery("колонка", config="russian", search_type="websearch"),
            ).exists()
        )


class HybridSearchAPITests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="api_owner", password="pass12345")
        self.store = Store.objects.create(
            owner=self.owner, name="Shop", status=Store.STATUS_ACTIVE
        )
        self.category = Category.objects.create(name="Gadgets")
        self.list_url = reverse("product-list")

        self.query_vector = [1.0] + [0.0] * 1023
        self.orthogonal_vector = [0.0, 1.0] + [0.0] * 1022
        Product.objects.create(
            store=self.store,
            category=self.category,
            name="Wireless Mouse",
            description="Ergonomic mouse",
            price="25.00",
            stock_quantity=10,
            status=Product.STATUS_ACTIVE,
            embedding=self.query_vector,
        )
        Product.objects.create(
            store=self.store,
            category=self.category,
            name="Mechanical Keyboard",
            description="RGB keyboard",
            price="80.00",
            stock_quantity=10,
            status=Product.STATUS_ACTIVE,
            embedding=self.orthogonal_vector,
        )

    @patch("ml.hybrid_search.get_embedding")
    def test_catalog_search_uses_hybrid_endpoint(self, embedding_mock):
        embedding_mock.return_value = self.query_vector
        response = self.client.get(self.list_url, {"search": "Mouse"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = {item["name"] for item in response.data}
        self.assertEqual(names, {"Wireless Mouse"})

    @patch("ml.hybrid_search.get_embedding")
    def test_catalog_search_with_relevance_ordering(self, embedding_mock):
        embedding_mock.return_value = self.orthogonal_vector
        response = self.client.get(
            self.list_url,
            {"search": "keyboard", "ordering": "relevance"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Mechanical Keyboard")
