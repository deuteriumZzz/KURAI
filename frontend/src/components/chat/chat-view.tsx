"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChatSummary, Message, Mode } from "@/types/api";
import { applyEvent, newRun, type RunState, type StreamEvent } from "@/lib/stream";
import { branchOf, forksOf, leafOf, siblingsOf } from "@/lib/tree";
import { modeForFollowup } from "@/lib/modes";
import { apiOptions } from "@/lib/prompt";
import { findMatches } from "@/lib/search";
import { useTabStatus } from "@/lib/use-tab-status";
import { markStep, readPrefs } from "@/lib/prefs";
import { retrigger } from "@/lib/motion";
import Link from "next/link";
import { ArrowDown, ChevronDown, ChevronUp, PanelRight, Pin, PinOff, Plus, Search, Share2, X } from "lucide-react";
import { DISPLAY_TZ, formatCredits } from "@/lib/format";
import { partialCost, simulate, type SimOptions } from "@/mocks/stream";
import type { Outgoing } from "@/components/app/composer";
import type { FileMeta } from "@/lib/files";
import { Composer } from "@/components/app/composer";
import { AssistantMessage, UserMessage } from "./message";
import { IncomingToast } from "./toast";
import { SidePanel } from "./side-panel";
import { SelectionMenu } from "./selection-menu";
import { Inspector } from "./inspector";
import { vibrate } from "@/lib/haptics";
import { playSignal } from "@/lib/sound";
import { isQuietHour } from "@/lib/quiet";
import { AnimatePresence, motion } from "motion/react";
import { chatsStore, notify } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { useCalm } from "@/lib/use-calm";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { cn } from "@/lib/cn";
import { Appear } from "@/components/fx/motion";
import type { Artifact } from "@/lib/stream";
import { kuraiApi, type KuraiShareLink } from "@/lib/kurai-api";
import { defaultModel, modelById, type ModelInfo } from "@/lib/models";

type State = { messages: Message[]; runs: Record<string, RunState>; head: string };

const ANNOUNCE: Record<RunState["status"], string> = {
  streaming: "Модель отвечает",
  done: "Ответ готов",
  error: "Ошибка: генерация не удалась",
  aborted: "Ответ остановлен",
};

const WIDE = "(min-width: 1280px)";
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

const textOf = (m: Message | undefined) => m?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
const isJobMode = (mode: Mode) => mode === "image" || mode === "video";
let seq = 0;
const newId = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Source citations are a persisted message projection, so they survive an SSE reconnect or a full reload. */
function persistedSourceRuns(messages: Message[]): Record<string, RunState> {
  return Object.fromEntries(
    messages.flatMap((message) => {
      const sources = message.parts.find((part) => part.type === "sources");
      return sources && sources.items.length > 0 ? [[message.id, { status: "done" as const, log: [], sources: sources.items }]] : [];
    }),
  );
}

/** Единый чат: одна лента для текста, изображений и видео; ветки ответов; стриминг с расшифровкой. */
export function ChatView({ chat, initial, balanceMicro, live = false }: { chat: ChatSummary; initial: Message[]; balanceMicro: number; live?: boolean }) {
  const [state, setState] = useState<State>({ messages: initial, runs: persistedSourceRuns(initial), head: chat.headId });
  const [toast, setToast] = useState<{ title: string; id: string } | null>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const askers = useRef(new Map<string, (choice: number) => void>());
  const [panel, setPanel] = useState<Artifact | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [compressed, setCompressed] = useState(false);
  const lastOpts = useRef<SimOptions>({});
  const [initialIds] = useState(() => new Set(initial.map((m) => m.id)));
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [below, setBelow] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hit, setHit] = useState(0);
  const [pinned, setPinned] = useState<string[]>([]);
  const [compare, setCompare] = useState<Record<string, string>>({});
  const [liveBusy, setLiveBusy] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "creating" | "ready">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<KuraiShareLink | null>(null);
  const liveRunId = useRef<string | null>(null);
  const [docked, setDocked] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const calm = useCalm();
  const listed = useStore(chatsStore).find((c) => c.id === chat.id);
  useFocusTrap(sheet, sheetRef);
  // колонка инспектора помещается только на широком экране; ниже он открывается листом
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);
  const liveEventSource = useRef<EventSource | null>(null);

  const branch = branchOf(state.head, state.messages);
  const textStreaming = branch.find((m) => state.runs[m.id]?.status === "streaming" && !isJobMode(m.mode));
  const total = branch.reduce((s, m) => s + m.costMicro, 0);

  const apply = useCallback((id: string, ev: StreamEvent) => {
    setState((s) => {
      const msg = s.messages.find((m) => m.id === id);
      if (!msg) return s;
      const res = applyEvent(msg, s.runs[id] ?? newRun(), ev);
      return { ...s, messages: s.messages.map((m) => (m.id === id ? res.msg : m)), runs: { ...s.runs, [id]: res.run } };
    });
  }, []);

  const exportSlides = useCallback(async (message: Message) => {
    const api = kuraiApi;
    if (!api) return;
    try {
      const file = await api.exportSlides(message.id, chat.title);
      const objectUrl = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "kurai-slides.pptx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setToast({ title: "Презентация скачана", id: `slides-${message.id}` });
    } catch (reason) {
      setToast({ title: reason instanceof Error ? reason.message : "Не удалось подготовить презентацию.", id: `slides-error-${message.id}` });
    }
  }, [chat.title]);

  useEffect(() => {
    const api = kuraiApi;
    if (!live || !api) return;
    let active = true;
    void api.shareLinks(chat.id).then((links) => {
      // истёкшую ссылку не предлагаем как действующую
      const latest = links.find((link) => !link.expiresAt || Date.parse(link.expiresAt) > Date.now());
      if (!active || !latest) return;
      setShareLink(latest);
      setShareUrl(new URL(`/s/${latest.token}`, window.location.origin).toString());
      setShareState("ready");
    }).catch(() => {
      // Sharing is optional. Its availability must not block the chat itself.
    });
    return () => {
      active = false;
    };
  }, [chat.id, live]);

  const createShareLink = useCallback(async () => {
    const api = kuraiApi;
    if (!api || shareState === "creating") return;
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setToast({ title: "Ссылка скопирована · только чтение · 7 дней", id: "share-copy" });
      } catch {
        setToast({ title: "Браузер не разрешил копирование ссылки.", id: "share-copy-error" });
      }
      return;
    }
    setShareState("creating");
    try {
      const link = await api.createShareLink(chat.id);
      const url = new URL(`/s/${link.token}`, window.location.origin).toString();
      setShareLink(link);
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setToast({ title: "Ссылка скопирована · только чтение · 7 дней", id: `share-${link.id}` });
      } catch {
        setToast({ title: "Ссылка создана. Повторно нажмите «Поделиться», чтобы скопировать её.", id: `share-${link.id}` });
      }
      setShareState("ready");
      markStep("share");
    } catch (reason) {
      setToast({ title: reason instanceof Error ? reason.message : "Не удалось создать ссылку.", id: "share-error" });
      setShareState("idle");
    }
  }, [chat.id, shareState, shareUrl]);

  const revokeShareLink = useCallback(async () => {
    const api = kuraiApi;
    if (!api || !shareLink) return;
    try {
      await api.revokeShareLink(shareLink.id);
      setShareLink(null);
      setShareUrl(null);
      setShareState("idle");
      setToast({ title: "Общий доступ отозван", id: `share-revoke-${shareLink.id}` });
    } catch (reason) {
      setToast({ title: reason instanceof Error ? reason.message : "Не удалось отозвать ссылку.", id: "share-revoke-error" });
    }
  }, [shareLink]);

  const saveArtifact = useCallback(async (message: Message) => {
    const api = kuraiApi;
    if (!api) return;
    try {
      const kind = message.mode === "research" ? "research_packet" : "document";
      const artifact = await api.saveArtifact({ messageId: message.id, kind, title: chat.title });
      setToast({ title: `Сохранено в артефакты · ${artifact.title}`, id: `artifact-${artifact.id}` });
    } catch (reason) {
      setToast({ title: reason instanceof Error ? reason.message : "Не удалось сохранить артефакт.", id: `artifact-error-${message.id}` });
    }
  }, [chat.title]);

  const saveRecipe = useCallback(async (message: Message) => {
    const api = kuraiApi;
    if (!api) return;
    try {
      const recipe = await api.saveRecipe({ messageId: message.id, title: chat.title });
      setToast({ title: `Маршрут сохранён · ${recipe.title}`, id: `recipe-${recipe.id}` });
    } catch (reason) {
      setToast({ title: reason instanceof Error ? reason.message : "Не удалось сохранить рецепт.", id: `recipe-error-${message.id}` });
    }
  }, [chat.title]);

  const run = useCallback(
    async (id: string, prompt: string, mode: Mode, fromProgress = 0, opts: SimOptions = {}) => {
      const ctrl = new AbortController();
      controllers.current.set(id, ctrl);
      let chars = 0;
      try {
        const ask = () => new Promise<number>((resolve) => askers.current.set(id, resolve));
        for await (const ev of simulate(prompt, mode, ctrl.signal, fromProgress, ask, opts)) {
          if (ev.type === "delta") chars += ev.text.length;
          apply(id, ev);
          if (ev.type === "artifact") setPanel(ev.artifact);
          if (ev.type === "done" && (mode === "video" || mode === "image")) vibrate(40);
          if (ev.type === "done" && mode !== "text" && mode !== "audio") playSignal("done");
          if (ev.type === "done" && mode === "video") {
            const quiet = readPrefs().quiet && isQuietHour();
            if (!quiet) setToast({ title: `Видео готово · ${prompt.slice(0, 48)}`, id });
            notify(`Видео готово · ${prompt.slice(0, 48)}`, `/app/c/${chat.id}`);
            // системное уведомление, если вкладка свёрнута и пользователь разрешил
            if (!quiet && document.hidden && readPrefs().notifyBrowser && typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("KURAI · видео готово", { body: prompt.slice(0, 80), icon: "/icon.svg" });
            }
          }
          if (ev.type === "done" && (mode === "research" || mode === "slides")) notify(`${mode === "research" ? "Исследование" : "Слайды"} готово · ${prompt.slice(0, 40)}`, `/app/c/${chat.id}`);
        }
      } catch (e) {
        if ((e as DOMException).name === "AbortError") apply(id, { type: "aborted", costMicro: partialCost(chars) });
        else {
          apply(id, { type: "error", message: "провайдер недоступен", refundedMicro: 0 });
          vibrate([30, 40, 30]);
          playSignal("error");
        }
      } finally {
        controllers.current.delete(id);
      }
    },
    [apply, chat.id],
  );

  // демо-данные: видео из истории продолжает генерироваться
  useEffect(() => {
    const pending = initial.filter((m) => m.parts.some((p) => p.type === "job" && p.status === "running"));
    // запуск вне тела эффекта: подписка на «внешний» поток задач
    const t = setTimeout(() => {
      for (const m of pending) {
        const job = m.parts.find((p) => p.type === "job");
        const prompt = textOf(initial.find((x) => x.id === m.parentId));
        if (job?.type === "job") void run(m.id, prompt, m.mode, job.progress);
      }
    }, 0);
    const ctrls = controllers.current;
    return () => {
      clearTimeout(t);
      ctrls.forEach((c) => c.abort());
      liveEventSource.current?.close();
    };
  }, [initial, run]);

  const lastLen = state.messages.length + JSON.stringify(state.runs).length;
  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [lastLen]);

  function startAnswer(parentId: string, prompt: string, mode: Mode, opts: SimOptions = {}) {
    const id = newId("a");
    const now = new Date().toISOString();
    const answer: Message = {
      id, chatId: chat.id, parentId, role: "assistant", mode, model: null, costMicro: 0, createdAt: now,
      parts: isJobMode(mode) ? [{ type: "job", jobId: newId("j"), kind: mode as "image" | "video", status: "queued", progress: 0 }] : [],
    };
    setState((s) => ({ ...s, messages: [...s.messages, answer], runs: { ...s.runs, [id]: newRun() }, head: id }));
    stickToBottom.current = true;
    lastOpts.current = opts;
    void run(id, prompt, mode, 0, opts);
    return id;
  }

  function postUser(parentId: string | null, text: string, mode: Mode, files: FileMeta[], opts: SimOptions) {
    const uid = newId("u");
    const parts: Message["parts"] = [
      ...(text ? [{ type: "text" as const, text }] : []),
      ...files.map((f) => ({ type: "file" as const, name: f.name, sizeBytes: f.size, mime: f.type })),
    ];
    const user: Message = { id: uid, chatId: chat.id, parentId, role: "user", mode, model: null, costMicro: 0, createdAt: new Date().toISOString(), parts };
    setState((s) => ({ ...s, messages: [...s.messages, user], head: uid }));
    return startAnswer(uid, text || files.map((f) => f.name).join(", "), mode, { ...opts, files });
  }

  function liveOutgoing(text: string, mode: Mode, modelId: string | null): Outgoing {
    const fallback = modelById(modelId ?? "") ?? defaultModel(mode);
    const id = modelId === "openrouter/auto" ? "auto" : modelId ?? fallback.id;
    return { text, mode, model: { ...fallback, id } as ModelInfo, web: false, think: false, params: {}, files: [] };
  }

  async function sendLive(msg: Outgoing, parentId: string | null = null) {
    const api = kuraiApi;
    if (!api) return;
    setLiveBusy(true);
    try {
      const modelId = msg.model.id === "auto" ? "openrouter/auto" : msg.model.id;
      const attachmentIds = msg.files.flatMap((file) => file.assetId ? [file.assetId] : []);
      const options = apiOptions(msg.mode, msg);
      const quote = await api.quote(msg.mode, msg.text, modelId, attachmentIds, options);
      const started = await api.startRun({
        chatId: chat.id,
        parentId,
        quoteId: quote.quoteId,
        mode: msg.mode,
        modelId,
        text: msg.text,
        attachmentIds,
        options,
        idempotencyKey: crypto.randomUUID(),
      });
      liveRunId.current = started.runId;
      const snapshot = await api.getChat(chat.id);
      setState((current) => ({ ...current, messages: snapshot.messages, runs: { ...current.runs, ...persistedSourceRuns(snapshot.messages) }, head: snapshot.chat.headId }));
      const outputId = started.outputMessageId ?? snapshot.messages.at(-1)?.id;
      if (!outputId) throw new Error("Сервер не вернул сообщение для ответа.");

      const refreshSnapshot = async () => {
        const next = await api.getChat(chat.id);
        setState((current) => ({ ...current, messages: next.messages, runs: { ...current.runs, ...persistedSourceRuns(next.messages) }, head: next.chat.headId }));
      };
      const finishLiveRun = async () => {
        liveEventSource.current?.close();
        liveEventSource.current = null;
        liveRunId.current = null;
        setLiveBusy(false);
        await refreshSnapshot();
      };
      const source = new EventSource(api.runEventUrl(started), { withCredentials: true });
      liveEventSource.current?.close();
      liveEventSource.current = source;
      const onEvent = (event: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string; text?: string; model?: string; costMicro?: number; code?: string; url?: string; title?: string };
          switch (payload.type) {
            case "routed":
              apply(outputId, { type: "route", model: payload.model ?? msg.model.name, node: "OpenRouter", latencyMs: 0 });
              break;
            case "delta":
              apply(outputId, { type: "delta", text: payload.text ?? "" });
              break;
            case "source":
              if (payload.url && payload.title) apply(outputId, { type: "source", url: payload.url, title: payload.title });
              break;
            case "done":
              apply(outputId, { type: "done", costMicro: payload.costMicro ?? 0, durationMs: 0 });
              void finishLiveRun();
              break;
            case "error":
              apply(outputId, { type: "error", message: payload.code ?? "Не удалось выполнить запрос.", refundedMicro: 0 });
              void finishLiveRun();
              break;
            case "canceled":
              apply(outputId, { type: "aborted", costMicro: 0 });
              void finishLiveRun();
              break;
            case "media":
              void refreshSnapshot();
              break;
          }
        } catch {
          // A malformed event cannot corrupt the chat; the reconnect fallback loads a snapshot.
        }
      };
      ["routed", "delta", "source", "done", "error", "canceled", "media"].forEach((eventType) => source.addEventListener(eventType, onEvent));
      source.onerror = () => {
        // The server intentionally rotates bounded SSE connections. EventSource reconnects by
        // itself; checking terminal state prevents pointless reconnects after a final event was
        // delivered just before a network interruption.
        void api
          .getRun(started.runId)
          .then((run) => (["completed", "failed", "canceled"].includes(run.status) ? finishLiveRun() : refreshSnapshot()))
          .catch(() => undefined);
      };
    } catch (reason) {
      setToast({ title: reason instanceof Error ? reason.message : "Не удалось отправить запрос.", id: "live-error" });
    } finally {
      // Completion happens asynchronously through SSE. Failures before the connection is opened
      // still leave this block responsible for restoring the composer.
      if (!liveEventSource.current) {
        liveRunId.current = null;
        setLiveBusy(false);
      }
    }
  }

  function send(msg: Outgoing) {
    markStep(msg.mode === "image" ? "image" : msg.mode === "video" ? "video" : "text");
    if (live) {
      void sendLive(msg, state.head || null);
      return;
    }
    postUser(state.head, msg.text, msg.mode, msg.files, { model: msg.model.name, think: msg.think, web: msg.web, params: msg.params });
  }

  /** Изменить своё сообщение = новая ветка от того же родителя; старая сохраняется. */
  function editUser(m: Message, text: string) {
    setEditing(null);
    if (live) {
      void sendLive(liveOutgoing(text, m.mode, m.model), m.parentId);
      return;
    }
    postUser(m.parentId, text, m.mode, [], lastOpts.current.model ? { model: lastOpts.current.model } : {});
  }

  function regenerate(m: Message) {
    if (!m.parentId) return;
    if (live) {
      const input = state.messages.find((x) => x.id === m.parentId);
      void sendLive(liveOutgoing(textOf(input), m.mode, input?.model ?? null), m.parentId);
      return;
    }
    startAnswer(m.parentId, textOf(state.messages.find((x) => x.id === m.parentId)), m.mode, { model: lastOpts.current.model });
  }

  function answer(id: string, choice: number) {
    const resolve = askers.current.get(id);
    if (!resolve) return;
    askers.current.delete(id);
    resolve(choice);
  }

  // выбор реплики агента цифрой 1–3, пока он ждёт ответа и фокус не в поле ввода
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!/^[1-3]$/.test(e.key) || askers.current.size === 0) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      const [id] = [...askers.current.keys()];
      if (id) answer(id, Number(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function stop() {
    if (liveRunId.current && kuraiApi) {
      void kuraiApi.cancelRun(liveRunId.current);
      return;
    }
    if (textStreaming) controllers.current.get(textStreaming.id)?.abort();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && textStreaming && controllers.current.get(textStreaming.id)?.abort();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [textStreaming]);

  // вкладка браузера: прогресс самой долгой активной задачи
  const activeJob = state.messages
    .map((m) => ({ m, job: m.parts.find((p) => p.type === "job") }))
    .find(({ m, job }) => job?.type === "job" && state.runs[m.id]?.status === "streaming");
  const jobLabel =
    activeJob?.job?.type === "job"
      ? `${activeJob.job.kind === "video" ? "Видео" : "Изображение"} ${Math.round(activeJob.job.progress * 100)}%`
      : textStreaming
        ? "Отвечает"
        : null;
  useTabStatus(jobLabel);

  const matches = findMatches(branch.map(textOf), query);
  const pinnedMsgs = branch.filter((m) => pinned.includes(m.id));

  function scrollToMsg(id: string) {
    const el = document.getElementById(`msg-${id}`) ?? document.querySelector(`[data-msg="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    retrigger(el?.querySelector("article, div") ?? null, "fx-flicker-border");
  }

  function jump(d: number) {
    if (!matches.length) return;
    const next = (hit + d + matches.length) % matches.length;
    setHit(next);
    const m = branch[matches[next] ?? 0];
    if (m) scrollToMsg(m.id);
  }

  // смена маршрута между ответами — тихая подпись «Маршрут → X»
  const dividers = new Set<string>();
  branch
    .filter((m) => m.role === "assistant" && m.model)
    .forEach((m, i, arr) => {
      const prev = arr[i - 1];
      if (prev && prev.model !== m.model) dividers.add(m.id);
    });
  const lastAnswerId = branch.filter((x) => x.role === "assistant").at(-1)?.id;
  const lastRunStatus = lastAnswerId ? state.runs[lastAnswerId]?.status : undefined;
  const contextChars = branch.reduce((n, m) => n + textOf(m).length, 0);
  const inspectorProps = {
    branch,
    runs: state.runs,
    totalMicro: total,
    contextChars,
    onJump: scrollToMsg,
    onFollowup: (f: string) => postUser(state.head, f, modeForFollowup(f, "text"), [], { ...lastOpts.current, files: [] }),
    forks: forksOf(branch, state.messages),
    onSwitchBranch: (id: string) => setState((s) => ({ ...s, head: leafOf(id, s.messages) })),
  };
  const started = new Date(branch[0]?.createdAt ?? chat.updatedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: DISPLAY_TZ });

  function toggleInspector() {
    if (wide) setDocked((d) => !d);
    else setSheet((s) => !s);
  }

  return (
    <div className="k-workbench flex min-h-0 flex-1">
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 pr-3 pl-16 md:pr-4 md:pl-6">
        <div className="relative min-w-0" onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="-ml-2 flex h-9 max-w-full cursor-pointer items-center gap-1.5 rounded-(--radius-sm) px-2 text-left hover:bg-s2"
          >
            <span className="truncate text-[14.5px] text-ink">{chat.title}</span>
            <ChevronDown size={14} strokeWidth={1.5} className={cn("shrink-0 text-ink3 transition-transform duration-(--dur-fast)", menuOpen && "rotate-180")} />
          </button>
          {menuOpen && (
            <>
              <button type="button" aria-hidden="true" tabIndex={-1} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-(--z-bay) cursor-default" />
              <div
                aria-label="Действия с задачей"
                className="absolute top-11 left-0 z-(--z-bay) w-64 rounded-(--radius-md) border border-line2 bg-g1 p-1 shadow-(--shadow-float)"
              >
                <MenuRow icon={<Search size={15} strokeWidth={1.5} />} onClick={() => { setFindOpen(true); setMenuOpen(false); }}>
                  Найти в задаче
                </MenuRow>
                <MenuRow
                  icon={listed?.pinned ? <PinOff size={15} strokeWidth={1.5} /> : <Pin size={15} strokeWidth={1.5} />}
                  onClick={() => {
                    chatsStore.set((xs) => xs.map((x) => (x.id === chat.id ? { ...x, pinned: !x.pinned } : x)));
                    setMenuOpen(false);
                  }}
                >
                  {listed?.pinned ? "Открепить в истории" : "Закрепить в истории"}
                </MenuRow>
                <MenuRow icon={<PanelRight size={15} strokeWidth={1.5} />} onClick={() => { toggleInspector(); setMenuOpen(false); }}>
                  Контекст задачи
                </MenuRow>
              </div>
            </>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Link href="/app" aria-label="Новая задача" data-tip="Новая задача" className="k-act size-9">
            <Plus size={17} strokeWidth={1.5} />
          </Link>
          {live ? (
            <>
              <button
                type="button"
                onClick={() => void createShareLink()}
                disabled={shareState === "creating"}
                aria-label={shareState === "ready" ? "Скопировать ссылку только для чтения" : "Создать ссылку только для чтения"}
                className="k-tool disabled:cursor-wait disabled:opacity-60"
              >
                <Share2 size={15} strokeWidth={1.5} />
                <span className="max-sm:hidden">{shareState === "creating" ? "Создаю…" : shareState === "ready" ? "Скопировать ссылку" : "Поделиться"}</span>
              </button>
              {shareLink && (
                <button type="button" onClick={() => void revokeShareLink()} className="k-tool text-[12.5px] text-ink3 hover:text-warn">
                  Отозвать
                </button>
              )}
            </>
          ) : (
            <button type="button" aria-disabled="true" aria-label="Поделиться — включится после подключения рабочего API" data-tip="Включится после подключения API" className="k-tool">
              <Share2 size={15} strokeWidth={1.5} />
              <span className="max-sm:hidden">Поделиться</span>
            </button>
          )}
          <button type="button" onClick={toggleInspector} aria-label="Контекст задачи" aria-pressed={wide ? docked : sheet} data-tip="Контекст задачи" className="k-act size-9">
            <PanelRight size={17} strokeWidth={1.5} />
          </button>
        </div>
      </header>
      {findOpen && (
        <div className="mx-4 mb-2 flex h-10 items-center gap-2 rounded-(--radius-md) border border-line2 bg-g1 px-3 focus-within:border-ink3 md:mx-6">
          <Search size={14} strokeWidth={1.5} className="shrink-0 text-ink3" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHit(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") jump(e.shiftKey ? -1 : 1);
              if (e.key === "Escape") setFindOpen(false);
            }}
            aria-label="Найти в задаче"
            placeholder="Найти в этой задаче…"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink3"
          />
          <span className="k-meta" aria-live="polite">
            {query ? (matches.length ? `${Math.min(hit, matches.length - 1) + 1} из ${matches.length}` : "нет совпадений") : ""}
          </span>
          <button type="button" onClick={() => jump(-1)} aria-label="Предыдущее совпадение" className="k-act size-7">
            <ChevronUp size={14} strokeWidth={1.5} />
          </button>
          <button type="button" onClick={() => jump(1)} aria-label="Следующее совпадение" className="k-act size-7">
            <ChevronDown size={14} strokeWidth={1.5} />
          </button>
          <button type="button" onClick={() => setFindOpen(false)} aria-label="Закрыть поиск" className="k-act size-7">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}
      {pinnedMsgs.length > 0 && (
        <div className="mx-4 mb-2 flex items-center gap-2 overflow-x-auto md:mx-6">
          <Pin size={13} strokeWidth={1.5} className="shrink-0 text-ink3" aria-hidden="true" />
          {pinnedMsgs.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => scrollToMsg(m.id)}
              className="h-7 max-w-60 shrink-0 cursor-pointer truncate rounded-(--radius-sm) border border-line px-2.5 text-[12.5px] text-ink2 hover:border-line2 hover:text-ink"
            >
              {textOf(m).slice(0, 60) || m.model}
            </button>
          ))}
        </div>
      )}

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          setBelow(!stickToBottom.current);
        }}
        className="relative flex-1 overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-[calc(var(--read-width,42rem)+3.25rem)] px-4 pt-6 pb-12 md:px-8 md:pt-9">
          <header className="mb-10 md:pl-[52px]">
            <h1 className="text-[clamp(1.75rem,2.7vw,2.3rem)] leading-[1.15] font-light tracking-[-0.022em] text-balance text-ink">{chat.title}</h1>
            <p className="k-meta mt-3 flex flex-wrap items-center gap-x-2">
              <span>{started}</span>
              <span aria-hidden="true">·</span>
              <span>{branch.length} сообщ.</span>
              {total > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formatCredits(total)}</span>
                </>
              )}
            </p>
          </header>
          <div className="flex flex-col gap-11">
            {branch.map((m) => {
              if (m.role === "user") {
                const us = siblingsOf(m.id, state.messages);
                const ui = us.findIndex((x) => x.id === m.id);
                const goU = (i: number) => {
                  const target = us[i];
                  return target ? () => setState((s) => ({ ...s, head: leafOf(target.id, s.messages) })) : undefined;
                };
                return (
                  <Appear key={m.id} data-msg={m.id} index={initialIds.has(m.id) ? branch.indexOf(m) : 0}>
                    <UserMessage
                      m={m}
                      editing={editing === m.id}
                      onEdit={() => setEditing(m.id)}
                      onCancel={() => setEditing(null)}
                      onSubmitEdit={(t) => editUser(m, t)}
                      versions={{ index: ui, total: us.length, prev: ui > 0 ? goU(ui - 1) : undefined, next: goU(ui + 1) }}
                    />
                  </Appear>
                );
              }
              const sibs = siblingsOf(m.id, state.messages);
              const idx = sibs.findIndex((x) => x.id === m.id);
              const go = (i: number) => {
                const target = sibs[i];
                return target ? () => setState((s) => ({ ...s, head: leafOf(target.id, s.messages) })) : undefined;
              };
              const divider = dividers.has(m.id) ? m.model : null;
              return (
                <Fragment key={m.id}>
                  {divider && (
                    <div className="-mb-5 flex items-center gap-3 md:pl-[52px]">
                      <span className="k-index">Маршрут → {divider}</span>
                      <span aria-hidden="true" className="h-px flex-1 bg-line" />
                    </div>
                  )}
                  <Appear id={`msg-${m.id}`} index={initialIds.has(m.id) ? branch.indexOf(m) : 0}>
                    <AssistantMessage
                      m={m}
                      run={state.runs[m.id]}
                      versions={{ index: idx, total: sibs.length, prev: idx > 0 ? go(idx - 1) : undefined, next: go(idx + 1) }}
                      last={m.id === lastAnswerId}
                      onRegenerate={() => regenerate(m)}
                      onStop={state.runs[m.id]?.status === "streaming" ? stop : undefined}
                      onExportSlides={live ? () => void exportSlides(m) : undefined}
                      onSaveArtifact={live ? () => void saveArtifact(m) : undefined}
                      onSaveRecipe={live ? () => void saveRecipe(m) : undefined}
                      pinned={pinned.includes(m.id)}
                      compareBefore={compare[m.id]}
                      onPin={() => setPinned((p) => (p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id]))}
                      onImageAction={(a, i) => {
                        const alt = m.parts.filter((p) => p.type === "image")[i];
                        const what = alt?.type === "image" ? alt.alt : "картинку";
                        const opts = { ...lastOpts.current, files: [] };
                        if (a === "animate") postUser(state.head, `Оживи: ${what}`, "video", [], opts);
                        if (a === "variants") postUser(state.head, `Ещё варианты: ${what}`, "image", [], opts);
                        if (a === "upscale") {
                          const aid = postUser(state.head, `Увеличь до 4K: ${what}`, "image", [], { ...opts, params: { count: "1" } });
                          const src = alt?.type === "image" ? alt.url : undefined;
                          if (src) setCompare((c) => ({ ...c, [aid]: src }));
                        }
                      }}
                      onFollowup={(f) => postUser(state.head, f, modeForFollowup(f, m.mode), [], { ...lastOpts.current, files: [] })}
                      onAnswer={(c) => answer(m.id, c)}
                      onOpenArtifact={() => {
                        const a = state.runs[m.id]?.artifact;
                        if (a) setPanel(a);
                      }}
                    />
                  </Appear>
                </Fragment>
              );
            })}
            {branch.length === 0 && <p className="text-ink3 md:pl-[52px]">Опишите задачу ниже — модель подберётся автоматически, цена будет видна до запуска.</p>}
          </div>
        </div>
      </div>

      {/* объявления для скринридера: состояние последнего ответа, без повторов при каждом токене */}
      <p role="status" aria-live="polite" className="fx-sr">
        {lastRunStatus ? ANNOUNCE[lastRunStatus] : ""}
      </p>
      <SelectionMenu
        root={scroller}
        onAction={(a, text) => {
          const quote = text.length > 300 ? `${text.slice(0, 300)}…` : text;
          const opts = { ...lastOpts.current, files: [] };
          if (a === "explain") postUser(state.head, `Объясни проще: «${quote}»`, "text", [], opts);
          else if (a === "translate") postUser(state.head, `Переведи на английский: «${quote}»`, "text", [], opts);
          else window.dispatchEvent(new CustomEvent("kurai:prefill", { detail: a === "quote" ? `> ${quote}\n\n` : `Про фрагмент «${quote}»: ` }));
        }}
      />
      <AnimatePresence>
        {below && (
          <motion.button
            type="button"
            initial={{ opacity: 0, transform: "translate(-50%, 6px)" }}
            animate={{ opacity: 1, transform: "translate(-50%, 0px)" }}
            exit={{ opacity: 0, transform: "translate(-50%, 6px)" }}
            transition={{ duration: 0.16 }}
            onClick={() => {
              const el = scroller.current;
              el?.scrollTo({ top: el.scrollHeight, behavior: calm ? "auto" : "smooth" });
            }}
            className="absolute bottom-36 left-1/2 z-10 inline-flex h-8 cursor-pointer items-center gap-2 rounded-(--radius-sm) border border-line2 bg-g1 px-3 text-[12.5px] text-ink2 shadow-(--shadow-float) hover:text-ink"
          >
            {textStreaming && <i aria-hidden="true" className="size-1.5 bg-acc" />}
            <ArrowDown size={14} strokeWidth={1.5} />
            {textStreaming ? "К ответу — он ещё пишется" : "К последнему сообщению"}
          </motion.button>
        )}
      </AnimatePresence>
      <div className="relative shrink-0 px-3 pt-1 pb-[max(0.9rem,env(safe-area-inset-bottom))] md:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-full h-10 bg-linear-to-t from-bg to-transparent" />
        <div className="mx-auto w-full max-w-[60rem]">
          <Composer
            variant="dock"
            draftKey={chat.id}
            onSend={send}
            busy={!!textStreaming || liveBusy}
            onStop={stop}
            balanceMicro={balanceMicro}
            contextChars={Math.round(contextChars * (compressed ? 0.3 : 1))}
            onCompress={() => setCompressed(true)}
            onEditLast={() => {
              const last = [...branch].reverse().find((m) => m.role === "user");
              if (last) setEditing(last.id);
            }}
          />
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <IncomingToast
            title={toast.title}
            onClose={() => setToast(null)}
            onOpen={() => {
              document.getElementById(`msg-${toast.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              setToast(null);
            }}
          />
        )}
      </AnimatePresence>
    </main>

    {/* Inspector: колонка на широком экране — появляется с правого края */}
    <AnimatePresence initial={false}>
      {!panel && docked && (
        <motion.div
          key="inspector"
          className="hidden min-h-0 xl:flex"
          initial={calm ? { opacity: 0 } : { opacity: 0, transform: "translateX(16px)" }}
          animate={{ opacity: 1, transform: "translateX(0px)" }}
          exit={calm ? { opacity: 0 } : { opacity: 0, transform: "translateX(16px)", transition: { duration: 0.16 } }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Inspector {...inspectorProps} />
        </motion.div>
      )}
    </AnimatePresence>
    {/* планшет и телефон: тот же Inspector листом поверх, фокус внутри, Esc закрывает */}
    <AnimatePresence>
      {sheet && !panel && (
        <div ref={sheetRef} className="fixed inset-0 z-(--z-overlay) xl:hidden" onKeyDown={(e) => e.key === "Escape" && setSheet(false)}>
          <motion.div aria-hidden="true" onClick={() => setSheet(false)} className="absolute inset-0 bg-bg/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Контекст задачи"
            className="absolute inset-y-0 right-0 flex w-[min(380px,100vw)] shadow-(--shadow-float)"
            initial={calm ? { opacity: 0 } : { transform: "translateX(100%)" }}
            animate={calm ? { opacity: 1 } : { transform: "translateX(0%)" }}
            exit={calm ? { opacity: 0 } : { transform: "translateX(100%)", transition: { duration: 0.18 } }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Inspector {...inspectorProps} onClose={() => setSheet(false)} className="w-full" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    <AnimatePresence>{panel && <SidePanel key="panel" artifact={panel} onClose={() => setPanel(null)} />}</AnimatePresence>
    </div>
  );
}

function MenuRow({ icon, onClick, children }: { icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-(--radius-sm) px-2.5 text-left text-[13.5px] text-ink2 hover:bg-s2 hover:text-ink pointer-coarse:h-11">
      <span className="text-ink3">{icon}</span>
      {children}
    </button>
  );
}
