/**
 * Договор API (черновик до OpenAPI). Фронт работает на тестовых данных этой формы,
 * бэкенд потом отдаёт ровно её.
 */

export type Id = string;
/** ISO 8601, UTC: "2026-09-23T14:32:00Z" */
export type IsoDate = string;
/** Деньги — только целые: 1 кредит = 10 000 micro. */
export type Micro = number;

export type Mode = "text" | "image" | "video" | "audio" | "research" | "slides";

export type JobStatus = "queued" | "running" | "done" | "failed" | "canceled";

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "image"; url: string; alt: string; width: number; height: number }
  | { type: "video"; url: string; poster?: string; durationSec: number }
  | { type: "audio"; url: string }
  | { type: "sources"; items: Source[] }
  | { type: "file"; name: string; sizeBytes: number; mime: string }
  | { type: "job"; jobId: Id; kind: Exclude<Mode, "text">; status: JobStatus; progress: number };

/** Сообщения — дерево: ветки чата идут от parentId. */
export type Message = {
  id: Id;
  chatId: Id;
  parentId: Id | null;
  role: "user" | "assistant" | "system";
  mode: Mode;
  model: string | null;
  parts: MessagePart[];
  costMicro: Micro;
  createdAt: IsoDate;
};

export type ChatSummary = {
  id: Id;
  title: string;
  updatedAt: IsoDate;
  pinned: boolean;
  /** Последнее сообщение активной ветки. */
  headId: Id;
  /** Короткий предпросмотр для сайдбара. */
  preview?: string;
  media?: number;
};

/** Постоянное рабочее пространство: общий контекст и связанные чаты. */
/** Источник ответа: адрес, заголовок, короткая цитата провайдера (как текст) и когда он прочитан. */
export type Source = { url: string; title: string; quote?: string; readAt?: IsoDate };

export type Project = {
  id: Id;
  name: string;
  chatIds: Id[];
  createdAt: IsoDate;
  /** Общие правила для всех чатов проекта (уходят модели системным сообщением). */
  instructions?: string;
  /** Маршрут, с которого начинаются запросы в чатах проекта. */
  defaultModel?: string;
};

export type Plan = "free" | "pro" | "ultra";

export type Balance = {
  micro: Micro;
  plan: Plan;
  planUntil: IsoDate | null;
  /** Ежемесячное начисление тарифа — база для шкалы баланса. */
  monthlyGrantMicro: Micro;
};

export type SystemStatus = {
  node: string;
  latencyMs: number;
  modelsOnline: number;
  state: "ok" | "degraded" | "down";
};

export type User = { id: Id; name: string; email: string; /** С сервером: подтверждён ли адрес. */ emailVerified?: boolean };

export type MediaKind = "image" | "video" | "audio";

/** Результат генерации в медиатеке — ссылается на чат и сообщение, где родился. */
export type MediaItem = {
  id: Id;
  chatId: Id;
  messageId: Id;
  kind: MediaKind;
  url: string;
  poster?: string;
  prompt: string;
  model: string;
  costMicro: Micro;
  sizeBytes: number;
  durationSec?: number;
  createdAt: IsoDate;
};

export type Storage = { usedBytes: number; quotaBytes: number };

export type LedgerKind = "topup" | "charge" | "refund" | "grant" | "bonus" | "adjustment";

/** Строка журнала: только дописывается; сумма со знаком, целые micro. */
export type LedgerEntry = {
  id: Id;
  at: IsoDate;
  kind: LedgerKind;
  title: string;
  model?: string;
  chatId?: Id;
  /** Режим запуска, к которому относится списание (для прогноза похожих задач). */
  mode?: Mode;
  amountMicro: Micro;
};
