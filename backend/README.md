# KURAI API

The backend is a Django 5.2 API for the KURAI workspace. It owns sessions,
projects, chats, quote validation, credit holds, execution events and the
append-only credit ledger.

## Local launch

```bash
./.venv/bin/python manage.py migrate
KURAI_LOCAL_EXECUTE_RUNS=1 ./.venv/bin/python manage.py runserver 8000
```

Point the Next.js workspace to it with:

```bash
NEXT_PUBLIC_KURAI_API_BASE_URL=http://localhost:8000
```

The browser first requests `GET /api/v1/auth/csrf`, then sends the returned
token in `X-CSRFToken` for every state-changing request. Session cookies are
HttpOnly and use `SameSite=Lax`.

## Implemented vertical slice

- Email-first custom accounts, signup/login/logout/current session.
- Account-scoped projects and chats.
- Authoritative, expiring quotes; run creation requires `Idempotency-Key`.
- Transactional credit reserve, cancel/release, exact settlement and an
  immutable signed ledger.
- Durable event rows, replayed through SSE with `Last-Event-ID`; Redis carries
  only advisory wake-ups, so the database remains authoritative during a
  reconnect or Redis outage. Streams rotate after a bounded interval and send
  heartbeats, preventing orphaned web connections.
- Race-safe cancellation: queued runs are released immediately; active runs
  move through `cancel_requested` and are only released once the worker has
  confirmed the cancellation, so a late provider response cannot settle a
  released hold.
- Per-account fixed-window limits for price quotes and new launches, backed by
  Redis in production. Idempotent run replays bypass the launch limit.
- Account-scoped files with type/size policy, SHA-256 fingerprinting,
  bounded content-signature verification and private no-store attachment
  downloads; read-only, revocable chat share links.
- A deterministic local text provider (`runs.worker.process_run`) for
  development and contract tests. `KURAI_LOCAL_EXECUTE_RUNS=1` is an explicit
  local-only bridge; production dispatches it from a worker queue.
- An OpenRouter catalog that is synchronized every six hours by Celery Beat,
  including the dedicated video model registry. The UI receives only active
  models compatible with its selected mode; the
  selected model is part of the quote and idempotency hash, and the provider
  key remains server-only.
- OpenRouter text streaming, image generation, TTS and asynchronous video.
  Audio and image bytes are stored privately; video is submitted as a durable
  provider job and polled by bounded Celery tasks before its authenticated
  OpenRouter content endpoint is downloaded. Every result is linked to the
  immutable run/message record and served only through an owner-scoped media
  endpoint; actual provider usage settles the reserved hold (or the hold is
  released on failure).
- Research mode enables OpenRouter's server-side web-search tool with explicit
  caps. Only validated HTTP(S) URL citations are persisted as `RunSource`,
  replayed through SSE and projected into the assistant message; the quote
  reserves the configured maximum search-tool budget before dispatch.
- `POST /api/v1/messages/{messageId}/exports/slides` builds a private,
  KURAI-styled `.pptx` from an owned assistant response. The binary is returned
  directly as an attachment and is never published through a public URL.
- `GET /api/v1/me/export` returns a private ZIP containing the member profile,
  workspace graph and ledger history. It intentionally excludes passwords,
  sessions, provider credentials and raw uploaded-file bytes.

## Production boundary

The deployment topology is defined in `docker-compose.yml`: PostgreSQL is the
source of truth, Redis transports Celery work and also backs rate limiting, and
separate API/worker processes execute runs outside the request lifecycle.
`GET /api/v1/health` is a lightweight liveness probe; `GET /api/v1/ready`
verifies database readiness without revealing dependency details. Every HTTP
response carries a UUID `X-Request-ID` suitable for support-safe correlation.
`GET /api/v1/capabilities` and `GET /api/v1/status` expose only the modes and
catalog entries this deployment can actually execute; they deliberately do not
invent uptime, payment state or media availability. Video requires OpenRouter's
temporary provider-side retention while the async job is polled; do not enable
it in a zero-data-retention deployment.

The status endpoint returns `degraded` with safe reason codes if the provider
key is absent, the model catalog is empty, or the last catalog sync exceeds
`KURAI_CATALOG_MAX_AGE_SECONDS`. It does not expose the key, provider host, or
internal queue topology.

```bash
cp .env.production.example .env.production
# Replace every example secret and host before launch.
docker compose --env-file .env.production up --build
```

The first catalog synchronization can be run explicitly after setting the
server-only `OPENROUTER_API_KEY`:

```bash
docker compose --env-file .env.production exec api python manage.py sync_openrouter_models
```

The compose volume is suitable for a single-node MVP. Replace it with a private
S3-compatible storage backend plus malware scanning before accepting arbitrary
untrusted office documents. Set explicit production host/CORS values; the app
refuses `DJANGO_DEBUG=0` without `DATABASE_URL`, `KURAI_QUEUE_RUNS=1` and a
non-default secret. Provider calls remain worker-only; connecting paid providers
and payments requires their credentials, pricing, legal and data-retention setup.
