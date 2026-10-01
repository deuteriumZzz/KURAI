from celery import shared_task
from django.conf import settings

from runs.worker import poll_video_run, process_run


@shared_task(
    bind=True,
    autoretry_for=(),
    acks_late=True,
    reject_on_worker_lost=True,
    time_limit=180,
    soft_time_limit=150,
)
def process_run_task(self, run_id: str) -> None:
    """Idempotent worker boundary; no provider call is made by an HTTP view."""
    process_run(run_id)


@shared_task(
    bind=True,
    autoretry_for=(),
    acks_late=True,
    reject_on_worker_lost=True,
    time_limit=180,
    soft_time_limit=150,
)
def poll_video_run_task(self, run_id: str, attempt_id: str) -> None:
    """One bounded polling step for an asynchronous video provider job."""
    poll_video_run(run_id, attempt_id)


def dispatch_run(run_id: str) -> None:
    if settings.KURAI_LOCAL_EXECUTE_RUNS:
        process_run(run_id)
    elif settings.KURAI_QUEUE_RUNS:
        process_run_task.delay(run_id)
