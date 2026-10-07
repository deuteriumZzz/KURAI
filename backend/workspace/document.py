"""A minimal .docx (WordprocessingML) without third-party libraries: cover, headings, lists, code and sources."""

import io
import re
import zipfile
from xml.sax.saxutils import escape

CONTENT_TYPES = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    "</Types>"
)
RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    "</Relationships>"
)
NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
# XML 1.0 forbids most control characters; model output may contain them
CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def _run(text: str, *, bold: bool = False, size: int | None = None, mono: bool = False, color: str | None = None) -> str:
    props = ("<w:b/>" if bold else "") + (f'<w:sz w:val="{size}"/>' if size else "")
    props += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>' if mono else ""
    props += f'<w:color w:val="{color}"/>' if color else ""
    rpr = f"<w:rPr>{props}</w:rPr>" if props else ""
    return f'<w:r>{rpr}<w:t xml:space="preserve">{escape(CONTROL.sub("", text))}</w:t></w:r>'


def _inline(text: str, **style) -> str:
    """**жирный** остаётся жирным, ссылки [текст](адрес) — текстом с адресом в скобках, `код` — без кавычек."""
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r"\1 (\2)", text).replace("`", "")
    return "".join(_run(chunk, bold=bool(i % 2) or style.get("bold", False), size=style.get("size")) for i, chunk in enumerate(text.split("**")) if chunk)


def _para(runs: str, *, after: int = 120, page_break: bool = False, indent: int = 0) -> str:
    ppr = f'<w:spacing w:after="{after}"/>' + (f'<w:ind w:left="{indent}"/>' if indent else "") + ("<w:pageBreakBefore/>" if page_break else "")
    return f"<w:p><w:pPr>{ppr}</w:pPr>{runs}</w:p>"


def build_document(*, title: str, code: str, meta: str, text: str, sources: list[tuple[str, str]]) -> bytes:
    body = [
        _para(_run(code, mono=True, size=18, color="777777"), after=480),
        _para(_run(title, size=52), after=240),
        _para(_run(meta, size=20, color="555555"), after=240),
    ]
    first = True
    in_code = False
    for line in text.splitlines():
        if line.strip().startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            body.append(_para(_run(line or " ", mono=True, size=18), after=0, page_break=first))
        elif not line.strip():
            continue
        elif heading := re.match(r"^(#{1,3})\s+(.+)$", line):
            body.append(_para(_inline(heading.group(2), bold=True, size=36 - 4 * len(heading.group(1))), after=160, page_break=first))
        elif item := re.match(r"^\s*(?:[-*•]|(\d+)[.)])\s+(.+)$", line):
            marker = f"{item.group(1)}. " if item.group(1) else "• "
            body.append(_para(_run(marker) + _inline(item.group(2)), after=80, indent=360, page_break=first))
        else:
            body.append(_para(_inline(line), page_break=first))
        first = False
    if sources:
        body.append(_para(_run("Источники", bold=True, size=28), after=200, page_break=True))
        body.extend(_para(_run(f"[{n}] ", mono=True, size=18) + _run(f"{label} — {url}", size=20), after=80) for n, (label, url) in enumerate(sources, start=1))
    section = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>'
    document = f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document {NS}><w:body>{"".join(body)}{section}</w:body></w:document>'
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", CONTENT_TYPES)
        archive.writestr("_rels/.rels", RELS)
        archive.writestr("word/document.xml", document)
    return buffer.getvalue()
