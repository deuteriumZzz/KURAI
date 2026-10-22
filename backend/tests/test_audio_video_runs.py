from decimal import Decimal
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client
from django.test.utils import override_settings

from ledger.services import available_balance_micro, grant_credits
from media.models import GeneratedAsset
from model_catalog.models import CatalogModel
from runs.models import Run
from runs.providers.openrouter import AudioGeneration, VideoGeneration, VideoGenerationStatus
from runs.services import usd_to_micro
from runs.worker import poll_video_run, process_run
from workspace.models import Chat


def signed_in_client():
    member = get_user_model().objects.create_user(email="media@example.test", password="safe-test-password")
    client = Client()
    client.force_login(member)
    return member, client


def media_model(model_id: str, output: str, *, price: str) -> CatalogModel:
    return CatalogModel.objects.create(
        id=model_id,
        name=model_id,
        provider="Acme",
        input_modalities=["text"],
        output_modalities=[output],
        audio_price_usd_per_character=price if output == "speech" else "0",
        video_price_usd_per_second=price if output == "video" else "0",
    )


def create_run(client, member, *, mode: str, model_id: str, prompt: str):
    grant_credits(member, 100_000, correlation_id=f"{mode}-grant")
    chat = Chat.objects.create(owner=member, title=f"{mode} chat")
    quote = client.post(
        "/api/v1/runs/quote",
        data={"mode": mode, "modelId": model_id, "text": prompt},
        content_type="application/json",
    ).json()["data"]
    return client.post(
        "/api/v1/runs",
        data={"chatId": str(chat.id), "quoteId": quote["quoteId"], "mode": mode, "modelId": model_id, "text": prompt},
        content_type="application/json",
        headers={"Idempotency-Key": f"{mode}-run"},
    ).json()["data"]


@override_settings(OPENROUTER_API_KEY="test-key")
@patch("runs.worker.generate_openrouter_audio")
def test_audio_run_persists_private_audio_and_settles_its_hold(generate, db):
    member, client = signed_in_client()
    voice = media_model("acme/voice", "speech", price="0.000100000000000")
    voice.media_spec = {"voices": ["nadine", "bram"]}
    voice.save(update_fields=("media_spec",))
    created = create_run(client, member, mode="audio", model_id="acme/voice", prompt="Добрый вечер, команда")
    generate.return_value = AudioGeneration(
        data=b"ID3test-audio", content_type="audio/mpeg", model_id="acme/voice-v2", provider_request_id="audio-1",
    )

    process_run(created["runId"])

    run = Run.objects.select_related("output_message", "hold").get(id=created["runId"])
    part = run.output_message.parts[0]
    assert run.status == Run.Status.COMPLETED
    # без голоса часть моделей отклоняет запрос — уходит первый объявленный
    assert generate.call_args.kwargs["voice"] == "nadine"
    assert part["type"] == "audio"
    assert part["url"].startswith("/api/v1/media/")
    assert run.attempts.get().resolved_model == "acme/voice-v2"
    assert run.hold.consumed_at is not None
    assert available_balance_micro(member.credit_account) < 100_000
    GeneratedAsset.objects.get(id=part["assetId"]).file.delete(save=False)


@override_settings(OPENROUTER_API_KEY="test-key")
@patch("runs.worker.schedule_video_poll")
@patch("runs.worker.submit_openrouter_video")
@patch("runs.worker.download_openrouter_video")
@patch("runs.worker.get_openrouter_video")
def test_video_run_uses_provider_job_then_persists_private_video(get_video, download_video, submit_video, schedule_poll, db):
    member, client = signed_in_client()
    media_model("acme/video", "video", price="0.010000000000000")
    created = create_run(client, member, mode="video", model_id="acme/video", prompt="Свет в ночном городе")
    submit_video.return_value = VideoGeneration(job_id="video-job-1")

    process_run(created["runId"])
    run = Run.objects.select_related("output_message").get(id=created["runId"])
    assert run.status == Run.Status.RUNNING
    assert run.attempts.get().provider_request_id == "video-job-1"
    schedule_poll.assert_called_once()

    get_video.return_value = VideoGenerationStatus(status="completed", model_id="acme/video-v2", cost_usd=Decimal("0.020"))
    download_video.return_value = (b"video-bytes", "video/mp4")
    poll_video_run(created["runId"], str(run.attempts.get().id))

    run.refresh_from_db()
    run.output_message.refresh_from_db()
    part = run.output_message.parts[0]
    assert run.status == Run.Status.COMPLETED
    assert part["type"] == "video"
    assert part["url"].startswith("/api/v1/media/")
    assert run.attempts.get().resolved_model == "acme/video-v2"
    GeneratedAsset.objects.get(id=part["assetId"]).file.delete(save=False)


@override_settings(OPENROUTER_API_KEY="test-key")
def test_audio_and_video_are_listed_only_for_compatible_models(db):
    _, client = signed_in_client()
    media_model("acme/voice", "speech", price="0.000100000000000")
    media_model("acme/video", "video", price="0.010000000000000")

    audio = client.get("/api/v1/models?mode=audio")
    video = client.get("/api/v1/models?mode=video")
    capabilities = client.get("/api/v1/capabilities")

    assert [item["id"] for item in audio.json()["data"]] == ["acme/voice"]
    assert [item["id"] for item in video.json()["data"]] == ["acme/video"]
    modes = {item["id"]: item for item in capabilities.json()["data"]["modes"]}
    assert modes["audio"]["available"] is True
    assert modes["video"]["available"] is True


@override_settings(OPENROUTER_API_KEY="test-key")
@patch("runs.worker.schedule_video_poll")
@patch("runs.worker.submit_openrouter_video")
def test_video_quote_and_submit_use_the_length_the_model_accepts(submit_video, schedule_poll, db):
    member, client = signed_in_client()
    model = media_model("acme/veo", "video", price="0.010000000000000")
    model.media_spec = {"durations": [4, 6, 8], "resolution": "720p", "aspects": ["16:9", "9:16"]}
    model.save(update_fields=("media_spec",))
    created = create_run(client, member, mode="video", model_id="acme/veo", prompt="Рассвет над морем")
    submit_video.return_value = VideoGeneration(job_id="video-job-2")

    process_run(created["runId"])

    # по умолчанию просили 5 с, модель умеет 4/6/8 — и резерв, и запрос идут за 6 с
    assert submit_video.call_args.kwargs["duration"] == 6
    assert submit_video.call_args.kwargs["resolution"] == "720p"
    assert submit_video.call_args.kwargs["aspect_ratio"] == "16:9"
    assert Run.objects.get(id=created["runId"]).estimated_cost_micro == max(settings.KURAI_MIN_RUN_COST_MICRO, usd_to_micro(Decimal("0.06")))
