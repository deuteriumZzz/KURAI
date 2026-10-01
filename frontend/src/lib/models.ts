import type { Micro, Mode } from "@/types/api";

type CatalogRecord = {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextLength: number;
  inputModalities?: string[];
  outputModalities?: string[];
  supportedModes: Mode[];
  priceHintMicro: Micro;
};

export type ModelGroup = "auto" | "smart" | "fast" | "cheap" | "image" | "video" | "audio";

export type ModelInfo = {
  id: string;
  name: string;
  provider: string;
  /** Буква-эмблема провайдера (монохромная, без чужих логотипов). */
  emblem: string;
  group: ModelGroup;
  modes: Mode[];
  /** Оценка стоимости типового запроса (для медиа — за пакет: 4 картинки / 8 с видео). */
  priceHintMicro: Micro;
  contextK: number;
  /** 1–10: скорость, качество, выгода (чем выше — тем дешевле), контекст. */
  stats: { speed: number; quality: number; value: number; context: number };
  note: string;
};

const TEXT: Mode[] = ["text", "research", "slides"];

export const MODELS: ModelInfo[] = [
  { id: "auto", name: "Авто", provider: "KURAI", emblem: "K", group: "auto", modes: TEXT, priceHintMicro: 20_000, contextK: 1000, stats: { speed: 8, quality: 9, value: 8, context: 10 }, note: "Подбираем доступную модель под задачу до запуска" },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "Anthropic", emblem: "A", group: "smart", modes: TEXT, priceHintMicro: 90_000, contextK: 1000, stats: { speed: 5, quality: 10, value: 3, context: 10 }, note: "Сложные рассуждения, код, длинные документы" },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", provider: "Anthropic", emblem: "A", group: "smart", modes: TEXT, priceHintMicro: 20_000, contextK: 1000, stats: { speed: 8, quality: 9, value: 7, context: 10 }, note: "Тексты, редактура, аналитика" },
  { id: "gpt-5", name: "GPT-5", provider: "OpenAI", emblem: "O", group: "smart", modes: TEXT, priceHintMicro: 30_000, contextK: 400, stats: { speed: 7, quality: 9, value: 6, context: 8 }, note: "Универсальная, сильна в коде и логике" },
  { id: "gemini-2-5-pro", name: "Gemini 2.5 Pro", provider: "Google", emblem: "G", group: "smart", modes: TEXT, priceHintMicro: 25_000, contextK: 1000, stats: { speed: 6, quality: 9, value: 6, context: 10 }, note: "Огромный контекст, работа с файлами" },
  { id: "grok-4", name: "Grok 4", provider: "xAI", emblem: "X", group: "smart", modes: TEXT, priceHintMicro: 25_000, contextK: 256, stats: { speed: 7, quality: 8, value: 6, context: 7 }, note: "Свежие события и прямой стиль" },
  { id: "gemini-flash", name: "Gemini 2.5 Flash", provider: "Google", emblem: "G", group: "fast", modes: TEXT, priceHintMicro: 4_000, contextK: 1000, stats: { speed: 10, quality: 7, value: 10, context: 10 }, note: "Быстрые ответы и черновики" },
  { id: "deepseek-v3", name: "DeepSeek V3", provider: "DeepSeek", emblem: "D", group: "cheap", modes: TEXT, priceHintMicro: 3_000, contextK: 128, stats: { speed: 8, quality: 7, value: 10, context: 6 }, note: "Очень дёшево, хорош в коде" },
  { id: "qwen-3", name: "Qwen 3", provider: "Alibaba", emblem: "Q", group: "cheap", modes: TEXT, priceHintMicro: 5_000, contextK: 128, stats: { speed: 8, quality: 7, value: 9, context: 6 }, note: "Дёшево, хорошо понимает русский" },
  { id: "nano-banana-pro", name: "Nano Banana Pro", provider: "Google", emblem: "G", group: "image", modes: ["image"], priceHintMicro: 160_000, contextK: 0, stats: { speed: 8, quality: 9, value: 7, context: 5 }, note: "Фотореализм и точная правка по тексту" },
  { id: "gpt-image", name: "GPT-image", provider: "OpenAI", emblem: "O", group: "image", modes: ["image"], priceHintMicro: 200_000, contextK: 0, stats: { speed: 6, quality: 9, value: 5, context: 5 }, note: "Сложные сцены и текст на картинке" },
  { id: "flux-2", name: "Flux 2", provider: "Black Forest Labs", emblem: "F", group: "image", modes: ["image"], priceHintMicro: 120_000, contextK: 0, stats: { speed: 8, quality: 8, value: 8, context: 5 }, note: "Стилизация, логотипы, иллюстрации" },
  { id: "seedream-4", name: "Seedream 4", provider: "ByteDance", emblem: "B", group: "image", modes: ["image"], priceHintMicro: 100_000, contextK: 0, stats: { speed: 9, quality: 8, value: 9, context: 5 }, note: "Быстро и дёшево, вертикальные форматы" },
  { id: "veo-3", name: "Veo 3", provider: "Google", emblem: "G", group: "video", modes: ["video"], priceHintMicro: 1_200_000, contextK: 0, stats: { speed: 5, quality: 10, value: 4, context: 5 }, note: "Кино-качество и звук в кадре" },
  { id: "kling-2", name: "Kling 2", provider: "Kuaishou", emblem: "K", group: "video", modes: ["video"], priceHintMicro: 720_000, contextK: 0, stats: { speed: 6, quality: 9, value: 6, context: 5 }, note: "Динамика и движение камеры" },
  { id: "seedance", name: "Seedance", provider: "ByteDance", emblem: "B", group: "video", modes: ["video"], priceHintMicro: 600_000, contextK: 0, stats: { speed: 7, quality: 8, value: 7, context: 5 }, note: "Оживление картинок" },
  { id: "hailuo", name: "Hailuo", provider: "MiniMax", emblem: "M", group: "video", modes: ["video"], priceHintMicro: 500_000, contextK: 0, stats: { speed: 7, quality: 7, value: 8, context: 5 }, note: "Дешевле всего для коротких роликов" },
  { id: "tts-nova", name: "TTS · Нова", provider: "OpenRouter", emblem: "N", group: "audio", modes: ["audio"], priceHintMicro: 30_000, contextK: 0, stats: { speed: 9, quality: 8, value: 8, context: 5 }, note: "Спокойный женский голос" },
  { id: "tts-orion", name: "TTS · Орион", provider: "OpenRouter", emblem: "N", group: "audio", modes: ["audio"], priceHintMicro: 30_000, contextK: 0, stats: { speed: 9, quality: 8, value: 8, context: 5 }, note: "Низкий мужской голос" },
];

export const GROUP_LABEL: Record<ModelGroup, string> = {
  auto: "Рекомендуем",
  smart: "Умные",
  fast: "Быстрые",
  cheap: "Дешёвые",
  image: "Изображения",
  video: "Видео",
  audio: "Голос",
};

export function modelsForMode(mode: Mode): ModelInfo[] {
  return MODELS.filter((m) => m.modes.includes(mode));
}

/** Модель по умолчанию для режима; для текстовых — из настроек пользователя, если подходит. */
export function defaultModel(mode: Mode, preferred?: string): ModelInfo {
  const list = modelsForMode(mode);
  return list.find((m) => m.id === preferred) ?? (list[0] as ModelInfo);
}

/** Поиск по названию, провайдеру и описанию, без учёта регистра. */
export function searchModels(list: ModelInfo[], query: string): ModelInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((m) => `${m.name} ${m.provider} ${m.note}`.toLowerCase().includes(q));
}

export function modelById(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

/** Модель по имени из сообщения; «Авто · …» — маршрут автоподбора, а не отдельная модель каталога. */
export function modelByName(name: string): ModelInfo | undefined {
  return MODELS.find((m) => m.name === name) ?? (name.startsWith("Авто") ? MODELS.find((m) => m.group === "auto") : undefined);
}

/** Adapt only data declared by the server catalog; presentation scores are intentionally coarse UI hints. */
export function fromCatalogModel(model: CatalogRecord): ModelInfo {
  const price = model.priceHintMicro;
  const group: ModelGroup = model.id === "openrouter/auto"
    ? "auto"
    : model.supportedModes.includes("image")
      ? "image"
      : model.supportedModes.includes("video")
        ? "video"
        : model.supportedModes.includes("audio")
          ? "audio"
          : price <= 4_000
            ? "cheap"
            : price <= 12_000
              ? "fast"
              : "smart";
  return {
    id: model.id,
    name: model.name,
    provider: model.provider,
    emblem: model.provider.slice(0, 1).toUpperCase() || "AI",
    group,
    modes: model.supportedModes,
    priceHintMicro: price,
    contextK: Math.round(model.contextLength / 1000),
    stats: {
      speed: group === "fast" || group === "audio" ? 9 : 7,
      quality: group === "smart" || group === "video" ? 9 : 8,
      value: group === "cheap" ? 10 : 7,
      context: model.contextLength >= 1_000_000 ? 10 : model.contextLength >= 128_000 ? 8 : 6,
    },
    note: model.description || "Доступна через OpenRouter",
  };
}
