import type { Mode } from "@/types/api";

export type ModeParams = Record<string, string>;

/** Параметры по режимам: варианты и значение по умолчанию. Первое значение — по умолчанию. */
export const PARAMS: Partial<Record<Mode, { key: string; label: string; options: string[] }[]>> = {
  image: [
    { key: "aspect", label: "Формат", options: ["1:1", "4:5", "16:9", "9:16"] },
    { key: "count", label: "Кол-во", options: ["4", "2", "1"] },
    { key: "style", label: "Стиль", options: ["Без стиля", "Кино", "Неон", "Аниме", "3D", "Минимализм"] },
  ],
  video: [
    { key: "duration", label: "Длина", options: ["8 с", "5 с", "10 с"] },
    { key: "aspect", label: "Формат", options: ["16:9", "9:16", "1:1"] },
    { key: "camera", label: "Камера", options: ["Статично", "Наезд", "Облёт"] },
  ],
  audio: [{ key: "speed", label: "Скорость", options: ["1.0×", "0.8×", "1.2×"] }],
  research: [{ key: "depth", label: "Глубина", options: ["Стандарт", "Глубоко"] }],
  slides: [
    { key: "slides", label: "Слайдов", options: ["8", "5", "12"] },
    { key: "look", label: "Оформление", options: ["KURAI", "Строгое", "Яркое"] },
  ],
};

/** Параметры, которые сервер действительно исполняет (backend/runs/options.py); остальные в рабочем режиме не показываются. */
export const LIVE_PARAMS: Partial<Record<Mode, string[]>> = {
  image: ["aspect", "count", "style"],
  video: ["duration", "aspect", "camera"],
  research: ["depth"],
  slides: ["slides", "look"],
};

export type RunOptions = Record<string, string | number | boolean>;

const STYLE_API: Record<string, string> = { "Без стиля": "none", Кино: "cinema", Неон: "neon", Аниме: "anime", "3D": "3d", Минимализм: "minimal" };
const CAMERA_API: Record<string, string> = { Статично: "static", Наезд: "push", Облёт: "orbit" };
const LOOK_API: Record<string, string> = { KURAI: "kurai", Строгое: "strict", Яркое: "bright" };
const DEPTH_API: Record<string, string> = { Стандарт: "standard", Глубоко: "deep" };

/** Опции запуска для API: подписи интерфейса → канонические значения сервера. Неизвестное не отправляется. */
export function apiOptions(mode: Mode, { web, think, params }: { web: boolean; think: boolean; params: ModeParams }): RunOptions {
  const pick = (map: Record<string, string>, label: string | undefined) => (label !== undefined && map[label] ? map[label] : undefined);
  const out: Record<string, string | number | boolean | undefined> =
    mode === "text"
      ? { web, think }
      : mode === "research"
        ? { think, depth: pick(DEPTH_API, params.depth) }
        : mode === "slides"
          ? { think, slides: params.slides ? Number(params.slides) : undefined, look: pick(LOOK_API, params.look) }
          : mode === "image"
            ? { count: params.count ? Number(params.count) : undefined, aspect: params.aspect, style: pick(STYLE_API, params.style) }
            : mode === "video"
              ? { duration: params.duration ? Number.parseInt(params.duration, 10) : undefined, aspect: params.aspect, camera: pick(CAMERA_API, params.camera) }
              : {};
  return Object.fromEntries(Object.entries(out).filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined));
}

export function defaultParams(mode: Mode): ModeParams {
  return Object.fromEntries((PARAMS[mode] ?? []).map((p) => [p.key, p.options[0] ?? ""]));
}

/** Множитель цены от параметров: количество картинок и длительность видео. */
export function costFactor(mode: Mode, params: ModeParams): number {
  if (mode === "image") return Number(params.count ?? "4") / 4;
  if (mode === "video") return Number.parseInt(params.duration ?? "8", 10) / 8;
  return 1;
}

const DETAILS: Partial<Record<Mode, string>> = {
  text: "Ответь структурно: краткий вывод в начале, затем детали списком. Если уместно — таблица.",
  image: "детализированно, продуманный свет, чистая композиция, без текста и водяных знаков",
  video: "плавное движение камеры, кинематографичный свет, без резких склеек",
  research: "Используй свежие источники, сравни минимум три, отметь спорные данные.",
  slides: "Один тезис на слайд, цифры крупно, в конце — вывод и следующий шаг.",
  audio: "Естественные паузы, спокойная интонация.",
};

/** «Улучшить промпт»: добавляет детали под режим и параметры, не трогая исходный смысл. Идемпотентно. */
export function enhancePrompt(text: string, mode: Mode, params: ModeParams = {}): string {
  const base = text.trim();
  if (!base) return base;
  const extra = [DETAILS[mode], params.style && params.style !== "Без стиля" ? `стиль: ${params.style.toLowerCase()}` : "", params.aspect ? `формат ${params.aspect}` : ""]
    .filter(Boolean)
    .join(mode === "image" || mode === "video" ? ", " : " ");
  if (!extra || base.includes(extra)) return base;
  return mode === "image" || mode === "video" ? `${base}, ${extra}` : `${base}\n\n${extra}`;
}
