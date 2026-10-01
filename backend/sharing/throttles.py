from rest_framework.throttling import AnonRateThrottle
from rest_framework.settings import api_settings


class SharedChatThrottle(AnonRateThrottle):
    """Bound anonymous reads of opaque links without affecting member API use."""

    scope = "share_read"

    def get_rate(self):
        return api_settings.DEFAULT_THROTTLE_RATES[self.scope]
