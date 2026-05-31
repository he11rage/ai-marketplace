# backend/ml/rag_pipeline.py
from pgvector.django import CosineDistance
from api.products.models import Product
from api.stores.models import Store
from .config import SIMILAR_PRODUCTS_MIN_SIMILARITY
from .hybrid_search import hybrid_search_products


def search_similar_products(query: str, limit: int = 5, threshold: float = 0.3):
    """
    Гибридный поиск (full-text + embeddings) для RAG и рекомендаций.
    threshold применяется к vector_similarity при чисто векторных совпадениях.
    """
    base = Product.objects.filter(
        status=Product.STATUS_ACTIVE,
        stock_quantity__gt=0,
        embedding__isnull=False,
    )
    products = hybrid_search_products(
        base,
        query,
        min_vector_similarity=threshold,
        apply_ordering=True,
    )[:limit]
    return products

def get_similar_products(
    product_id: int,
    *,
    limit: int = 8,
    min_similarity: float | None = None,
):
    """
    Похожие товары по cosine similarity эмбеддингов (item-to-item).
    Возвращает только активные товары из активных магазинов с заполненным embedding.
    """
    try:
        target_product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Product.objects.none()

    if target_product.embedding is None:
        return Product.objects.none()

    threshold = (
        SIMILAR_PRODUCTS_MIN_SIMILARITY
        if min_similarity is None
        else min_similarity
    )

    return (
        Product.objects.filter(
            status=Product.STATUS_ACTIVE,
            store__status=Store.STATUS_ACTIVE,
            embedding__isnull=False,
        )
        .exclude(id=product_id)
        .annotate(similarity=1 - CosineDistance("embedding", target_product.embedding))
        .filter(similarity__gte=threshold)
        .order_by("-similarity")[:limit]
    )


def get_product_recommendations(product_id: int, limit: int = 4):
    """Обратная совместимость для RAG и внутренних вызовов."""
    return get_similar_products(product_id, limit=limit)
