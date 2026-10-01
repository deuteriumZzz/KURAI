import os

from celery import Celery


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "kurai.settings")

app = Celery("kurai")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
