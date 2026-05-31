from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector
from django.db import migrations
import django.contrib.postgres.search


def populate_search_vectors(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    for product in Product.objects.iterator():
        vector = (
            SearchVector("name", weight="A", config="russian")
            + SearchVector("description", weight="B", config="russian")
        )
        if product.brand:
            vector = vector + SearchVector("brand", weight="C", config="russian")
        Product.objects.filter(pk=product.pk).update(search_vector=vector)


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0007_product_moderation_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="search_vector",
            field=django.contrib.postgres.search.SearchVectorField(
                editable=False, null=True
            ),
        ),
        migrations.RunPython(populate_search_vectors, migrations.RunPython.noop),
        migrations.AddIndex(
            model_name="product",
            index=GinIndex(
                fields=["search_vector"],
                name="products_search_vector_gin",
            ),
        ),
    ]
