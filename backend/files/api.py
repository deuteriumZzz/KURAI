import hashlib
from pathlib import Path
from zipfile import BadZipFile, ZipFile

from django.http import FileResponse
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response

from files.models import FileAsset
from kurai.api import KuraiAPIView

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "text/plain", "text/markdown", "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg", "image/png", "image/webp", "image/gif", "audio/mpeg", "audio/wav", "audio/x-wav",
}
ALLOWED_SUFFIXES = {".txt", ".md", ".pdf", ".doc", ".docx", ".xlsx", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp3", ".wav"}
SIGNATURE_BYTES = 64 * 1024
MAX_OFFICE_ARCHIVE_ENTRIES = 10_000
MAX_OFFICE_UNCOMPRESSED_BYTES = 100 * 1024 * 1024


def upload_prefix(uploaded, length: int = SIGNATURE_BYTES) -> bytes:
    """Read a bounded prefix without changing the upload cursor for storage."""
    uploaded.seek(0)
    prefix = uploaded.read(length)
    uploaded.seek(0)
    return prefix


def valid_office_archive(uploaded, required_part: str) -> bool:
    """Confirm that a DOCX/XLSX is the expected OOXML package, not just any ZIP."""
    try:
        uploaded.seek(0)
        with ZipFile(uploaded) as archive:
            entries = archive.infolist()
            if len(entries) > MAX_OFFICE_ARCHIVE_ENTRIES:
                return False
            if any(entry.flag_bits & 0x1 for entry in entries):  # encrypted archives cannot be inspected safely
                return False
            if sum(entry.file_size for entry in entries) > MAX_OFFICE_UNCOMPRESSED_BYTES:
                return False
            names = {entry.filename for entry in entries}
            return "[Content_Types].xml" in names and required_part in names
    except BadZipFile:
        return False
    finally:
        uploaded.seek(0)


def content_matches_type(uploaded, content_type: str) -> bool:
    """Cheap, bounded content sniffing. This complements—not replaces—malware scanning."""
    prefix = upload_prefix(uploaded)
    if content_type == "application/pdf":
        return prefix.startswith(b"%PDF-")
    if content_type == "image/jpeg":
        return prefix.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return prefix.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/gif":
        return prefix.startswith((b"GIF87a", b"GIF89a"))
    if content_type == "image/webp":
        return len(prefix) >= 12 and prefix[:4] == b"RIFF" and prefix[8:12] == b"WEBP"
    if content_type in {"audio/wav", "audio/x-wav"}:
        return len(prefix) >= 12 and prefix[:4] == b"RIFF" and prefix[8:12] == b"WAVE"
    if content_type == "audio/mpeg":
        return prefix.startswith(b"ID3") or (len(prefix) >= 2 and prefix[0] == 0xFF and (prefix[1] & 0xE0) == 0xE0)
    if content_type == "application/msword":
        return prefix.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")
    if content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return valid_office_archive(uploaded, "word/document.xml")
    if content_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        return valid_office_archive(uploaded, "xl/workbook.xml")
    if content_type in {"text/plain", "text/markdown"}:
        try:
            return b"\x00" not in prefix and bool(prefix.decode("utf-8-sig"))
        except UnicodeDecodeError:
            return False
    return False


def asset_payload(asset: FileAsset) -> dict:
    return {
        "id": str(asset.id), "name": asset.original_name, "contentType": asset.content_type,
        "sizeBytes": asset.size_bytes, "sha256": asset.sha256, "createdAt": asset.created_at.isoformat(),
    }


def validation_error(message: str) -> Response:
    return Response({"error": {"code": "validation_error", "message": message}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)


class FileCollectionView(KuraiAPIView):
    @extend_schema(responses=None)
    def get(self, request):
        assets = FileAsset.objects.filter(owner=request.user).only("id", "original_name", "content_type", "size_bytes", "sha256", "created_at")
        return Response({"data": [asset_payload(asset) for asset in assets]})

    @extend_schema(request=None, responses=None)
    def post(self, request):
        uploaded = request.FILES.get("file")
        if uploaded is None:
            return validation_error("Прикрепите файл.")
        suffix = Path(uploaded.name).suffix.lower()
        if uploaded.size <= 0 or uploaded.size > MAX_UPLOAD_BYTES:
            return validation_error("Размер файла должен быть от 1 байта до 50 МБ.")
        if uploaded.content_type not in ALLOWED_CONTENT_TYPES or suffix not in ALLOWED_SUFFIXES:
            return validation_error("Этот тип файла не поддерживается.")
        if not content_matches_type(uploaded, uploaded.content_type):
            return validation_error("Содержимое файла не соответствует заявленному типу.")
        digest = hashlib.sha256()
        for chunk in uploaded.chunks():
            digest.update(chunk)
        uploaded.seek(0)
        asset = FileAsset.objects.create(
            owner=request.user, file=uploaded, original_name=Path(uploaded.name).name,
            content_type=uploaded.content_type, size_bytes=uploaded.size, sha256=digest.hexdigest(),
        )
        return Response({"data": asset_payload(asset)}, status=status.HTTP_201_CREATED)


class FileDownloadView(KuraiAPIView):
    @extend_schema(responses=None)
    def get(self, request, file_id):
        asset = FileAsset.objects.filter(id=file_id, owner=request.user).first()
        if asset is None:
            return Response({"error": {"code": "not_found", "message": "Файл не найден."}}, status=status.HTTP_404_NOT_FOUND)
        response = FileResponse(asset.file.open("rb"), as_attachment=True, filename=asset.original_name, content_type=asset.content_type)
        response["Cache-Control"] = "private, no-store"
        return response
