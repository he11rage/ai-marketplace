from django.contrib.auth.models import AbstractUser
from django.db import models

from .roles import UserRole


class CustomUser(AbstractUser):
    """Расширенная модель пользователя"""

    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.BUYER,
        db_index=True,
    )
    is_admin = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.username

    def save(self, *args, **kwargs):
        if self.role != UserRole.ADMIN and (self.is_superuser or self.is_staff):
            self.role = UserRole.ADMIN
        self.is_admin = self.role == UserRole.ADMIN
        super().save(*args, **kwargs)
