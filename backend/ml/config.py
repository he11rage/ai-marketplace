EMBEDDING_MODEL_NAME = "ai-forever/ru-en-RoSBERTa"
EMBEDDING_DIMENSIONS = 1024
MAX_TOKEN_LENGTH = 512

# Hybrid search: PostgreSQL full-text (ts_rank) + pgvector cosine similarity
HYBRID_SEARCH_TEXT_WEIGHT = 0.5
HYBRID_SEARCH_VECTOR_WEIGHT = 0.5
# RAG / рекомендации — шире охват
HYBRID_SEARCH_MIN_VECTOR_SIMILARITY = 0.3
# Каталог — только близкие по смыслу (иначе в выдачу попадают почти все товары)
HYBRID_SEARCH_CATALOG_MIN_VECTOR_SIMILARITY = 0.55
HYBRID_SEARCH_FT_CONFIG = "russian"

# Chat search thresholds — более мягкие для лучшего поиска товаров
CHAT_MIN_VECTOR_SIMILARITY_THRESHOLD = 0.55
CHAT_MIN_HYBRID_SCORE_THRESHOLD = 0.25

# Item-to-item recommendations (pgvector cosine similarity)
SIMILAR_PRODUCTS_MIN_SIMILARITY = 0.55
SIMILAR_PRODUCTS_DEFAULT_LIMIT = 8
SIMILAR_PRODUCTS_MAX_LIMIT = 24
