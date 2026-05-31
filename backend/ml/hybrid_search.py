"""
Гибридный поиск товаров: full-text (PostgreSQL tsvector / ts_rank) + векторный (embeddings).
"""
from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db.models import F, FloatField, Q
from django.db.models.functions import Coalesce
from pgvector.django import CosineDistance

from ml.config import (
    HYBRID_SEARCH_CATALOG_MIN_VECTOR_SIMILARITY,
    HYBRID_SEARCH_FT_CONFIG,
    HYBRID_SEARCH_MIN_VECTOR_SIMILARITY,
    HYBRID_SEARCH_TEXT_WEIGHT,
    HYBRID_SEARCH_VECTOR_WEIGHT,
)
from ml.embeddings import get_embedding


def hybrid_search_products(
    queryset,
    query: str,
    *,
    text_weight: float | None = None,
    vector_weight: float | None = None,
    min_vector_similarity: float | None = None,
    apply_ordering: bool = True,
):
    """
    Фильтрует queryset по гибридному скору и добавляет аннотации:
    text_rank, vector_similarity, hybrid_score.

    text_rank — релевантность full-text (ts_rank, аналог BM25 в PostgreSQL).
    vector_similarity — 1 - cosine_distance между embedding товара и запроса.
    hybrid_score — взвешенная сумма двух сигналов.
    """
    query = (query or "").strip()
    if not query:
        return queryset

    text_weight = (
        HYBRID_SEARCH_TEXT_WEIGHT if text_weight is None else text_weight
    )
    vector_weight = (
        HYBRID_SEARCH_VECTOR_WEIGHT if vector_weight is None else vector_weight
    )
    min_sim = (
        HYBRID_SEARCH_MIN_VECTOR_SIMILARITY
        if min_vector_similarity is None
        else min_vector_similarity
    )

    search_query = SearchQuery(
        query,
        config=HYBRID_SEARCH_FT_CONFIG,
        search_type="websearch",
    )
    query_embedding = get_embedding(query)

    queryset = queryset.annotate(
        text_rank=Coalesce(
            SearchRank("search_vector", search_query),
            0.0,
            output_field=FloatField(),
        ),
        vector_similarity=Coalesce(
            1 - CosineDistance("embedding", query_embedding),
            0.0,
            output_field=FloatField(),
        ),
    ).filter(
        Q(search_vector=search_query)
        | Q(name__icontains=query)
        | Q(description__icontains=query)
        | Q(brand__icontains=query)
        | Q(
            vector_similarity__gte=min_sim,
            embedding__isnull=False,
        )
    ).annotate(
        hybrid_score=(
            F("text_rank") * text_weight + F("vector_similarity") * vector_weight
        ),
    )

    if apply_ordering:
        queryset = queryset.order_by("-hybrid_score", "-created_at")

    return queryset
