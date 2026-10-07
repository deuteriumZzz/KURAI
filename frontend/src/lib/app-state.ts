"use client";

import type { Balance, ChatSummary, LedgerEntry, Project, User } from "@/types/api";
import { MOCK_BALANCE, MOCK_CHATS, MOCK_LEDGER, MOCK_PROJECTS, MOCK_USER } from "@/mocks/data";
import { createStore } from "./store";
import { kuraiApi, type KuraiLedger } from "./kurai-api";

/** Участник рабочего пространства: в локальном просмотре — демо-пользователь, с API — ответ /me. */
export const memberStore = createStore<User>(kuraiApi ? { id: "", name: "", email: "" } : MOCK_USER);

/** Один баланс на весь кабинет: рейка, поле ввода и чат читают одно значение (с API — из журнала). */
export const balanceStore = createStore<Balance | null>(kuraiApi ? null : MOCK_BALANCE);

/** Журнал операций кабинета: из него — расходы месяца, лимит и прогнозы (с API — серверный журнал). */
export const ledgerStore = createStore<LedgerEntry[]>(kuraiApi ? [] : MOCK_LEDGER);

export const toLedgerRows = (entries: KuraiLedger["entries"]): LedgerEntry[] =>
  entries.map((entry) => ({
    id: entry.id,
    at: entry.at,
    kind: entry.kind,
    title: entry.title,
    ...(entry.model ? { model: entry.model } : {}),
    ...(entry.chatId ? { chatId: entry.chatId } : {}),
    ...(entry.mode ? { mode: entry.mode } : {}),
    amountMicro: entry.amountMicro,
  }));

/** После резерва, списания или возврата сумму перечитываем с сервера — она там единственная правда. */
export function refreshBalance() {
  kuraiApi
    ?.ledger()
    .then((ledger) => {
      balanceStore.set((b) => b && { ...b, micro: ledger.availableMicro });
      ledgerStore.set(() => toLedgerRows(ledger.entries));
    })
    .catch(() => undefined);
}

export type InboxItem = { id: string; title: string; href?: string; at: string; unread: boolean; tone?: "default" | "warn" };

// в рабочем режиме история приходит с сервера — демо-чаты не мелькают до ответа API
export const chatsStore = createStore<ChatSummary[]>(kuraiApi ? [] : MOCK_CHATS);
export const projectsStore = createStore<Project[]>(kuraiApi ? [] : MOCK_PROJECTS);

// в рабочем режиме уведомления рождаются только из реальных запусков этой сессии
export const inboxStore = createStore<InboxItem[]>(kuraiApi ? [] : [
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
