import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.categories.models import Category
from api.stores.models import Store
from api.products.models import Product
from api.users.roles import UserRole

User = get_user_model()

class Command(BaseCommand):
    help = 'Generates demo data: 6 users, 5 stores, categories, and 25 products'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('Cleaning up old demo data...'))

        Product.objects.all().delete()
        Store.objects.all().delete()
        Category.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

        self.stdout.write(self.style.SUCCESS('Old data cleared.'))

        self.stdout.write(self.style.WARNING('Creating users...'))
        users_data = [
            {'username': 'tech_owner', 'email': 'tech@shop.com', 'first_name': 'Иван', 'last_name': 'Техников', 'phone': '+79991111111', 'role': UserRole.SELLER},
            {'username': 'fashion_queen', 'email': 'fashion@shop.com', 'first_name': 'Анна', 'last_name': 'Модная', 'phone': '+79992222222', 'role': UserRole.SELLER},
            {'username': 'book_worm', 'email': 'books@shop.com', 'first_name': 'Петр', 'last_name': 'Книжкин', 'phone': '+79993333333', 'role': UserRole.SELLER},
            {'username': 'sport_guy', 'email': 'sport@shop.com', 'first_name': 'Алекс', 'last_name': 'Спортивный', 'phone': '+79994444444', 'role': UserRole.SELLER},
            {'username': 'buyer_max', 'email': 'max@buyer.com', 'first_name': 'Макс', 'last_name': 'Покупатель', 'phone': '+79995555555', 'role': UserRole.BUYER},
        ]
        
        created_users = []
        for u_data in users_data:
            user = User.objects.create_user(
                username=u_data['username'],
                email=u_data['email'],
                password='123',
                first_name=u_data['first_name'],
                last_name=u_data['last_name'],
                phone=u_data['phone'],
                role=u_data['role'],
            )
            created_users.append(user)
        self.stdout.write(self.style.SUCCESS(f'Created {len(created_users)} users.'))

        self.stdout.write(self.style.WARNING('Creating categories...'))
        cat_electronics = Category.objects.create(name='Электроника', slug='electronics', description='Гаджеты и техника')
        cat_laptops = Category.objects.create(name='Ноутбуки', slug='laptops', parent=cat_electronics)
        cat_phones = Category.objects.create(name='Смартфоны', slug='phones', parent=cat_electronics)
        
        cat_clothes = Category.objects.create(name='Одежда', slug='clothes', description='Одежда и обувь')
        cat_sneakers = Category.objects.create(name='Кроссовки', slug='sneakers', parent=cat_clothes)
        
        cat_books = Category.objects.create(name='Книги', slug='books', description='Литература')
        
        self.stdout.write(self.style.SUCCESS('Created categories.'))

        self.stdout.write(self.style.WARNING('Creating stores...'))
        stores = [
            {'name': 'TechHub', 'owner': created_users[0], 'slug': 'techhub', 'desc': 'Всё для гиков'},
            {'name': 'Fashion House', 'owner': created_users[1], 'slug': 'fashion', 'desc': 'Модная одежда'},
            {'name': 'BookStore', 'owner': created_users[2], 'slug': 'bookstore', 'desc': 'Мир книг'},
            {'name': 'SportLife', 'owner': created_users[3], 'slug': 'sportlife', 'desc': 'Спорт и активность'},
            {'name': 'MegaMarket', 'owner': created_users[0], 'slug': 'megamarket', 'desc': 'Всё подряд'},
        ]
        
        created_stores = []
        for s_data in stores:
            store = Store.objects.create(
                name=s_data['name'],
                owner=s_data['owner'],
                slug=s_data['slug'],
                description=s_data['desc'],
                rating=round(random.uniform(3.5, 5.0), 1),
                status=Store.STATUS_ACTIVE,
            )
            created_stores.append(store)
        self.stdout.write(self.style.SUCCESS(f'Created {len(created_stores)} stores.'))

        self.stdout.write(self.style.WARNING('Generating 25 products...'))
        
        product_templates = [
            {'name': 'MacBook Pro 14', 'cat': cat_laptops, 'price_min': 150000, 'price_max': 200000, 'desc': 'Мощный ноутбук для профи.'},
            {'name': 'iPhone 15 Pro', 'cat': cat_phones, 'price_min': 90000, 'price_max': 120000, 'desc': 'Лучший смартфон Apple.'},
            {'name': 'Samsung Galaxy S24', 'cat': cat_phones, 'price_min': 80000, 'price_max': 100000, 'desc': 'Флагман от Samsung.'},
            {'name': 'Nike Air Max', 'cat': cat_sneakers, 'price_min': 10000, 'price_max': 15000, 'desc': 'Удобные кроссовки для бега.'},
            {'name': 'Adidas Ultraboost', 'cat': cat_sneakers, 'price_min': 12000, 'price_max': 18000, 'desc': 'Технологичная обувь.'},
            {'name': 'Clean Code', 'cat': cat_books, 'price_min': 2000, 'price_max': 3000, 'desc': 'Книга для программистов.'},
            {'name': 'Python Crash Course', 'cat': cat_books, 'price_min': 1500, 'price_max': 2500, 'desc': 'Изучи Python с нуля.'},
            {'name': 'Sony WH-1000XM5', 'cat': cat_electronics, 'price_min': 25000, 'price_max': 35000, 'desc': 'Шумоподавляющие наушники.'},
            {'name': 'Logitech MX Master', 'cat': cat_electronics, 'price_min': 8000, 'price_max': 12000, 'desc': 'Мышь для продуктивной работы.'},
            {'name': 'Dell XPS 15', 'cat': cat_laptops, 'price_min': 130000, 'price_max': 170000, 'desc': 'Ультрабук для работы.'},
        ]

        for i in range(25):
            template = random.choice(product_templates)

            store = random.choice(created_stores)
            
            price = random.randint(template['price_min'], template['price_max'])
            old_price = price + random.randint(1000, 5000) if random.random() > 0.5 else None
            
            unique_name = f"{template['name']} v{i+1}" if i > 0 else template['name']
            
            Product.objects.create(
                store=store,
                category=template['cat'],
                name=unique_name,
                description=f"{template['desc']} Отличный выбор для покупки. Артикул #{random.randint(1000, 9999)}.",
                price=price,
                old_price=old_price,
                stock_quantity=random.randint(0, 100),
                rating=round(random.uniform(3.0, 5.0), 1),
                review_count=random.randint(0, 200),
                status=Product.STATUS_ACTIVE,
                embedding=None,
            )
            
        self.stdout.write(self.style.SUCCESS('25 Products generated successfully!'))
        self.stdout.write(self.style.SUCCESS('Demo data generation complete!'))