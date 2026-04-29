from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    """Расширенная модель пользователя"""
    is_admin = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.username