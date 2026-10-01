from django.http import FileResponse
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response

from kurai.api import KuraiAPIView
from media.models import GeneratedAsset


def generated_asset_payload(asset: GeneratedAsset) -> dict:
    return {
        "id": str(asset.id), "kind": asset.kind, "url": f"/api/v1/media/{asset.id}/download",
        "contentType": asset.content_type, "sizeBytes": asset.size_bytes, "prompt": asset.prompt,
        "model": asset.resolved_model, "costMicro": asset.cost_micro, "chatId": str(asset.run.chat_id),
        "messageId": str(asset.message_id), "createdAt": asset.created_at.isoformat(),
    }


class MediaCollectionView(KuraiAPIView):
    @extend_schema(responses=None)
    def get(self, request):
        assets = GeneratedAsset.objects.filter(owner=request.user).select_related("run").only(
            "id", "kind", "content_type", "size_bytes", "prompt", "resolved_model", "cost_micro", "run__chat_id", "message_id", "created_at"
        )
        return Response({"data": [generated_asset_payload(asset) for asset in assets]})


class MediaDownloadView(KuraiAPIView):
    @extend_schema(responses=None)
    def get(self, request, asset_id):
        asset = GeneratedAsset.objects.filter(id=asset_id, owner=request.user).first()
        if asset is None:
            return Response({"error": {"code": "not_found", "message": "Медиафайл не найден."}}, status=404)
        response = FileResponse(asset.file.open("rb"), as_attachment=False, filename=asset.file.name.rsplit("/", 1)[-1], content_type=asset.content_type)
        response["Cache-Control"] = "private, no-store"
        return response
