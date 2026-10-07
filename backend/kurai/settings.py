import os
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlparse

from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent
DEBUG = os.getenv("DJANGO_DEBUG", "1") == "1"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "development-only-key")
if not DEBUG and SECRET_KEY == "development-only-key":
    raise RuntimeError("DJANGO_SECRET_KEY must be configured outside development")

ALLOWED_HOSTS = [host for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if host]
INSTALLED_APPS = [
    "django.contrib.auth", "django.contrib.contenttypes", "django.contrib.sessions", "django.contrib.messages", "django.contrib.staticfiles",
    "corsheaders", "rest_framework", "drf_spectacular", "accounts", "workspace", "ledger", "model_catalog", "runs", "sharing", "files", "media",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware", "django.contrib.sessions.middleware.SessionMiddleware",
    "kurai.middleware.RequestIdMiddleware",
    "corsheaders.middleware.CorsMiddleware", "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware", "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware", "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "kurai.urls"
TEMPLATES = [{"BACKEND": "django.template.backends.django.DjangoTemplates", "DIRS": [], "APP_DIRS": True, "OPTIONS": {"context_processors": ["django.template.context_processors.request", "django.contrib.auth.context_processors.auth", "django.contrib.messages.context_processors.messages"]}}]
WSGI_APPLICATION = "kurai.wsgi.application"
ASGI_APPLICATION = "kurai.asgi.application"
DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL:
    parsed_database_url = urlparse(DATABASE_URL)
    if parsed_database_url.scheme not in {"postgres", "postgresql"}:
        raise RuntimeError("DATABASE_URL must use the postgresql scheme")
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed_database_url.path.lstrip("/"),
            "USER": parsed_database_url.username,
            "PASSWORD": parsed_database_url.password,
            "HOST": parsed_database_url.hostname,
            "PORT": parsed_database_url.port or 5432,
            "CONN_MAX_AGE": 60,
        }
    }
elif not DEBUG:
    raise RuntimeError("DATABASE_URL must be configured outside development")
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": os.getenv("SQLITE_PATH", BASE_DIR / "db.sqlite3")}}
LANGUAGE_CODE = "ru"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
STATIC_URL = "/static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "user-media"
AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_THROTTLE_RATES": {"share_read": "60/hour"},
}
SPECTACULAR_SETTINGS = {
    "TITLE": "KURAI API",
    "VERSION": "v1",
    # Quote and run serializers share these values; pin the public enum name
    # instead of letting schema generation derive a hash-suffixed component.
    "ENUM_NAME_OVERRIDES": {"RunMode": ("text", "research", "slides", "image", "video", "audio")},
}
CORS_ALLOWED_ORIGINS = [origin for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if origin]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = (*default_headers, "idempotency-key")
# the composer counts down a rate limit from the real Retry-After, so the browser must be allowed to read it
CORS_EXPOSE_HEADERS = ["Retry-After"]
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = not DEBUG
KURAI_LOCAL_EXECUTE_RUNS = os.getenv("KURAI_LOCAL_EXECUTE_RUNS", "0") == "1"
KURAI_QUEUE_RUNS = os.getenv("KURAI_QUEUE_RUNS", "0") == "1"
if not DEBUG and not KURAI_QUEUE_RUNS:
    raise RuntimeError("KURAI_QUEUE_RUNS must be enabled outside development")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
KURAI_EVENT_REDIS_URL = os.getenv("KURAI_EVENT_REDIS_URL", CELERY_BROKER_URL)
CELERY_RESULT_BACKEND = None
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_TASK_TIME_LIMIT = 180
CELERY_TASK_SOFT_TIME_LIMIT = 150
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_BEAT_SCHEDULE = {"sync-openrouter-models": {"task": "model_catalog.tasks.sync_openrouter_models_task", "schedule": 21_600}}
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL", "")
OPENROUTER_APP_NAME = os.getenv("OPENROUTER_APP_NAME", "KURAI")
KURAI_CREDITS_PER_USD = int(os.getenv("KURAI_CREDITS_PER_USD", "1000000"))
KURAI_MIN_RUN_COST_MICRO = int(os.getenv("KURAI_MIN_RUN_COST_MICRO", "1000"))
KURAI_MAX_COMPLETION_TOKENS = int(os.getenv("KURAI_MAX_COMPLETION_TOKENS", "1024"))
KURAI_RESEARCH_SEARCH_ENGINE = os.getenv("KURAI_RESEARCH_SEARCH_ENGINE", "exa")
KURAI_RESEARCH_MAX_RESULTS = int(os.getenv("KURAI_RESEARCH_MAX_RESULTS", "5"))
KURAI_RESEARCH_MAX_TOTAL_RESULTS = int(os.getenv("KURAI_RESEARCH_MAX_TOTAL_RESULTS", "10"))
KURAI_RESEARCH_MAX_USES = int(os.getenv("KURAI_RESEARCH_MAX_USES", "2"))
KURAI_RESEARCH_MAX_TOOL_CALLS = int(os.getenv("KURAI_RESEARCH_MAX_TOOL_CALLS", "3"))
KURAI_RESEARCH_MAX_SOURCE_CHARACTERS = int(os.getenv("KURAI_RESEARCH_MAX_SOURCE_CHARACTERS", "4000"))
try:
    KURAI_RESEARCH_SEARCH_COST_USD_PER_USE = Decimal(os.getenv("KURAI_RESEARCH_SEARCH_COST_USD_PER_USE", "0.007"))
except InvalidOperation as error:
    raise RuntimeError("KURAI_RESEARCH_SEARCH_COST_USD_PER_USE must be a decimal") from error
# OpenRouter lists routers (openrouter/auto, …) with price -1; their hold is reserved at this ceiling.
try:
    KURAI_VARIABLE_PROMPT_USD_PER_TOKEN = Decimal(os.getenv("KURAI_VARIABLE_PROMPT_USD_PER_TOKEN", "0.000005"))
    KURAI_VARIABLE_COMPLETION_USD_PER_TOKEN = Decimal(os.getenv("KURAI_VARIABLE_COMPLETION_USD_PER_TOKEN", "0.000025"))
except InvalidOperation as error:
    raise RuntimeError("KURAI variable-price ceilings must be decimals") from error
if KURAI_VARIABLE_PROMPT_USD_PER_TOKEN <= 0 or KURAI_VARIABLE_COMPLETION_USD_PER_TOKEN <= 0:
    raise RuntimeError("KURAI variable-price ceilings must be positive")
KURAI_VIDEO_DEFAULT_DURATION_SECONDS = int(os.getenv("KURAI_VIDEO_DEFAULT_DURATION_SECONDS", "5"))
# Run options (runs/options.py): bounded so a reserved hold always covers the run.
KURAI_VIDEO_DURATIONS = tuple(int(value) for value in os.getenv("KURAI_VIDEO_DURATIONS", "5,8,10").split(","))
KURAI_WEB_MAX_USES = int(os.getenv("KURAI_WEB_MAX_USES", "1"))
KURAI_RESEARCH_DEEP_MAX_USES = int(os.getenv("KURAI_RESEARCH_DEEP_MAX_USES", "4"))
KURAI_THINK_COMPLETION_MULTIPLIER = int(os.getenv("KURAI_THINK_COMPLETION_MULTIPLIER", "2"))
KURAI_VIDEO_POLL_SECONDS = int(os.getenv("KURAI_VIDEO_POLL_SECONDS", "30"))
KURAI_MEDIA_MAX_VIDEO_BYTES = int(os.getenv("KURAI_MEDIA_MAX_VIDEO_BYTES", str(500 * 1024 * 1024)))
KURAI_MEDIA_MAX_AUDIO_BYTES = int(os.getenv("KURAI_MEDIA_MAX_AUDIO_BYTES", str(50 * 1024 * 1024)))
KURAI_CATALOG_MAX_AGE_SECONDS = int(os.getenv("KURAI_CATALOG_MAX_AGE_SECONDS", "43200"))
KURAI_RUN_RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("KURAI_RUN_RATE_LIMIT_WINDOW_SECONDS", "60"))
KURAI_RUN_QUOTE_RATE_LIMIT_COUNT = int(os.getenv("KURAI_RUN_QUOTE_RATE_LIMIT_COUNT", "30"))
KURAI_RUN_START_RATE_LIMIT_COUNT = int(os.getenv("KURAI_RUN_START_RATE_LIMIT_COUNT", "12"))
KURAI_SSE_MAX_SECONDS = int(os.getenv("KURAI_SSE_MAX_SECONDS", "30"))
KURAI_SSE_HEARTBEAT_SECONDS = int(os.getenv("KURAI_SSE_HEARTBEAT_SECONDS", "15"))
if KURAI_RUN_RATE_LIMIT_WINDOW_SECONDS <= 0:
    raise RuntimeError("KURAI_RUN_RATE_LIMIT_WINDOW_SECONDS must be positive")
if KURAI_CATALOG_MAX_AGE_SECONDS <= 0:
    raise RuntimeError("KURAI_CATALOG_MAX_AGE_SECONDS must be positive")
if KURAI_SSE_MAX_SECONDS < 0 or KURAI_SSE_HEARTBEAT_SECONDS <= 0:
    raise RuntimeError("KURAI_SSE_MAX_SECONDS must be non-negative and KURAI_SSE_HEARTBEAT_SECONDS must be positive")
if KURAI_VIDEO_DEFAULT_DURATION_SECONDS <= 0 or KURAI_VIDEO_POLL_SECONDS <= 0:
    raise RuntimeError("KURAI video duration and poll interval must be positive")
if KURAI_RESEARCH_SEARCH_ENGINE not in {"auto", "native", "exa", "firecrawl", "parallel", "perplexity"}:
    raise RuntimeError("KURAI_RESEARCH_SEARCH_ENGINE is invalid")
if not all(value > 0 for value in (KURAI_RESEARCH_MAX_RESULTS, KURAI_RESEARCH_MAX_TOTAL_RESULTS, KURAI_RESEARCH_MAX_USES, KURAI_RESEARCH_MAX_TOOL_CALLS, KURAI_RESEARCH_MAX_SOURCE_CHARACTERS)):
    raise RuntimeError("KURAI research limits must be positive")
if KURAI_RESEARCH_MAX_RESULTS > 25 or KURAI_RESEARCH_MAX_TOOL_CALLS > 30:
    raise RuntimeError("KURAI research limits exceed the OpenRouter server-tool bounds")
if KURAI_RESEARCH_SEARCH_COST_USD_PER_USE < 0:
    raise RuntimeError("KURAI_RESEARCH_SEARCH_COST_USD_PER_USE must be non-negative")
if not all(value > 0 for value in KURAI_VIDEO_DURATIONS) or KURAI_VIDEO_DEFAULT_DURATION_SECONDS not in KURAI_VIDEO_DURATIONS:
    raise RuntimeError("KURAI_VIDEO_DURATIONS must be positive and include the default duration")
if KURAI_WEB_MAX_USES <= 0 or KURAI_RESEARCH_DEEP_MAX_USES < KURAI_RESEARCH_MAX_USES or not 1 <= KURAI_THINK_COMPLETION_MULTIPLIER <= 8:
    raise RuntimeError("KURAI web, research depth or reasoning limits are invalid")
if not DEBUG and not OPENROUTER_API_KEY:
    raise RuntimeError("OPENROUTER_API_KEY must be configured outside development")
# Mail: real delivery needs an SMTP host; in development letters print to the server log.
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "1") == "1"
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND") or (
    "django.core.mail.backends.console.EmailBackend" if DEBUG and not EMAIL_HOST else "django.core.mail.backends.smtp.EmailBackend"
)
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "KURAI <no-reply@kurai.local>")
# links in letters lead to the web app; the first allowed origin is the default
KURAI_FRONTEND_URL = (os.getenv("KURAI_FRONTEND_URL") or (CORS_ALLOWED_ORIGINS[0] if CORS_ALLOWED_ORIGINS else "http://localhost:3000")).rstrip("/")
PASSWORD_RESET_TIMEOUT = int(os.getenv("PASSWORD_RESET_TIMEOUT_SECONDS", str(2 * 3600)))
KURAI_EMAIL_VERIFY_MAX_AGE_SECONDS = int(os.getenv("KURAI_EMAIL_VERIFY_MAX_AGE_SECONDS", str(3 * 86400)))
AUTH_RATE_LIMIT_COUNT = int(os.getenv("AUTH_RATE_LIMIT_COUNT", "20"))
AUTH_RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("AUTH_RATE_LIMIT_WINDOW_SECONDS", "60"))
if DEBUG:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "kurai-dev"}}
else:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": os.getenv("REDIS_CACHE_URL", "redis://redis:6379/1")}}
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
SECURE_SSL_REDIRECT = not DEBUG
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 0 if DEBUG else int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
