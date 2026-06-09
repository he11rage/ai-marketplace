"""
Гибридный поиск товаров: full-text (PostgreSQL tsvector / ts_rank) + векторный (embeddings)
с поддержкой мягкой фильтрации по динамическим категориям.
"""
from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db.models import F, FloatField, Q
from django.db.models.functions import Coalesce
from pgvector.django import CosineDistance

# Автоматический импорт вашей модели категорий на основе структуры проекта
from api.products.models import Category

from ml.config import (
    HYBRID_SEARCH_CATALOG_MIN_VECTOR_SIMILARITY,
    HYBRID_SEARCH_FT_CONFIG,
    HYBRID_SEARCH_MIN_VECTOR_SIMILARITY,
    HYBRID_SEARCH_TEXT_WEIGHT,
    HYBRID_SEARCH_VECTOR_WEIGHT,
)
from ml.embeddings import get_embedding


def get_matching_category_ids(extracted_category_name: str) -> list[int]:
    """
    Разбивает извлеченную ЛЛМ категорию на ключевые слова и ищет совпадения 
    в названиях динамических категорий в БД. Выводит подробные логи в консоль.
    """
    if not extracted_category_name:
        return []
        
    # Разбиваем на слова, очищаем от пробелов и убираем слишком короткие предлоги
    words = [w.strip().lower() for w in extracted_category_name.split() if len(w.strip()) > 2]
    
    if not words:
        words = [extracted_category_name.lower()]

    # Строим динамический OR-запрос по ключевым словам
    category_filter = Q()
    for word in words:
        category_filter |= Q(name__icontains=word)
        
    # Запрос к БД для получения совпадений
    matched_categories = Category.objects.filter(category_filter)
    matched_ids = list(matched_categories.values_list('id', flat=True))
    
    # Красивое логирование результатов в консоль контейнера
    if matched_ids:
        names_list = ", ".join([f"'{c.name}' (ID: {c.id})" for c in matched_categories])
        print(f"🎯 [CATEGORY MATCH] ЛЛМ запросила: '{extracted_category_name}'. Найдено совпадений в БД: {names_list}", flush=True)
    else:
        print(f"⚠️ [CATEGORY MISMATCH] ЛЛМ запросила: '{extracted_category_name}'. В БД нет похожих категорий. Поиск пойдет по всему каталогу.", flush=True)
        
    return matched_ids


def hybrid_search_products(
    queryset,
    query: str,
    *,
    extracted_category: str | None = None,  # Получаем категорию напрямую из анализа ЛЛМ
    text_weight: float | None = None,
    vector_weight: float | None = None,
    min_vector_similarity: float | None = None,
    apply_ordering: bool = True,
):
    """
    Фильтрует queryset по гибридному скору и добавляет аннотации:
    text_rank, vector_similarity, hybrid_score.
    
    При передаче extracted_category выполняет мягкое сужение выборки 
    по динамическим категориям бэкенда.
    """
    # 1. Мягкая динамическая фильтрация по категориям
    if extracted_category:
        category_ids = get_matching_category_ids(extracted_category)
        if category_ids:
            # Фильтруем товары, сужая поиск до найденных динамических категорий
            # (убедитесь, что связь в модели Product называется category_id)
            queryset = queryset.filter(category_id__in=category_ids)

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
