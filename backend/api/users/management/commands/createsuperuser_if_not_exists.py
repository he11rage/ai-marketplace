from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

from api.users.roles import UserRole

class Command(BaseCommand):
    help = 'Creates a superuser if one does not already exist'

    def handle(self, *args, **kwargs):
        User = get_user_model()
        username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admin')

        if not User.objects.filter(username=username).exists():
            self.stdout.write(f'Creating superuser "{username}"...')
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                role=UserRole.ADMIN,
                is_admin=True,
            )
            self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" created successfully!'))
        else:
            user = User.objects.get(username=username)
            updated_fields = []

            if user.role != UserRole.ADMIN:
                user.role = UserRole.ADMIN
                updated_fields.append("role")

            if not user.is_admin:
                user.is_admin = True
                updated_fields.append("is_admin")

            if updated_fields:
                user.save(update_fields=updated_fields)
                self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" updated successfully!'))
            else:
                self.stdout.write(f'Superuser "{username}" already exists.')