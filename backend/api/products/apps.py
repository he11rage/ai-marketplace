from django.apps import AppConfig


class ProductsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api.products'

    def ready(self):
        # Register signals.
        from . import signals  # noqa: F401
