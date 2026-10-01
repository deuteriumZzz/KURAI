from django.conf import settings
from django.db import transaction
from django.db.models import Max
from redis import Redis
from redis.client import PubSub
from redis.exceptions import RedisError

from runs.models import Run, RunEvent


def run_event_channel(run_id: str) -> str:
    """Return a channel containing no user-visible or provider data."""
    return f"kurai:run:{run_id}"


def _event_redis() -> Redis:
    return Redis.from_url(
        settings.KURAI_EVENT_REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=1,
        socket_timeout=1,
    )


def _publish_run_event(run_id: str) -> None:
    """Wake listeners after commit; the database remains the event authority."""
    try:
        client = _event_redis()
        try:
            client.publish(run_event_channel(run_id), "event")
        finally:
            client.close()
    except RedisError:
        # SSE falls back to bounded database polling when Redis is unavailable.
        return


def subscribe_run_events(run_id: str) -> tuple[Redis, PubSub] | None:
    """Open an advisory wake-up subscription for a single run.

    The subscription never carries model output. A dropped or unavailable Redis
    connection can only delay delivery: the stream replays RunEvent rows from
    Postgres on every wake-up.
    """
    try:
        client = _event_redis()
        subscription = client.pubsub(ignore_subscribe_messages=True)
        subscription.subscribe(run_event_channel(run_id))
        return client, subscription
    except RedisError:
        return None


def close_run_event_subscription(subscription: tuple[Redis, PubSub] | None) -> None:
    if subscription is None:
        return
    client, pubsub = subscription
    try:
        pubsub.close()
    finally:
        client.close()


def append_event(run: Run, event_type: str, payload: dict) -> RunEvent:
    with transaction.atomic():
        # A lock on the run serialises event sequence allocation across workers.
        locked_run = Run.objects.select_for_update().get(id=run.id)
        next_seq = (RunEvent.objects.filter(run=locked_run).aggregate(last=Max("seq"))["last"] or 0) + 1
        event = RunEvent.objects.create(run=locked_run, seq=next_seq, type=event_type, payload=payload)
        transaction.on_commit(lambda: _publish_run_event(str(locked_run.id)))
        return event
