import type { Mode } from "@/types/api";
import type { AgentTask } from "./stream";
import { modeForFollowup } from "./modes";

/** Этап долгой задачи по событиям сервера: очередь → запуск взят моделью → пошёл текст → готово. */
export type LivePhase = "queued" | "routed" | "writing" | "done";

/**
 * 29 — план исследования и слайдов из настоящих событий запуска. Шаги — только те, что сервер
 * действительно проходит: подбор маршрута, поиск источников (для исследования) и текст.
 */
export function livePlan(mode: Mode, phase: LivePhase, sources: number): AgentTask[] | null {
  const titles = mode === "research" ? ["Подобрать маршрут", "Найти и прочитать источники", "Написать отчёт"] : mode === "slides" ? ["Подобрать маршрут", "Написать слайды"] : null;
  if (!titles) return null;
  const at = { queued: 0, routed: 1, writing: titles.length - 1, done: titles.length }[phase];
  return titles.map((title, i) => ({
    title,
    status: i < at ? "done" : i === at ? "doing" : "todo",
    ...(mode === "research" && i === 1 && sources > 0 ? { progress: `${sources} ист.` } : {}),
  }));
}

/** Следующие запросы по режиму ответа (К15). Это подсказки-формулировки, а не обещания модели. */
export const FOLLOWUPS: Record<Mode, string[]> = {
  text: ["Сделай короче", "Оформи таблицей", "Нарисуй картинку к этому"],
  research: ["Сделай из этого слайды", "Покажи только цифры", "Какие риски?"],
  slides: ["Добавь слайд с графиком", "Сделай строже", "Напиши текст для выступления"],
  image: ["Оживи первую в видео", "Ещё 4 варианта", "Сделай в стиле аниме"],
  video: ["Сделай вертикальную версию", "Добавь озвучку", "Короче, 5 секунд"],
  audio: ["Другой голос", "Помедленнее", "Сделай видео с этой озвучкой"],
};

/** Режим, в котором уйдёт продолжение: по смыслу текста; всё остальное — обычный вопрос к ответу. */
export const followupMode = (text: string): Mode => modeForFollowup(text, "text");

/** Продолжения только для режимов, которые этот сервер действительно умеет. */
export function followupsFor(mode: Mode, available: (m: Mode) => boolean): string[] {
  return FOLLOWUPS[mode].filter((f) => available(followupMode(f)));
}
