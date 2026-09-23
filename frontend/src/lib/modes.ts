import type { Micro, Mode } from "@/types/api";

export type ModeConfig = {
  id: Mode;
  label: string;
  /** Команда в начале строки: «/i» переключает режим. */
  command: string;
  placeholder: string;
  model: string;
  params: string[];
  costHintMicro: Micro;
};

export const MODES: ModeConfig[] = [
  { id: "text", label: "Текст", command: "/t", placeholder: "Спросите что угодно или поставьте задачу агенту…", model: "Авто · Claude Sonnet 5", params: [], costHintMicro: 20_000 },
  { id: "image", label: "Изображение", command: "/i", placeholder: "Опишите картинку или сошлитесь на сообщение выше…", model: "Nano Banana Pro", params: ["Формат 1:1", "Кол-во 4"], costHintMicro: 160_000 },
  { id: "video", label: "Видео", command: "/v", placeholder: "Что должно происходить в кадре…", model: "Veo 3", params: ["Длина 8 с", "Формат 16:9"], costHintMicro: 1_200_000 },
  { id: "audio", label: "Аудио", command: "/a", placeholder: "Текст для озвучки или «озвучь ответ выше»…", model: "TTS · голос «Нова»", params: ["Голос Нова", "Скорость 1.0×"], costHintMicro: 30_000 },
  { id: "research", label: "Deep Research", command: "/r", placeholder: "Тема исследования…", model: "Авто · агент", params: ["Источники веб", "Глубина стандарт"], costHintMicro: 400_000 },
  { id: "slides", label: "Слайды", command: "/s", placeholder: "О чём презентация…", model: "Авто · агент", params: ["Слайдов 8–10", "Стиль KURAI"], costHintMicro: 250_000 },
];

export function modeById(id: Mode): ModeConfig {
  return MODES.find((m) => m.id === id) ?? (MODES[0] as ModeConfig);
}

/** «/v снег в горах» → { mode: "video", rest: "снег в горах" }; иначе null. */
export function parseCommand(input: string): { mode: Mode; rest: string } | null {
  const match = /^(\/[a-z])(?:\s|$)/.exec(input);
  if (!match) return null;
  const cfg = MODES.find((m) => m.command === match[1]);
  return cfg ? { mode: cfg.id, rest: input.slice(match[0].length) } : null;
}

/** Режим для кнопки-продолжения по её тексту («Нарисуй…» → изображение и т.д.). */
export function modeForFollowup(text: string, current: Mode): Mode {
  const t = text.toLowerCase();
  if (/нарису|картинк|вариант|стиле аниме/.test(t)) return "image";
  if (/оживи|видео|вертикальн|секунд/.test(t)) return "video";
  if (/слайд/.test(t)) return "slides";
  if (/озвуч|голос|помедленнее/.test(t)) return "audio";
  return current === "image" || current === "video" || current === "audio" ? "text" : current;
}
