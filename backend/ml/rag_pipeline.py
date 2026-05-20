# backend/ml/rag_pipeline.py
from django.db.models import F
from pgvector.django import CosineDistance
from api.products.models import Product
from .embeddings import get_embedding
from .config import EMBEDDING_DIMENSIONS

def search_similar_products(query: str, limit: int = 5, threshold: float = 0.3):  # ← Было 0.7
    """
    threshold: 0.3 — более мягкий поиск
    """
    query_embedding = get_embedding(query)

    products = Product.objects.annotate(
        similarity=1 - CosineDistance('embedding', query_embedding)
    ).filter(
        similarity__gte=threshold,  # ← 0.3 вместо 0.7
        stock_quantity__gt=0
    ).order_by('-similarity')[:limit]

    return products

def get_product_recommendations(product_id: int, limit: int = 4):
    """
    Находит похожие товары для конкретного товара (для блока "Similar").
    """
    try:
        target_product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Product.objects.none()

    if not target_product.embedding:
        return Product.objects.none()

    similar = Product.objects.annotate(
        similarity=1 - CosineDistance('embedding', target_product.embedding)
    ).exclude(
        id=product_id
    ).filter(
        similarity__gte=0.8,
        stock_quantity__gt=0
    ).order_by('-similarity')[:limit]

    return similar
