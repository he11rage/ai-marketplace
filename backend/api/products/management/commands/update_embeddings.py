import time
from django.core.management.base import BaseCommand
from api.products.models import Product
from ml.embeddings import get_embedding

class Command(BaseCommand):
    help = 'Перегенерирует векторные эмбеддинги для всех активных товаров с учетом цены, бренда и категории.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            help='Ограничить количество обновляемых товаров (для тестов)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("🚀 Запуск обновления эмбеддингов..."))
        
        queryset = Product.objects.filter(
            status=Product.STATUS_ACTIVE,
        ).select_related('category')
        
        limit = options.get('limit')
        if limit:
            queryset = queryset[:limit]
            self.stdout.write(f"⚠️ Режим теста: ограничено {limit} товарами.")

        total_to_process = queryset.count()
        if total_to_process == 0:
            self.stdout.write(self.style.WARNING("Нет активных товаров для обновления."))
            return

        updated_count = 0
        error_count = 0
        batch_size = 50

        self.stdout.write(f"Найдено {total_to_process} товаров. Начинаем обработку...")
        start_time = time.time()

        for product in queryset.iterator(chunk_size=batch_size):
            try:
                category_name = product.category.name if product.category else ""
                text_to_embed = (
                    f"{product.name} "
                    f"{product.brand or ''} "
                    f"{category_name} "
                    f"{product.description or ''} "
                    f"цена {product.price} рублей"
                )
                
                vector = get_embedding(text_to_embed)
                product.embedding = vector
                product.save(update_fields=['embedding'])
                
                updated_count += 1
                
                if updated_count % 50 == 0:
                    elapsed = time.time() - start_time
                    self.stdout.write(f"✅ Обработано: {updated_count}/{total_to_process} (Время: {elapsed:.1f} сек)")
                    
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f"❌ Ошибка на товаре ID {product.id}: {e}"))

        total_time = time.time() - start_time
        self.stdout.write(self.style.SUCCESS(
            f"\n🎉 Готово! Успешно обновлено: {updated_count}, Ошибок: {error_count}. "
            f"Общее время: {total_time:.1f} сек."
        ))