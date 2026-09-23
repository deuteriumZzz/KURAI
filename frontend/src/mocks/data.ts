import type { Balance, ChatSummary, Message, SystemStatus, User } from "@/types/api";

// Тестовые данные в форме API. Заменяются ответами бэкенда без изменения экранов.

export const MOCK_USER: User = { id: "u_1", name: "Дмитрий", email: "dmitry@kurai.ai" };

export const MOCK_BALANCE: Balance = {
  micro: 12_480_000,
  plan: "pro",
  planUntil: "2026-10-23T00:00:00Z",
  monthlyGrantMicro: 20_000_000,
};

export const MOCK_STATUS: SystemStatus = { node: "EU-01", latencyMs: 240, modelsOnline: 312, state: "ok" };

export const MOCK_CHATS: ChatSummary[] = [
  { id: "7f3a", title: "Сравнение тарифов конкурентов", updatedAt: "2026-09-23T14:32:00Z", pinned: true, headId: "m6" },
  { id: "b21c", title: "Сценарий ролика для Reels", updatedAt: "2026-09-23T11:05:00Z", pinned: false, headId: "b-h" },
  { id: "c9e4", title: "Логотип кофейни «Нейрон», 4 варианта", updatedAt: "2026-09-22T18:40:00Z", pinned: false, headId: "c-h" },
  { id: "d0a7", title: "Разбор договора аренды", updatedAt: "2026-09-19T09:12:00Z", pinned: false, headId: "d-h" },
  { id: "e5f1", title: "План контента на октябрь", updatedAt: "2026-09-02T16:20:00Z", pinned: false, headId: "e-h" },
];

export const MOCK_MESSAGES: Message[] = [
  { id: "m1", chatId: "7f3a", parentId: null, role: "user", mode: "text", model: null, costMicro: 0, createdAt: "2026-09-23T14:20:00Z",
    parts: [{ type: "text", text: "Сравни тарифы Syntx, ChatGPT Plus и GetImg: цена, лимиты, что входит." }] },
  { id: "m2", chatId: "7f3a", parentId: "m1", role: "assistant", mode: "text", model: "Claude Sonnet 5", costMicro: 78_000, createdAt: "2026-09-23T14:20:07Z",
    parts: [{ type: "text", text: "Коротко: Syntx сильнее в медиа (видео, музыка, аватары), ChatGPT Plus — в тексте и рассуждениях, GetImg — в изображениях. Если нужны все три сценария, выгоднее платить за запросы в одном месте, чем за три подписки." }] },
  { id: "m3", chatId: "7f3a", parentId: "m2", role: "user", mode: "image", model: null, costMicro: 0, createdAt: "2026-09-23T14:25:00Z",
    parts: [{ type: "text", text: "Нарисуй обложку для этой сводки: три терминала на матовом чёрном, бирюзовая линия." }] },
  { id: "m4", chatId: "7f3a", parentId: "m3", role: "assistant", mode: "image", model: "Nano Banana Pro", costMicro: 160_000, createdAt: "2026-09-23T14:25:11Z",
    parts: [{ type: "job", jobId: "j1", kind: "image", status: "done", progress: 1 }] },
  { id: "m5", chatId: "7f3a", parentId: "m4", role: "user", mode: "video", model: null, costMicro: 0, createdAt: "2026-09-23T14:31:00Z",
    parts: [{ type: "text", text: "Оживи вторую: камера медленно наезжает, линия пульсирует." }] },
  { id: "m6", chatId: "7f3a", parentId: "m5", role: "assistant", mode: "video", model: "Veo 3", costMicro: 0, createdAt: "2026-09-23T14:32:00Z",
    parts: [{ type: "job", jobId: "j2", kind: "video", status: "running", progress: 0.44 }] },
];

/** Активная ветка: идём от head к корню по parentId. */
export function branchOf(headId: string, messages: Message[] = MOCK_MESSAGES): Message[] {
  const byId = new Map(messages.map((m) => [m.id, m]));
  const out: Message[] = [];
  for (let m = byId.get(headId); m; m = m.parentId ? byId.get(m.parentId) : undefined) out.unshift(m);
  return out;
}

/** «Сейчас» для тестовых данных — одинаковое на сервере и клиенте (без рассинхрона гидрации). */
export const MOCK_NOW = new Date("2026-09-23T15:00:00Z");
