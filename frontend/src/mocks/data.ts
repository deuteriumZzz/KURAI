import type { Balance, ChatSummary, MediaItem, Message, Storage, SystemStatus, User } from "@/types/api";
import { placeholderImage } from "./media";

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
  { id: "7f3a", preview: "Видео «Оживи вторую» · генерация 44%", media: 3, title: "Сравнение тарифов конкурентов", updatedAt: "2026-09-23T14:32:00Z", pinned: true, headId: "m6" },
  { id: "b21c", preview: "Сценарий на 30 секунд: хук, проблема, решение", media: 2, title: "Сценарий ролика для Reels", updatedAt: "2026-09-23T11:05:00Z", pinned: false, headId: "b-h" },
  { id: "c9e4", preview: "4 варианта логотипа, лучший — №2", media: 4, title: "Логотип кофейни «Нейрон», 4 варианта", updatedAt: "2026-09-22T18:40:00Z", pinned: false, headId: "c-h" },
  { id: "d0a7", preview: "Риски в пунктах 4.2 и 7.1 договора", media: 0, title: "Разбор договора аренды", updatedAt: "2026-09-19T09:12:00Z", pinned: false, headId: "d-h" },
  { id: "e5f1", preview: "План на 4 недели, 12 постов и 3 Reels", media: 1, title: "План контента на октябрь", updatedAt: "2026-09-02T16:20:00Z", pinned: false, headId: "e-h" },
];

export const MOCK_MESSAGES: Message[] = [
  { id: "m1", chatId: "7f3a", parentId: null, role: "user", mode: "text", model: null, costMicro: 0, createdAt: "2026-09-23T14:20:00Z",
    parts: [{ type: "text", text: "Сравни тарифы Syntx, ChatGPT Plus и GetImg: цена, лимиты, что входит." }] },
  { id: "m2", chatId: "7f3a", parentId: "m1", role: "assistant", mode: "text", model: "Claude Sonnet 5", costMicro: 78_000, createdAt: "2026-09-23T14:20:07Z",
    parts: [{ type: "text", text: "Коротко: Syntx сильнее в медиа (видео, музыка, аватары), ChatGPT Plus — в тексте и рассуждениях, GetImg — в изображениях. Если нужны все три сценария, выгоднее платить за запросы в одном месте, чем за три подписки." }] },
  { id: "m3", chatId: "7f3a", parentId: "m2", role: "user", mode: "image", model: null, costMicro: 0, createdAt: "2026-09-23T14:25:00Z",
    parts: [{ type: "text", text: "Нарисуй обложку для этой сводки: три терминала на матовом чёрном, бирюзовая линия." }] },
  { id: "m4", chatId: "7f3a", parentId: "m3", role: "assistant", mode: "image", model: "Nano Banana Pro", costMicro: 160_000, createdAt: "2026-09-23T14:25:11Z",
    parts: [0, 1, 2, 3].map((i) => ({ type: "image" as const, url: placeholderImage(i), alt: `Обложка, вариант ${i + 1}`, width: 512, height: 512 })) },
  { id: "m5", chatId: "7f3a", parentId: "m4", role: "user", mode: "video", model: null, costMicro: 0, createdAt: "2026-09-23T14:31:00Z",
    parts: [{ type: "text", text: "Оживи вторую: камера медленно наезжает, линия пульсирует." }] },
  { id: "m6", chatId: "7f3a", parentId: "m5", role: "assistant", mode: "video", model: "Veo 3", costMicro: 0, createdAt: "2026-09-23T14:32:00Z",
    parts: [{ type: "job", jobId: "j2", kind: "video", status: "running", progress: 0.44 }] },
];

/** «Сейчас» для тестовых данных — одинаковое на сервере и клиенте (без рассинхрона гидрации). */
export const MOCK_NOW = new Date("2026-09-23T15:00:00Z");


const GB = 1024 ** 3;
const MB = 1024 ** 2;
export const MOCK_STORAGE: Storage = { usedBytes: Math.round(2.1 * GB), quotaBytes: 5 * GB };

const img = (i: number, chatId: string, messageId: string, prompt: string, day: number, model = "Nano Banana Pro"): MediaItem => ({
  id: `img${i}`, chatId, messageId, kind: "image", url: placeholderImage(i), prompt, model, costMicro: 40_000,
  sizeBytes: Math.round((1.4 + (i % 3) * 0.3) * MB), createdAt: `2026-09-${String(day).padStart(2, "0")}T12:${String(10 + i).padStart(2, "0")}:00Z`,
});

export const MOCK_MEDIA: MediaItem[] = [
  img(0, "7f3a", "m4", "Обложка: три терминала на матовом чёрном, бирюзовая линия", 23),
  img(1, "7f3a", "m4", "Обложка: три терминала на матовом чёрном, бирюзовая линия", 23),
  { id: "vid0", chatId: "7f3a", messageId: "m6", kind: "video", url: "", poster: placeholderImage(7, 960, 540, "KURAI · видео 8 с"),
    prompt: "Оживи вторую: камера медленно наезжает, линия пульсирует", model: "Veo 3", costMicro: 1_180_000, sizeBytes: 38 * MB, durationSec: 8, createdAt: "2026-09-23T14:33:00Z" },
  img(2, "c9e4", "c-h", "Минималистичный логотип кофейни «Нейрон», неоновая линия", 22, "Flux 2"),
  img(3, "c9e4", "c-h", "Минималистичный логотип кофейни «Нейрон», неоновая линия", 22, "Flux 2"),
  { id: "aud0", chatId: "b21c", messageId: "b-h", kind: "audio", url: "", prompt: "Озвучь сценарий ролика: спокойный уверенный голос", model: "TTS · Нова",
    costMicro: 30_000, sizeBytes: Math.round(0.4 * MB), durationSec: 12, createdAt: "2026-09-23T11:07:00Z" },
  img(4, "b21c", "b-h", "Кадр для Reels: неоновый город ночью, вертикально", 23, "Seedream 4"),
  { id: "vid1", chatId: "b21c", messageId: "b-h", kind: "video", url: "", poster: placeholderImage(9, 960, 540, "KURAI · видео 5 с"),
    prompt: "Пролёт камеры над ночным городом, дождь, неон", model: "Kling 2", costMicro: 720_000, sizeBytes: 24 * MB, durationSec: 5, createdAt: "2026-09-23T11:20:00Z" },
  img(5, "e5f1", "e-h", "Иллюстрация для поста: план контента, изометрия", 2, "GPT-image"),
];

export const MOCK_LEDGER: import("@/types/api").LedgerEntry[] = [
  { id: "l9", at: "2026-09-23T14:32:00Z", kind: "charge", title: "Видео 8 с", model: "Veo 3", chatId: "7f3a", amountMicro: -1_180_000 },
  { id: "l8", at: "2026-09-23T14:25:00Z", kind: "charge", title: "Изображение × 4", model: "Nano Banana Pro", chatId: "7f3a", amountMicro: -160_000 },
  { id: "l7", at: "2026-09-23T14:20:00Z", kind: "charge", title: "Чат · 1 820 токенов", model: "Claude Sonnet 5", chatId: "7f3a", amountMicro: -78_000 },
  { id: "l6", at: "2026-09-23T13:51:00Z", kind: "refund", title: "Возврат · ошибка провайдера", model: "Veo 3", chatId: "b21c", amountMicro: 1_200_000 },
  { id: "l5", at: "2026-09-23T13:50:00Z", kind: "charge", title: "Видео 8 с", model: "Veo 3", chatId: "b21c", amountMicro: -1_200_000 },
  { id: "l4", at: "2026-09-23T09:00:00Z", kind: "topup", title: "Пополнение · СБП", amountMicro: 10_000_000 },
  { id: "l3", at: "2026-09-22T18:41:00Z", kind: "charge", title: "Изображение × 4", model: "Flux 2", chatId: "c9e4", amountMicro: -160_000 },
  { id: "l2", at: "2026-09-02T10:00:00Z", kind: "bonus", title: "Промокод KURAI20", amountMicro: 2_000_000 },
  { id: "l1", at: "2026-09-01T00:00:00Z", kind: "grant", title: "Начисление тарифа Pro", amountMicro: 10_000_000 },
];

/** Расходы по дням за 30 дней (тестовые данные, детерминированные). */
export const MOCK_SPEND: { date: string; micro: number; models: { name: string; micro: number }[] }[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 7, 25 + i));
  const wave = Math.abs(Math.sin(i * 0.7)) * 60 + ((i * 37) % 23) + (i % 7 === 5 ? 120 : 0);
  const credits = Math.round(wave);
  const video = i % 7 === 5 ? 118 : 0;
  const rest = Math.max(0, credits - video);
  const models = [
    ...(video ? [{ name: "Veo 3", micro: video * 10_000 }] : []),
    { name: "Claude Sonnet 5", micro: Math.round(rest * 0.6) * 10_000 },
    { name: "Nano Banana Pro", micro: Math.round(rest * 0.4) * 10_000 },
  ].filter((m) => m.micro > 0);
  return { date: d.toISOString().slice(0, 10), micro: models.reduce((s, m) => s + m.micro, 0), models };
});

/** Активность по дням за 12 недель (тестовые данные). */
export const MOCK_ACTIVITY = Array.from({ length: 84 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 6, 3 + i));
  const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
  const count = Math.max(0, Math.round(Math.abs(Math.sin(i * 1.3)) * 14 + (i > 60 ? 6 : 0) - (weekend ? 8 : 0)));
  return { date: d.toISOString().slice(0, 10), count };
});
