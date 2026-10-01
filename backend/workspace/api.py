from drf_spectacular.utils import extend_schema
from django.http import HttpResponse
from django.db.models import Sum
from rest_framework import serializers, status
from rest_framework.response import Response

from kurai.api import KuraiAPIView
from runs.models import Run, RunAttempt
from workspace.models import Artifact, Chat, Message, Project, Recipe
from workspace.presentation import build_presentation


class ProjectInputSerializer(serializers.Serializer):
    name = serializers.CharField(trim_whitespace=True, min_length=1, max_length=120)
    accent = serializers.ChoiceField(choices=Project.Accent.values, default=Project.Accent.CYAN, required=False)


class ChatInputSerializer(serializers.Serializer):
    title = serializers.CharField(trim_whitespace=True, min_length=1, max_length=160)
    projectId = serializers.UUIDField(required=False, allow_null=True, source="project_id")


class ProjectOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    accent = serializers.CharField()
    createdAt = serializers.DateTimeField()


class ChatOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    projectId = serializers.UUIDField(allow_null=True)
    pinned = serializers.BooleanField()
    createdAt = serializers.DateTimeField()


class ProjectListEnvelopeSerializer(serializers.Serializer):
    data = ProjectOutputSerializer(many=True)


class ProjectEnvelopeSerializer(serializers.Serializer):
    data = ProjectOutputSerializer()


class ChatEnvelopeSerializer(serializers.Serializer):
    data = ChatOutputSerializer()


class ChatListEnvelopeSerializer(serializers.Serializer):
    data = ChatOutputSerializer(many=True)


class MessageOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    chatId = serializers.UUIDField()
    parentId = serializers.UUIDField(allow_null=True)
    role = serializers.CharField()
    mode = serializers.CharField()
    model = serializers.CharField(allow_null=True)
    parts = serializers.ListField()
    costMicro = serializers.IntegerField()
    createdAt = serializers.DateTimeField()


class ChatSnapshotDataSerializer(serializers.Serializer):
    chat = ChatOutputSerializer()
    messages = MessageOutputSerializer(many=True)


class ChatSnapshotEnvelopeSerializer(serializers.Serializer):
    data = ChatSnapshotDataSerializer()


class SlideExportSerializer(serializers.Serializer):
    title = serializers.CharField(trim_whitespace=True, min_length=1, max_length=120, required=False)


class ArtifactInputSerializer(serializers.Serializer):
    messageId = serializers.UUIDField()
    kind = serializers.ChoiceField(choices=Artifact.Kind.values, default=Artifact.Kind.DOCUMENT, required=False)
    title = serializers.CharField(trim_whitespace=True, min_length=1, max_length=160, required=False)


class ArtifactOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    projectId = serializers.UUIDField(allow_null=True)
    chatId = serializers.UUIDField()
    sourceMessageId = serializers.UUIDField()
    kind = serializers.CharField()
    title = serializers.CharField()
    body = serializers.CharField()
    provenance = serializers.DictField()
    createdAt = serializers.DateTimeField()


class ArtifactEnvelopeSerializer(serializers.Serializer):
    data = ArtifactOutputSerializer()


class ArtifactListEnvelopeSerializer(serializers.Serializer):
    data = ArtifactOutputSerializer(many=True)


class RecipeInputSerializer(serializers.Serializer):
    messageId = serializers.UUIDField()
    title = serializers.CharField(trim_whitespace=True, min_length=1, max_length=160, required=False)


class RecipeOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    projectId = serializers.UUIDField(allow_null=True)
    chatId = serializers.UUIDField()
    sourceMessageId = serializers.UUIDField()
    title = serializers.CharField()
    prompt = serializers.CharField()
    mode = serializers.CharField()
    model = serializers.CharField(allow_blank=True)
    sourceCostMicro = serializers.IntegerField()
    createdAt = serializers.DateTimeField()


class RecipeEnvelopeSerializer(serializers.Serializer):
    data = RecipeOutputSerializer()


class RecipeListEnvelopeSerializer(serializers.Serializer):
    data = RecipeOutputSerializer(many=True)


def project_payload(project: Project) -> dict:
    return {"id": str(project.id), "name": project.name, "accent": project.accent, "createdAt": project.created_at.isoformat()}


def chat_payload(chat: Chat) -> dict:
    return {
        "id": str(chat.id),
        "title": chat.title,
        "projectId": str(chat.project_id) if chat.project_id else None,
        "pinned": chat.pinned,
        "createdAt": chat.created_at.isoformat(),
    }


def message_payload(message: Message, *, cost_micro: int = 0) -> dict:
    return {
        "id": str(message.id),
        "chatId": str(message.chat_id),
        "parentId": str(message.parent_id) if message.parent_id else None,
        "role": message.role,
        "mode": message.mode,
        "model": message.resolved_model or message.requested_model or None,
        "parts": message.parts,
        "costMicro": cost_micro,
        "createdAt": message.created_at.isoformat(),
    }


def artifact_payload(artifact: Artifact) -> dict:
    return {
        "id": str(artifact.id),
        "projectId": str(artifact.project_id) if artifact.project_id else None,
        "chatId": str(artifact.chat_id),
        "sourceMessageId": str(artifact.source_message_id),
        "kind": artifact.kind,
        "title": artifact.title,
        "body": artifact.body,
        "provenance": artifact.provenance,
        "createdAt": artifact.created_at.isoformat(),
    }


def recipe_payload(recipe: Recipe) -> dict:
    return {
        "id": str(recipe.id),
        "projectId": str(recipe.project_id) if recipe.project_id else None,
        "chatId": str(recipe.chat_id),
        "sourceMessageId": str(recipe.source_message_id),
        "title": recipe.title,
        "prompt": recipe.prompt,
        "mode": recipe.mode,
        "model": recipe.model,
        "sourceCostMicro": recipe.source_cost_micro,
        "createdAt": recipe.created_at.isoformat(),
    }


def validation_error(serializer: serializers.Serializer) -> Response:
    return Response(
        {"error": {"code": "validation_error", "message": "Проверьте параметры запроса.", "details": serializer.errors}},
        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


class ProjectCollectionView(KuraiAPIView):
    @extend_schema(responses=ProjectListEnvelopeSerializer)
    def get(self, request):
        projects = Project.objects.filter(owner=request.user).only("id", "name", "accent", "created_at")
        return Response({"data": [project_payload(project) for project in projects]})

    @extend_schema(request=ProjectInputSerializer, responses={201: ProjectEnvelopeSerializer})
    def post(self, request):
        serializer = ProjectInputSerializer(data=request.data)
        if not serializer.is_valid():
            return validation_error(serializer)
        project = Project.objects.create(owner=request.user, **serializer.validated_data)
        return Response({"data": project_payload(project)}, status=status.HTTP_201_CREATED)


class ChatCollectionView(KuraiAPIView):
    @extend_schema(operation_id="v1_chats_list", responses=ChatListEnvelopeSerializer)
    def get(self, request):
        chats = Chat.objects.filter(owner=request.user).only("id", "title", "project_id", "pinned", "created_at")
        return Response({"data": [chat_payload(chat) for chat in chats]})

    @extend_schema(request=ChatInputSerializer, responses={201: ChatEnvelopeSerializer})
    def post(self, request):
        serializer = ChatInputSerializer(data=request.data)
        if not serializer.is_valid():
            return validation_error(serializer)
        data = serializer.validated_data
        project_id = data.pop("project_id", None)
        project = None
        if project_id:
            project = Project.objects.filter(id=project_id, owner=request.user).first()
            if project is None:
                return Response({"error": {"code": "not_found", "message": "Проект не найден."}}, status=status.HTTP_404_NOT_FOUND)
        chat = Chat.objects.create(owner=request.user, project=project, **data)
        return Response({"data": chat_payload(chat)}, status=status.HTTP_201_CREATED)


class ChatDetailView(KuraiAPIView):
    @extend_schema(operation_id="v1_chats_retrieve", responses=ChatSnapshotEnvelopeSerializer)
    def get(self, request, chat_id):
        chat = Chat.objects.filter(id=chat_id, owner=request.user).first()
        if chat is None:
            return Response({"error": {"code": "not_found", "message": "Диалог не найден."}}, status=status.HTTP_404_NOT_FOUND)
        messages = list(Message.objects.filter(chat=chat).only(
            "id", "chat_id", "parent_id", "role", "mode", "requested_model", "resolved_model", "parts", "text", "created_at"
        ))
        settled_costs = {
            row["run__output_message_id"]: row["cost_micro"] or 0
            for row in RunAttempt.objects.filter(
                run__output_message_id__in=[message.id for message in messages],
                status=RunAttempt.Status.COMPLETED,
                billed_cost_micro__isnull=False,
            ).values("run__output_message_id").annotate(cost_micro=Sum("billed_cost_micro"))
        }
        return Response({"data": {"chat": chat_payload(chat), "messages": [
            message_payload(message, cost_micro=settled_costs.get(message.id, 0)) for message in messages
        ]}})


class ArtifactCollectionView(KuraiAPIView):
    """List and create account-scoped answer snapshots; never accept arbitrary body content."""

    @extend_schema(operation_id="v1_artifacts_list", responses=ArtifactListEnvelopeSerializer)
    def get(self, request):
        artifacts = Artifact.objects.filter(owner=request.user).only(
            "id", "project_id", "chat_id", "source_message_id", "kind", "title", "body", "provenance", "created_at"
        )
        return Response({"data": [artifact_payload(artifact) for artifact in artifacts]})

    @extend_schema(request=ArtifactInputSerializer, responses={201: ArtifactEnvelopeSerializer})
    def post(self, request):
        serializer = ArtifactInputSerializer(data=request.data)
        if not serializer.is_valid():
            return validation_error(serializer)
        data = serializer.validated_data
        message = (
            Message.objects.filter(
                id=data["messageId"],
                chat__owner=request.user,
                role=Message.Role.ASSISTANT,
            )
            .select_related("chat", "chat__project")
            .prefetch_related("research_sources")
            .first()
        )
        if message is None:
            return Response({"error": {"code": "not_found", "message": "Ответ не найден."}}, status=status.HTTP_404_NOT_FOUND)
        body = message.text.strip()
        if not body:
            return Response(
                {"error": {"code": "empty_artifact", "message": "В этом ответе нет текста для сохранения."}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        settled_cost = (
            RunAttempt.objects.filter(
                run__output_message=message,
                status=RunAttempt.Status.COMPLETED,
                billed_cost_micro__isnull=False,
            ).aggregate(total=Sum("billed_cost_micro"))["total"]
            or 0
        )
        provenance = {
            "sourceMessageId": str(message.id),
            "model": message.resolved_model or message.requested_model or None,
            "mode": message.mode,
            "costMicro": settled_cost,
            "sources": [{"url": source.url, "title": source.title} for source in message.research_sources.all()],
        }
        artifact = Artifact.objects.create(
            owner=request.user,
            project=message.chat.project,
            chat=message.chat,
            source_message=message,
            kind=data.get("kind", Artifact.Kind.DOCUMENT),
            title=data.get("title") or message.chat.title,
            body=body,
            provenance=provenance,
        )
        return Response({"data": artifact_payload(artifact)}, status=status.HTTP_201_CREATED)


class ArtifactDetailView(KuraiAPIView):
    @extend_schema(operation_id="v1_artifacts_retrieve", responses=ArtifactEnvelopeSerializer)
    def get(self, request, artifact_id):
        artifact = Artifact.objects.filter(owner=request.user, id=artifact_id).first()
        if artifact is None:
            return Response({"error": {"code": "not_found", "message": "Артефакт не найден."}}, status=status.HTTP_404_NOT_FOUND)
        return Response({"data": artifact_payload(artifact)})


class RecipeCollectionView(KuraiAPIView):
    """Save repeatable routes from an owned completed run and list the member's recipes."""

    @extend_schema(responses=RecipeListEnvelopeSerializer)
    def get(self, request):
        recipes = Recipe.objects.filter(owner=request.user).only(
            "id", "project_id", "chat_id", "source_message_id", "title", "prompt", "mode", "model", "source_cost_micro", "created_at"
        )
        return Response({"data": [recipe_payload(recipe) for recipe in recipes]})

    @extend_schema(request=RecipeInputSerializer, responses={201: RecipeEnvelopeSerializer})
    def post(self, request):
        serializer = RecipeInputSerializer(data=request.data)
        if not serializer.is_valid():
            return validation_error(serializer)
        data = serializer.validated_data
        message = (
            Message.objects.filter(
                id=data["messageId"],
                chat__owner=request.user,
                role=Message.Role.ASSISTANT,
            )
            .select_related("chat", "chat__project")
            .first()
        )
        if message is None:
            return Response({"error": {"code": "not_found", "message": "Ответ не найден."}}, status=status.HTTP_404_NOT_FOUND)
        run = (
            RunAttempt.objects.filter(
                run__output_message=message,
                run__user=request.user,
                run__status=Run.Status.COMPLETED,
                run__input_message__isnull=False,
            )
            .select_related("run", "run__input_message")
            .order_by("-completed_at", "-created_at")
            .first()
        )
        if run is None or not run.run.input_message or not run.run.input_message.text.strip():
            return Response(
                {"error": {"code": "recipe_source_missing", "message": "Для этого ответа не найден исходный маршрут."}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        recipe, created = Recipe.objects.get_or_create(
            owner=request.user,
            source_message=message,
            defaults={
                "project": message.chat.project,
                "chat": message.chat,
                "title": data.get("title") or message.chat.title,
                "prompt": run.run.input_message.text.strip(),
                "mode": run.run.mode,
                "model": message.resolved_model or run.resolved_model or run.requested_model,
                "source_cost_micro": run.billed_cost_micro or 0,
            },
        )
        return Response({"data": recipe_payload(recipe)}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class MessageSlideExportView(KuraiAPIView):
    """Create a private attachment from an existing assistant answer; no public artifact URL is issued."""

    @extend_schema(request=SlideExportSerializer, responses=None)
    def post(self, request, message_id):
        serializer = SlideExportSerializer(data=request.data)
        if not serializer.is_valid():
            return validation_error(serializer)
        message = Message.objects.filter(id=message_id, chat__owner=request.user, role=Message.Role.ASSISTANT).prefetch_related("research_sources").first()
        if message is None:
            return Response({"error": {"code": "not_found", "message": "Ответ не найден."}}, status=status.HTTP_404_NOT_FOUND)
        text = message.text.strip()
        if not text:
            return Response(
                {"error": {"code": "empty_export", "message": "В этом ответе нет текста для презентации."}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        title = serializer.validated_data.get("title") or message.chat.title
        payload = build_presentation(title=title, text=text[:40_000], sources=message.research_sources.all())
        response = HttpResponse(payload, content_type="application/vnd.openxmlformats-officedocument.presentationml.presentation")
        response["Content-Disposition"] = 'attachment; filename="kurai-slides.pptx"'
        response["Cache-Control"] = "no-store"
        return response
