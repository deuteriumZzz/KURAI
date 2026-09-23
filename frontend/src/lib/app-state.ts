"use client";

import type { ChatSummary } from "@/types/api";
import { MOCK_CHATS } from "@/mocks/data";
import { createStore } from "./store";

export type InboxItem = { id: string; title: string; href?: string; at: string; unread: boolean; tone?: "default" | "warn" };

export const chatsStore = createStore<ChatSummary[]>(MOCK_CHATS);

export const inboxStore = createStore<InboxItem[]>([
  { id: "n1", title: "Отчёт «Рынок AI-агрегаторов» готов", href: "/app/c/b21c", at: "14:41", unread: true },
  { id: "n2", title: "Видео «Оживи вторую» готово · 118 кр", href: "/app/c/7f3a", at: "14:12", unread: false },
  { id: "n3", title: "Баланс ниже 100 кр — пополните, чтобы видео не встало в очередь", href: "/app/billing", at: "вчера", unread: false, tone: "warn" },
]);

let n = 0;
export function notify(title: string, href?: string) {
  const at = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  inboxStore.set((items) => [{ id: `n${Date.now()}${n++}`, title, href, at, unread: true }, ...items].slice(0, 20));
}

export type LightboxItem = { id: string; src: string; alt: string; caption?: string; kind: "image" | "video"; durationSec?: number };
export const lightboxStore = createStore<{ items: LightboxItem[]; index: number } | null>(null);
export const openLightbox = (items: LightboxItem[], index: number) => lightboxStore.set({ items, index });
