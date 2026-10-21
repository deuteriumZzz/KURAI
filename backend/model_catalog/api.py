from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers
from rest_framework.views import APIView
from rest_framework.response import Response

from kurai.api import KuraiAPIView, PublicReadThrottle
from model_catalog.models import CatalogModel
from model_catalog.capabilities import capability_payloads
from runs.services import estimate_cost_micro, estimate_parts_usd


class ModelOutputSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    provider = serializers.CharField()
    description = serializers.CharField()
    contextLength = serializers.IntegerField()
    inputModalities = serializers.ListField(child=serializers.CharField())
    outputModalities = serializers.ListField(child=serializers.CharField())
    priceHintMicro = serializers.IntegerField()
    priceKnown = serializers.BooleanField()
    supportedModes = serializers.ListField(child=serializers.CharField())


class ModelListEnvelopeSerializer(serializers.Serializer):
    data = ModelOutputSerializer(many=True)


class CapabilityView(APIView):
    """Public availability map used to avoid presenting simulated tools as live."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(responses=None)
    def get(self, request):
        return Response({"data": {"modes": capability_payloads()}})


def model_payload(model: CatalogModel, mode: str = "text") -> dict:
    return {
        "id": model.id,
        "name": model.name,
        "provider": model.provider,
        "description": model.description,
        "contextLength": model.context_length,
        "inputModalities": model.input_modalities,
        "outputModalities": model.output_modalities,
        "priceHintMicro": estimate_cost_micro(model=model, text="Типовой запрос для оценки", mode=mode),
        # бесплатная текстовая модель стоит минимальную сумму — это настоящая цена; у медиа без цены в снимке
        # каталога минимальная сумма — заглушка, и цену честнее не показывать
        "priceKnown": mode in {"text", "research", "slides"}
        or sum(estimate_parts_usd(model=model, text="Типовой запрос для оценки", mode=mode).values()) > 0,
        "supportedModes": model.supported_modes(),
    }


class ModelCollectionView(KuraiAPIView):
    """Public catalog: the same models and price hints a member sees before sending."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicReadThrottle]

    @extend_schema(responses=ModelListEnvelopeSerializer)
    def get(self, request):
        models = CatalogModel.objects.filter(active=True).order_by("name")
        mode = request.query_params.get("mode")
        if mode in {"text", "research", "slides", "image", "video", "audio"}:
            models = [model for model in models if mode in model.supported_modes()]
        # без режима цена считается в основном режиме модели: у видеомодели — за ролик, а не за текст
        return Response({"data": [model_payload(model, mode or (model.supported_modes() or ["text"])[0]) for model in models]})
