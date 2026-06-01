# backend/ml/rag_pipeline.py
from pgvector.django import CosineDistance
from api.products.models import Product
from api.stores.models import Store
from .config import SIMILAR_PRODUCTS_MIN_SIMILARITY
from .hybrid_search import hybrid_search_products

CHAT_SEARCH_LIMIT = 5
CHAT_MIN_HYBRID_SCORE = 0.12
CHAT_MIN_VECTOR_SIMILARITY = 0.32


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


def search_products_for_chat(
    query: str,
    limit: int = CHAT_SEARCH_LIMIT,
    min_vector_similarity: float = CHAT_MIN_VECTOR_SIMILARITY,
):
    """
    Поиск для AI-чата с оценками релевантности.
    Возвращает список dict: product, hybrid_score, vector_similarity.
    """
    base = Product.objects.filter(
        status=Product.STATUS_ACTIVE,
        stock_quantity__gt=0,
        store__status=Store.STATUS_ACTIVE,
        embedding__isnull=False,
    ).select_related("store", "category")

    qs = hybrid_search_products(
        base,
        query,
        min_vector_similarity=min_vector_similarity,
        apply_ordering=True,
    )

    results = []
    for product in qs[: limit * 2]:
        hybrid = float(getattr(product, "hybrid_score", 0) or 0)
        vector_sim = float(getattr(product, "vector_similarity", 0) or 0)
        if hybrid < CHAT_MIN_HYBRID_SCORE and vector_sim < min_vector_similarity:
            continue
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

    best = results[0]
    if best["hybrid_score"] < CHAT_MIN_HYBRID_SCORE and best["vector_similarity"] < 0.38:
        return []

    return results


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
