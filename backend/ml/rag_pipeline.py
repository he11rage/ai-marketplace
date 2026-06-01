from pgvector.django import CosineDistance
from django.db.models import Q

from api.products.models import Product
from api.stores.models import Store
from .config import SIMILAR_PRODUCTS_MIN_SIMILARITY
from .hybrid_search import hybrid_search_products

CHAT_SEARCH_LIMIT = 5
CHAT_MIN_HYBRID_SCORE = 0.25
CHAT_MIN_VECTOR_SIMILARITY = 0.65


def search_similar_products(query: str, limit: int = 5, threshold: float = 0.3):
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


def search_products_for_chat(
    query: str,
    limit: int = CHAT_SEARCH_LIMIT,
    min_vector_similarity: float = CHAT_MIN_VECTOR_SIMILARITY,
    base_queryset=None,
):
    """Поиск для AI-чата с оценками релевантности и пре-фильтром."""
    if base_queryset is None:
        base_queryset = Product.objects.filter(
            status=Product.STATUS_ACTIVE,
            stock_quantity__gt=0,
            store__status=Store.STATUS_ACTIVE,
            embedding__isnull=False,
        ).select_related("store", "category")

    qs = hybrid_search_products(
        base_queryset,
        query,
        min_vector_similarity=min_vector_similarity,
        apply_ordering=True,
    )

    results = []
    for product in qs[: limit * 3]:
        hybrid = float(getattr(product, "hybrid_score", 0) or 0)
        vector_sim = float(getattr(product, "vector_similarity", 0) or 0)

        # Оставляем, если хотя бы один сигнал сильный
        if hybrid >= CHAT_MIN_HYBRID_SCORE or vector_sim >= min_vector_similarity:
            results.append(
                {
                    "product": product,
                    "hybrid_score": hybrid,
                    "vector_similarity": vector_sim,
                }
            )
            if len(results) >= limit:
                break

    if not results:
        return []

    # Финальная проверка по топовому результату
    best = results[0]
    if best["vector_similarity"] < 0.60 and best["hybrid_score"] < 0.25:
        return []

    return results


def get_similar_products(
    product_id: int, *, limit: int = 8, min_similarity: float | None = None
):
    try:
        target_product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Product.objects.none()

    if target_product.embedding is None:
        return Product.objects.none()

    threshold = (
        SIMILAR_PRODUCTS_MIN_SIMILARITY if min_similarity is None else min_similarity
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
    return get_similar_products(product_id, limit=limit)
