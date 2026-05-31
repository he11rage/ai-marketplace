from django.contrib.postgres.search import SearchVector
from django.db.models import Value


def build_product_search_vector(product):
    """Собирает tsvector для полнотекстового поиска по товару."""
    vector = (
        SearchVector("name", weight="A", config="russian")
        + SearchVector("description", weight="B", config="russian")
    )
    if product.brand:
        vector = vector + SearchVector("brand", weight="C", config="russian")

    extra_terms = []
    if product.category_id:
        category = getattr(product, "category", None)
        if category is None:
            from api.categories.models import Category

            category = Category.objects.filter(pk=product.category_id).first()
        if category:
            extra_terms.append(category.name)

    if product.store_id:
        store = getattr(product, "store", None)
        if store is None:
            from api.stores.models import Store

            store = Store.objects.filter(pk=product.store_id).first()
        if store:
            extra_terms.append(store.name)

    if extra_terms:
        vector = vector + SearchVector(
            Value(" ".join(extra_terms)),
            weight="D",
            config="russian",
        )

    return vector
