"""
WSGI config for core project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

application = get_wsgi_application()

from ml.embeddings import _get_model
if os.environ.get('RUN_MAIN') == 'true':
    from ml.embeddings import _get_model
    print("[WSGI STARTUP] Главный процесс запущен. Начинаем прогрев модели...")
    _get_model()
else:
    print("[WSGI SKIP] Пропускаем прогрев модели для фонового процесса")