import time

from django.conf import settings
from django.core.cache import cache


def allow_member_request(*, member_id: str, scope: str, limit: int) -> tuple[bool, int]:
    """A bounded, per-member fixed-window limit backed by Redis in production."""
    if limit <= 0:
        return True, 0
    window = settings.KURAI_RUN_RATE_LIMIT_WINDOW_SECONDS
    bucket = int(time.time() // window)
    key = f"kurai:rate:{scope}:{member_id}:{bucket}"
    if cache.add(key, 1, timeout=window):
        return True, 0
    try:
        count = cache.incr(key)
    except ValueError:
        # A cache eviction between add/incr must fail closed for paid work.
        return False, window
    return count <= limit, window
