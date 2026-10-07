"use client";

import type { ChatSummary, Message, Mode } from "@/types/api";
import { MOCK_CHATS, MOCK_MESSAGES } from "@/mocks/data";
import { kuraiApi } from "./kurai-api";

export type ChatSnapshot = { chat: ChatSummary; messages: Message[] };

const FRESH_MS = 30_000;
const cache = new Map<string, { at: number; promise: Promise<ChatSnapshot> }>();

/**
 * 95 — снимок чата начинает грузиться при наведении на строку истории, поэтому клик открывает его сразу.
 * 87 — тот же снимок даёт предпросмотр последнего ответа. В локальном просмотре — демо-данные.
 */
export function prefetchChat(id: string): Promise<ChatSnapshot> | null {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.promise;
  let promise: Promise<ChatSnapshot>;
  if (kuraiApi) {
    promise = kuraiApi.getChat(id);
  } else {
    const chat = MOCK_CHATS.find((c) => c.id === id);
    if (!chat) return null;
    promise = Promise.resolve({ chat, messages: MOCK_MESSAGES.filter((m) => m.chatId === id) });
  }
  promise.catch(() => cache.delete(id));
  cache.set(id, { at: Date.now(), promise });
  return promise;
}

/** Забрать заранее загруженный снимок один раз: после открытия чат читается с сервера заново. */
export function takeChat(id: string): Promise<ChatSnapshot> | null {
  const hit = cache.get(id);
  cache.delete(id);
  return hit && Date.now() - hit.at < FRESH_MS ? hit.promise : null;
}

/** Текст последнего ответа и сумма по чату — для предпросмотра при наведении. */
export function summarize(snapshot: ChatSnapshot): { text: string; model: string | null; costMicro: number } {
  const answers = snapshot.messages.filter((m) => m.role === "assistant");
  const last = answers.at(-1);
  const text = (last?.parts ?? [])
    .flatMap((p) => (p.type === "text" ? [p.text] : []))
    .join(" ")
    .replace(/[#*_`>|[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { text, model: last?.model ?? null, costMicro: snapshot.messages.reduce((sum, m) => sum + m.costMicro, 0) };
}

/** Офлайн-прототип: запрос с главной, который новый локальный чат отправит сам после открытия. */
export type Handoff = { text: string; mode: Mode; model: string };
// хранилище на globalThis: главная и страница чата могут оказаться в разных чанках
const handoffs: Map<string, Handoff> = ((globalThis as unknown as { __kuraiHandoffs?: Map<string, Handoff> }).__kuraiHandoffs ??= new Map());

export function handOff(chatId: string, handoff: Handoff): void {
  handoffs.set(chatId, handoff);
}

/** Забрать один раз: повторное открытие чата запрос не отправит. */
export function takeHandoff(chatId: string): Handoff | undefined {
  const h = handoffs.get(chatId);
  handoffs.delete(chatId);
  return h;
}
