"use client";

import type { Mode } from "@/types/api";
import { createStore } from "./store";

/** К12 — одна долгая задача, которую видно из любого раздела (как трекинг квеста). Только реальные запуски. */
export type Tracked = {
  runId: string;
  chatId: string;
  title: string;
  mode: Mode;
  startedAt: string;
  status: "running" | "done" | "error";
  costMicro?: number;
  /** Текущий шаг из событий запуска: «в очереди», «маршрут · …», «пишет ответ», «читает источники». */
  step?: string;
  /** Настоящий процент — только у генерации медиа. */
  pct?: number;
};

export const trackedStore = createStore<Tracked | null>(null);

export function track(next: Tracked): void {
  trackedStore.set(next);
}

/** Завершение того же запуска; чужой (более старый) запуск не перетирает текущий. */
export function settleTracked(runId: string, patch: Partial<Tracked>): void {
  trackedStore.set((cur) => (cur && cur.runId === runId ? { ...cur, ...patch } : cur));
}

export function clearTracked(): void {
  trackedStore.set(null);
}
