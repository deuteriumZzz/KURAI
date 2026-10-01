import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class Quote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quotes")
    mode = models.CharField(max_length=24)
    request_hash = models.CharField(max_length=64)
    resolved_model = models.CharField(max_length=160, default="openrouter/auto")
    attachment_ids = models.JSONField(default=list)
    estimated_cost_micro = models.BigIntegerField()
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=("user", "expires_at"), name="run_quote_user_expiry_ix")]


class CompareRun(models.Model):
    """One user prompt with two or three explicitly selected, auditable routes."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="compare_runs")
    chat = models.ForeignKey("workspace.Chat", on_delete=models.CASCADE, related_name="compare_runs")
    input_message = models.ForeignKey("workspace.Message", on_delete=models.CASCADE, related_name="compare_runs")
    mode = models.CharField(max_length=24)
    idempotency_key = models.CharField(max_length=128)
    payload_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("user", "idempotency_key"), name="compare_run_user_idempotency_uniq")]
        indexes = [models.Index(fields=("user", "-created_at"), name="compare_run_user_created_ix")]


class Run(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCEL_REQUESTED = "cancel_requested", "Cancel requested"
        CANCELED = "canceled", "Canceled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="runs")
    chat = models.ForeignKey("workspace.Chat", on_delete=models.CASCADE, related_name="runs")
    quote = models.ForeignKey(Quote, on_delete=models.PROTECT, related_name="runs")
    comparison = models.ForeignKey(CompareRun, null=True, blank=True, on_delete=models.CASCADE, related_name="runs")
    comparison_position = models.PositiveSmallIntegerField(null=True, blank=True)
    input_message = models.ForeignKey("workspace.Message", null=True, blank=True, on_delete=models.SET_NULL, related_name="input_runs")
    output_message = models.ForeignKey("workspace.Message", null=True, blank=True, on_delete=models.SET_NULL, related_name="output_runs")
    mode = models.CharField(max_length=24)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.QUEUED)
    idempotency_key = models.CharField(max_length=128)
    payload_hash = models.CharField(max_length=64)
    estimated_cost_micro = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("user", "idempotency_key"), name="runs_user_idempotency_uniq")]
        indexes = [models.Index(fields=("user", "-updated_at"), name="run_user_updated_ix")]


class RunAttempt(models.Model):
    class Status(models.TextChoices):
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELED = "canceled", "Canceled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(Run, on_delete=models.CASCADE, related_name="attempts")
    provider = models.CharField(max_length=32)
    requested_model = models.CharField(max_length=160)
    resolved_model = models.CharField(max_length=160, blank=True)
    provider_request_id = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.RUNNING)
    billed_cost_micro = models.BigIntegerField(null=True, blank=True)
    error_code = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)


class RunAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(Run, on_delete=models.CASCADE, related_name="attachments")
    file = models.ForeignKey("files.FileAsset", on_delete=models.PROTECT, related_name="run_attachments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=("run", "file"), name="run_attachment_unique")]


class CreditHold(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.OneToOneField(Run, on_delete=models.CASCADE, related_name="hold")
    account = models.ForeignKey("ledger.CreditAccount", on_delete=models.PROTECT, related_name="holds")
    reserved_micro = models.BigIntegerField()
    released_at = models.DateTimeField(null=True, blank=True)
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(reserved_micro__gt=0), name="run_hold_amount_positive")]


class RunEvent(models.Model):
    class Type(models.TextChoices):
        QUEUED = "queued", "Queued"
        ROUTED = "routed", "Routed"
        DELTA = "delta", "Delta"
        MEDIA = "media", "Media"
        SOURCE = "source", "Source"
        CANCEL_REQUESTED = "cancel_requested", "Cancel requested"
        DONE = "done", "Done"
        ERROR = "error", "Error"
        CANCELED = "canceled", "Canceled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(Run, on_delete=models.CASCADE, related_name="events")
    seq = models.PositiveIntegerField()
    type = models.CharField(max_length=16, choices=Type.choices)
    payload = models.JSONField(default=dict)
    occurred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("seq",)
        constraints = [models.UniqueConstraint(fields=("run", "seq"), name="run_event_sequence_uniq")]


class RunSource(models.Model):
    """An immutable, owner-scoped citation returned by a research provider."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(Run, on_delete=models.CASCADE, related_name="sources")
    message = models.ForeignKey("workspace.Message", on_delete=models.CASCADE, related_name="research_sources")
    position = models.PositiveSmallIntegerField()
    url = models.URLField(max_length=2048)
    title = models.CharField(max_length=300)
    excerpt = models.TextField(blank=True, max_length=4000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("position",)
        constraints = [
            models.UniqueConstraint(fields=("run", "url"), name="run_source_url_uniq"),
            models.UniqueConstraint(fields=("run", "position"), name="run_source_position_uniq"),
        ]
