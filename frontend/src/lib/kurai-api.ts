import type { ChatSummary, Message, Mode, Project } from "@/types/api";
import type { RunOptions } from "@/lib/prompt";

type Fetcher = typeof fetch;

type ApiProject = {
  id: string;
  name: string;
  accent: "cyan" | "magenta" | "lime" | "violet";
  instructions?: string;
  defaultModel?: string;
  createdAt: string;
};

type ApiEnvelope<T> = { data: T };
type ApiFailure = { error?: { code?: string; message?: string } };

export type KuraiMember = { id: string; email: string; displayName: string };
export type KuraiFile = { id: string; name: string; contentType: string; sizeBytes: number; sha256: string; createdAt: string };
export type KuraiMedia = {
  id: string; kind: "image" | "video" | "audio"; url: string; contentType: string; sizeBytes: number; prompt: string;
  model: string; costMicro: number; chatId: string; messageId: string; createdAt: string;
};
export type KuraiCatalogModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextLength: number;
  inputModalities: string[];
  outputModalities: string[];
  supportedModes: Mode[];
  priceHintMicro: number;
};
export type KuraiCapability = { id: Mode; available: boolean; modelCount: number };
export type KuraiServiceStatus = { status: "ok" | "degraded"; modelsOnline: number; capabilities: KuraiCapability[]; reasons: string[] };
export type KuraiLedgerEntry = {
  id: string;
  at: string;
  kind: "grant" | "charge" | "refund" | "adjustment";
  title: string;
  model: string | null;
  chatId: string | null;
  mode?: Mode | null;
  amountMicro: number;
};
export type KuraiLedger = { availableMicro: number; entries: KuraiLedgerEntry[] };

type ApiMember = KuraiMember & { csrfToken?: string };

type ApiChat = { id: string; title: string; projectId: string | null; pinned: boolean; createdAt: string; updatedAt?: string };
type ApiChatSnapshot = { chat: ApiChat; messages: Message[] };
type ApiQuote = { quoteId: string; mode: Mode; resolvedModel: string; estimatedCostMicro: number; expiresInSeconds: number };
export type KuraiRun = { runId: string; chatId: string; outputMessageId: string | null; status: string; estimatedCostMicro: number; eventUrl: string };
export type KuraiCompareRun = { compareId: string; inputMessageId: string; estimatedTotalCostMicro: number; runs: KuraiRun[] };
export type KuraiArtifactKind = "document" | "specification" | "table" | "recipe" | "research_packet";
export type KuraiArtifact = {
  id: string; projectId: string | null; chatId: string; sourceMessageId: string; kind: KuraiArtifactKind;
  title: string; body: string; provenance: { sourceMessageId: string; model: string | null; mode: Mode; costMicro: number; sources: { url: string; title: string }[] }; createdAt: string;
};
export type KuraiRecipe = {
  id: string; projectId: string | null; chatId: string; sourceMessageId: string; title: string;
  prompt: string; mode: Mode; model: string; sourceCostMicro: number; createdAt: string;
};
/** Части цены по формуле резерва: ввод, потолок ответа, лимит поиска (или одна генерация для медиа). */
export type KuraiEstimate = { estimatedCostMicro: number; parts?: Partial<Record<"input" | "output" | "think" | "search" | "generation", number>> };
export type KuraiShareLink = { id: string; token: string; chatId: string; expiresAt: string | null; createdAt: string };
export type KuraiSharedMessage = { role: "user" | "assistant"; model: string | null; text: string };
export type KuraiSharedChat = { chat: { title: string }; messages: KuraiSharedMessage[] };

export class KuraiApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly retryAfter?: number) {
    super(message);
    this.name = "KuraiApiError";
  }
}

function mapProject(project: ApiProject): Project {
  return { id: project.id, name: project.name, chatIds: [], createdAt: project.createdAt, instructions: project.instructions ?? "", defaultModel: project.defaultModel ?? "" };
}

function mapChat(chat: ApiChat, messages: Message[] = []): ChatSummary {
  const head = messages.at(-1);
  return {
    id: chat.id,
    title: chat.title,
    // последняя активность: время головного сообщения, иначе — отметка сервера (а не дата создания)
    updatedAt: head?.createdAt ?? chat.updatedAt ?? chat.createdAt,
    pinned: chat.pinned,
    headId: head?.id ?? "",
    preview: head?.parts.find((part) => part.type === "text")?.type === "text" ? head.parts.find((part) => part.type === "text")?.text.slice(0, 120) : undefined,
  };
}

function mapMessageResourceUrls(message: Message, base: string): Message {
  return {
    ...message,
    parts: message.parts.map((part) =>
      (part.type === "image" || part.type === "video" || part.type === "audio") && part.url.startsWith("/")
        ? { ...part, url: `${base}${part.url}` }
        : part,
    ),
  };
}

export function createKuraiClient(baseUrl: string, fetcher: Fetcher = fetch) {
  const base = baseUrl.replace(/\/$/, "");
  let csrfToken: string | null = null;

  async function refreshCsrfToken() {
    const response = await fetcher(`${base}/api/v1/auth/csrf`, { credentials: "include" });
    const body = (await response.json()) as ApiEnvelope<{ csrfToken: string }> & ApiFailure;
    if (!response.ok) throw new KuraiApiError(response.status, body.error?.code ?? "csrf_failed", body.error?.message ?? "Не удалось защитить сессию.");
    csrfToken = body.data.csrfToken;
  }

  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const unsafe = !["GET", "HEAD", "OPTIONS"].includes((init.method ?? "GET").toUpperCase());
    if (unsafe && !csrfToken) await refreshCsrfToken();
    const response = await fetcher(`${base}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}), ...init.headers },
    });
    const body = (await response.json()) as ApiEnvelope<T> & ApiFailure;
    if (!response.ok) {
      // 75 — сервер просит подождать: срок из Retry-After получает поле ввода (кольцо обратного отсчёта)
      const retryAfter = response.status === 429 ? Number(response.headers.get("Retry-After")) || undefined : undefined;
      if (retryAfter && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("kurai:cooldown", { detail: retryAfter }));
      throw new KuraiApiError(response.status, body.error?.code ?? "request_failed", body.error?.message ?? "Не удалось выполнить запрос.", retryAfter);
    }
    return body.data;
  }

  return {
    /** 101 — правка проекта: название и общие инструкции для всех его чатов. */
    updateProject: async (id: string, patch: { name?: string; instructions?: string; defaultModel?: string }): Promise<Project> =>
      mapProject(await request<ApiProject>(`/api/v1/projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) })),
    createProject: async (name: string): Promise<Project> => {
      const project = await request<ApiProject>("/api/v1/projects", {
        method: "POST",
        body: JSON.stringify({ name, accent: "cyan" }),
      });
      return mapProject(project);
    },
    createChat: async (title: string): Promise<ChatSummary> => {
      const chat = await request<ApiChat>("/api/v1/chats", { method: "POST", body: JSON.stringify({ title }) });
      return mapChat(chat);
    },
    getWorkspace: async (): Promise<{ projects: Project[]; chats: ChatSummary[] }> => {
      const [projects, chats] = await Promise.all([
        request<ApiProject[]>("/api/v1/projects", { method: "GET" }),
        request<ApiChat[]>("/api/v1/chats", { method: "GET" }),
      ]);
      return {
        projects: projects.map((project) => ({ ...mapProject(project), chatIds: chats.filter((chat) => chat.projectId === project.id).map((chat) => chat.id) })),
        chats: chats.map((chat) => mapChat(chat)),
      };
    },
    getChat: async (chatId: string): Promise<{ chat: ChatSummary; messages: Message[] }> => {
      const snapshot = await request<ApiChatSnapshot>(`/api/v1/chats/${chatId}`, { method: "GET" });
      const messages = snapshot.messages.map((message) => mapMessageResourceUrls(message, base));
      return { chat: mapChat(snapshot.chat, messages), messages };
    },
    createShareLink: (chatId: string, expiresInHours = 168): Promise<KuraiShareLink> =>
      request<KuraiShareLink>(`/api/v1/chats/${encodeURIComponent(chatId)}/share-links`, {
        method: "POST",
        body: JSON.stringify({ expiresInHours }),
      }),
    shareLinks: (chatId: string): Promise<KuraiShareLink[]> =>
      request<KuraiShareLink[]>(`/api/v1/chats/${encodeURIComponent(chatId)}/share-links`, { method: "GET" }),
    revokeShareLink: (linkId: string): Promise<{ id: string; revoked: boolean }> =>
      request<{ id: string; revoked: boolean }>(`/api/v1/share-links/${encodeURIComponent(linkId)}/revoke`, { method: "POST" }),
    getSharedChat: (token: string): Promise<KuraiSharedChat> => request<KuraiSharedChat>(`/api/v1/shares/${encodeURIComponent(token)}`, { method: "GET" }),
    artifacts: (): Promise<KuraiArtifact[]> => request<KuraiArtifact[]>("/api/v1/artifacts", { method: "GET" }),
    saveArtifact: ({ messageId, kind = "document", title }: { messageId: string; kind?: KuraiArtifactKind; title?: string }): Promise<KuraiArtifact> =>
      request<KuraiArtifact>("/api/v1/artifacts", {
        method: "POST",
        body: JSON.stringify({ messageId, kind, ...(title ? { title } : {}) }),
      }),
    recipes: (): Promise<KuraiRecipe[]> => request<KuraiRecipe[]>("/api/v1/recipes", { method: "GET" }),
    saveRecipe: ({ messageId, title }: { messageId: string; title?: string }): Promise<KuraiRecipe> =>
      request<KuraiRecipe>("/api/v1/recipes", {
        method: "POST",
        body: JSON.stringify({ messageId, ...(title ? { title } : {}) }),
      }),
    models: (mode?: Mode): Promise<KuraiCatalogModel[]> => request<KuraiCatalogModel[]>(`/api/v1/models${mode ? `?mode=${encodeURIComponent(mode)}` : ""}`, { method: "GET" }),
    capabilities: (): Promise<{ modes: KuraiCapability[] }> => request<{ modes: KuraiCapability[] }>("/api/v1/capabilities", { method: "GET" }),
    serviceStatus: (): Promise<KuraiServiceStatus> => request<KuraiServiceStatus>("/api/v1/status", { method: "GET" }),
    uploadFile: async (file: File): Promise<KuraiFile> => {
      if (!csrfToken) await refreshCsrfToken();
      const body = new FormData();
      body.append("file", file);
      const response = await fetcher(`${base}/api/v1/files`, { method: "POST", credentials: "include", headers: csrfToken ? { "X-CSRFToken": csrfToken } : {}, body });
      const payload = (await response.json()) as ApiEnvelope<KuraiFile> & ApiFailure;
      if (!response.ok) throw new KuraiApiError(response.status, payload.error?.code ?? "file_upload_failed", payload.error?.message ?? "Не удалось загрузить файл.");
      return payload.data;
    },
    // options входят в подпись расчёта на сервере: запуск обязан прислать те же, что и расчёт
    quote: (mode: Mode, text: string, modelId = "openrouter/auto", attachmentIds: string[] = [], options: RunOptions = {}): Promise<ApiQuote> =>
      request<ApiQuote>("/api/v1/runs/quote", { method: "POST", body: JSON.stringify({ mode, modelId, text, attachmentIds, options }) }),
    /** Цена по формуле резерва, без записи на сервере: черновик не уходит, лимит расчётов не тратится. */
    estimate: (mode: Mode, modelId: string, chars: number, options: RunOptions = {}): Promise<KuraiEstimate> =>
      request<KuraiEstimate>("/api/v1/runs/estimate", { method: "POST", body: JSON.stringify({ mode, modelId, chars, options }) }),
    startRun: ({ chatId, parentId, quoteId, mode, modelId = "openrouter/auto", text, attachmentIds = [], options = {}, idempotencyKey }: { chatId: string; parentId?: string | null; quoteId: string; mode: Mode; modelId?: string; text: string; attachmentIds?: string[]; options?: RunOptions; idempotencyKey: string }): Promise<KuraiRun> =>
      request<KuraiRun>("/api/v1/runs", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ chatId, ...(parentId ? { parentId } : {}), quoteId, mode, modelId, text, attachmentIds, options }),
      }),
    startCompareRun: ({ chatId, parentId, mode, text, attachmentIds = [], options = {}, routes, idempotencyKey }: { chatId: string; parentId?: string | null; mode: Extract<Mode, "text" | "research">; text: string; attachmentIds?: string[]; options?: RunOptions; routes: { modelId: string; quoteId: string }[]; idempotencyKey: string }): Promise<KuraiCompareRun> =>
      request<KuraiCompareRun>("/api/v1/runs/compare", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ chatId, ...(parentId ? { parentId } : {}), mode, text, attachmentIds, options, routes }),
      }),
    /** Переименовать, закрепить или убрать чат в архив (обратимо; история запусков и списаний сохраняется). */
    updateChat: (chatId: string, patch: { title?: string; pinned?: boolean; archived?: boolean; projectId?: string | null }): Promise<unknown> =>
      request<unknown>(`/api/v1/chats/${encodeURIComponent(chatId)}`, { method: "PATCH", body: JSON.stringify(patch) }),
    getRun: (runId: string): Promise<KuraiRun> => request<KuraiRun>(`/api/v1/runs/${runId}`, { method: "GET" }),
    cancelRun: (runId: string): Promise<KuraiRun> => request<KuraiRun>(`/api/v1/runs/${runId}/cancel`, { method: "POST" }),
    /** 92 — ответ как .docx: обложка с кодом, текст, страница источников. */
    exportDocument: async (messageId: string): Promise<Blob> => {
      const response = await fetcher(`${base}/api/v1/messages/${encodeURIComponent(messageId)}/exports/document`, { credentials: "include" });
      if (!response.ok) throw new KuraiApiError(response.status, "export_failed", "Не удалось собрать документ.");
      return response.blob();
    },
    exportSlides: async (messageId: string, title?: string): Promise<Blob> => {
      if (!csrfToken) await refreshCsrfToken();
      const response = await fetcher(`${base}/api/v1/messages/${encodeURIComponent(messageId)}/exports/slides`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}) },
        body: JSON.stringify(title ? { title } : {}),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiFailure;
        throw new KuraiApiError(response.status, body.error?.code ?? "slide_export_failed", body.error?.message ?? "Не удалось подготовить презентацию.");
      }
      return response.blob();
    },
    exportAccountData: async (): Promise<Blob> => {
      const response = await fetcher(`${base}/api/v1/me/export`, { method: "GET", credentials: "include" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiFailure;
        throw new KuraiApiError(response.status, body.error?.code ?? "account_export_failed", body.error?.message ?? "Не удалось подготовить архив данных.");
      }
      return response.blob();
    },
    runEventUrl: (run: KuraiRun): string => (run.eventUrl.startsWith("http") ? run.eventUrl : `${base}${run.eventUrl}`),
    signUp: async ({ email, password, displayName }: { email: string; password: string; displayName: string }): Promise<KuraiMember> => {
      const member = await request<ApiMember>("/api/v1/auth/sign-up", { method: "POST", body: JSON.stringify({ email, password, displayName }) });
      csrfToken = member.csrfToken ?? csrfToken;
      return { id: member.id, email: member.email, displayName: member.displayName };
    },
    login: async ({ email, password }: { email: string; password: string }): Promise<KuraiMember> => {
      const member = await request<ApiMember>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      csrfToken = member.csrfToken ?? csrfToken;
      return { id: member.id, email: member.email, displayName: member.displayName };
    },
    logout: async () => {
      await request("/api/v1/auth/logout", { method: "POST" });
      csrfToken = null;
    },
    me: async (): Promise<KuraiMember> => request<KuraiMember>("/api/v1/me", { method: "GET" }),
    ledger: (): Promise<KuraiLedger> => request<KuraiLedger>("/api/v1/ledger", { method: "GET" }),
    media: async (): Promise<KuraiMedia[]> => {
      const assets = await request<KuraiMedia[]>("/api/v1/media", { method: "GET" });
      return assets.map((asset) => ({ ...asset, url: asset.url.startsWith("/") ? `${base}${asset.url}` : asset.url }));
    },
  };
}

const configuredBaseUrl = process.env.NEXT_PUBLIC_KURAI_API_BASE_URL;

/** Undefined in the static prototype; set the URL to make the UI use Django. */
export const kuraiApi = configuredBaseUrl ? createKuraiClient(configuredBaseUrl) : null;
