"""Run options: web search, longer reasoning and per-mode parameters.

Only allowlisted keys and values pass. The normalized dict is part of the quote's
request hash, so options cannot change between the price preflight and the launch,
and it is the only place the worker reads them from.
"""

from django.conf import settings


class RunOptionsError(ValueError):
    pass


def _bool(value) -> bool:
    return isinstance(value, bool)


def _one_of(*allowed):
    return lambda value: value in allowed and not isinstance(value, bool)


ASPECTS_IMAGE = ("1:1", "4:5", "16:9", "9:16")
ASPECTS_VIDEO = ("16:9", "9:16", "1:1")
STYLES = ("none", "cinema", "neon", "anime", "3d", "minimal")
CAMERAS = ("static", "push", "orbit")
LOOKS = ("kurai", "strict", "bright")


def _rules(mode: str) -> dict:
    """key -> (default, validator). Audio speed is intentionally absent: the provider contract is unverified."""
    if mode == "text":
        return {"web": (False, _bool), "think": (False, _bool)}
    if mode == "research":
        return {"think": (False, _bool), "depth": ("standard", _one_of("standard", "deep"))}
    if mode == "slides":
        return {"think": (False, _bool), "slides": (8, _one_of(5, 8, 12)), "look": ("kurai", _one_of(*LOOKS))}
    if mode == "image":
        return {"count": (1, _one_of(1, 2, 4)), "aspect": ("1:1", _one_of(*ASPECTS_IMAGE)), "style": ("none", _one_of(*STYLES))}
    if mode == "video":
        durations = tuple(settings.KURAI_VIDEO_DURATIONS)
        return {
            "duration": (settings.KURAI_VIDEO_DEFAULT_DURATION_SECONDS, _one_of(*durations)),
            "aspect": ("16:9", _one_of(*ASPECTS_VIDEO)),
            "camera": ("static", _one_of(*CAMERAS)),
        }
    return {}


def normalize_options(mode: str, raw) -> dict:
    """Return the canonical option set for a mode, filling defaults; reject anything unknown."""
    if raw is None:
        raw = {}
    if not isinstance(raw, dict):
        raise RunOptionsError("Параметры запуска должны быть объектом.")
    rules = _rules(mode)
    unknown = sorted(set(raw) - set(rules))
    if unknown:
        raise RunOptionsError(f"Параметр недоступен для этого режима: {', '.join(unknown)}.")
    normalized = {}
    for key, (default, valid) in rules.items():
        value = raw.get(key, default)
        if not valid(value):
            raise RunOptionsError(f"Недопустимое значение параметра «{key}».")
        normalized[key] = value
    return normalized


_STYLE_TEXT = {"cinema": "кинематографичный", "neon": "неон", "anime": "аниме", "3d": "3D", "minimal": "минимализм"}
_CAMERA_TEXT = {"push": "медленный наезд камеры", "orbit": "облёт камеры вокруг объекта"}
_LOOK_TEXT = {"strict": "строгое деловое оформление", "bright": "яркое контрастное оформление"}


def prompt_directives(mode: str, options: dict) -> str:
    """Parameters the provider has no field for become an explicit, server-authored instruction."""
    lines: list[str] = []
    if mode == "image":
        if options.get("aspect", "1:1") != "1:1":
            lines.append(f"Формат кадра {options['aspect']}.")
        if options.get("style", "none") != "none":
            lines.append(f"Стиль: {_STYLE_TEXT[options['style']]}.")
    elif mode == "video":
        if options.get("aspect", "16:9") != "16:9":
            lines.append(f"Формат кадра {options['aspect']}.")
        if options.get("camera", "static") != "static":
            lines.append(f"Камера: {_CAMERA_TEXT[options['camera']]}.")
    elif mode == "slides":
        lines.append(f"Сделай {options.get('slides', 8)} слайдов.")
        if options.get("look", "kurai") != "kurai":
            lines.append(f"Оформление: {_LOOK_TEXT[options['look']]}.")
    return " ".join(lines)


def search_uses(mode: str, options: dict) -> int:
    """How many web searches the run may perform (0 — no web tool)."""
    if mode == "research":
        return settings.KURAI_RESEARCH_DEEP_MAX_USES if options.get("depth") == "deep" else settings.KURAI_RESEARCH_MAX_USES
    if mode == "text" and options.get("web"):
        return settings.KURAI_WEB_MAX_USES
    return 0


def completion_tokens(options: dict) -> int:
    """Completion budget; longer reasoning gets a bounded multiple so the hold still covers it."""
    multiplier = settings.KURAI_THINK_COMPLETION_MULTIPLIER if options.get("think") else 1
    return settings.KURAI_MAX_COMPLETION_TOKENS * multiplier
