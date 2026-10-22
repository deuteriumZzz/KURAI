from celery import shared_task

from model_catalog.openrouter import fetch_full_catalog, sync_catalog


@shared_task(autoretry_for=(), acks_late=True, time_limit=90)
def sync_openrouter_models_task() -> int:
    """Refresh catalog/pricing outside the request path; safe to run repeatedly."""
    return sync_catalog(fetch_full_catalog())
