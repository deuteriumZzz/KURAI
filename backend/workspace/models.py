import uuid

from django.conf import settings
from django.db import models


class Project(models.Model):
    class Accent(models.TextChoices):
        CYAN = "cyan", "Cyan"
        MAGENTA = "magenta", "Magenta"
        LIME = "lime", "Lime"
        VIOLET = "violet", "Violet"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=120)
    accent = models.CharField(max_length=16, choices=Accent.choices, default=Accent.CYAN)
    # Shared rules for every chat in the project, sent to the model as a system message.
    instructions = models.TextField(blank=True, default="", max_length=4000)
    # Route new requests in the project start from; empty means the member's own default.
    default_model = models.CharField(max_length=160, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)
        indexes = [models.Index(fields=("owner", "-updated_at"), name="ws_project_owner_updated_ix")]


class Chat(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chats")
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.SET_NULL, related_name="chats")
    title = models.CharField(max_length=160)
    pinned = models.BooleanField(default=False)
    # Archived chats leave the history but keep runs and ledger records intact.
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)
        indexes = [models.Index(fields=("owner", "-updated_at"), name="ws_chat_owner_updated_ix")]


class Message(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"
        SYSTEM = "system", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="branches")
    role = models.CharField(max_length=16, choices=Role.choices)
    mode = models.CharField(max_length=24, default="text")
    requested_model = models.CharField(max_length=160, blank=True)
    resolved_model = models.CharField(max_length=160, blank=True)
    parts = models.JSONField(default=list)
    text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
        indexes = [models.Index(fields=("chat", "created_at"), name="ws_message_chat_created_ix")]


class Artifact(models.Model):
    """A private, durable snapshot of one useful assistant answer and its provenance."""

    class Kind(models.TextChoices):
        DOCUMENT = "document", "Document"
        SPECIFICATION = "specification", "Specification"
        TABLE = "table", "Table"
        RECIPE = "recipe", "Recipe"
        RESEARCH_PACKET = "research_packet", "Research packet"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="artifacts")
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.SET_NULL, related_name="artifacts")
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="artifacts")
    source_message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="artifacts")
    kind = models.CharField(max_length=24, choices=Kind.choices, default=Kind.DOCUMENT)
    title = models.CharField(max_length=160)
    body = models.TextField()
    provenance = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("owner", "-created_at"), name="ws_artifact_owner_created_ix")]


class Recipe(models.Model):
    """A reusable route derived from a completed owned answer, never an arbitrary prompt dump."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recipes")
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.SET_NULL, related_name="recipes")
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="recipes")
    source_message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="recipes")
    title = models.CharField(max_length=160)
    prompt = models.TextField(max_length=20_000)
    mode = models.CharField(max_length=24)
    model = models.CharField(max_length=160, blank=True)
    source_cost_micro = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [models.UniqueConstraint(fields=("owner", "source_message"), name="ws_recipe_owner_source_uniq")]
        indexes = [models.Index(fields=("owner", "-created_at"), name="ws_recipe_owner_created_ix")]
