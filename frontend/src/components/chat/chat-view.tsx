"use client";

import { Fragment, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChatSummary, Message, Mode } from "@/types/api";
import { applyEvent, newRun, type RunState, type StreamEvent } from "@/lib/stream";
import { branchOf, forksOf, leafOf, siblingsOf } from "@/lib/tree";
import { modeForFollowup } from "@/lib/modes";
import { apiOptions } from "@/lib/prompt";
import { findMatches } from "@/lib/search";
import { useTabStatus } from "@/lib/use-tab-status";
import { markStep, readPrefs } from "@/lib/prefs";
import { flyFromOrigin, flyTo, isCalm, retrigger, SPRING } from "@/lib/motion";
import { takeHandoff } from "@/lib/chat-cache";
import { followupMode, followupsFor, livePlan, type LivePhase } from "@/lib/live-plan";
import Link from "next/link";
import { ArrowDown, Bookmark, ChevronDown, ChevronUp, PanelRight, Pencil, Pin, PinOff, Plus, Presentation, Search, Share2, X } from "lucide-react";
import { DISPLAY_TZ, formatCredits, hostOf, plural } from "@/lib/format";
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
import { AnimatePresence, animate, motion, useDragControls, useMotionValue } from "motion/react";
import { chatsStore, notify, projectsStore, refreshBalance } from "@/lib/app-state";
import { clearTracked, settleTracked, track, trackedStore } from "@/lib/tracked";
import { useStore } from "@/lib/store";
import { useCalm } from "@/lib/use-calm";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { cn } from "@/lib/cn";
import { Appear } from "@/components/fx/motion";
import { Decode } from "@/components/fx/decode";
import { Minimap, type MapItem } from "./minimap";
import { DrawnCheck } from "@/components/ui/action-button";
import { slidesOf } from "./presenter";
import type { Artifact } from "@/lib/stream";
import { kuraiApi, type KuraiRun, type KuraiShareLink } from "@/lib/kurai-api";
import { defaultModel, modelById, routeLabel, type ModelInfo } from "@/lib/models";

type State = { messages: Message[]; runs: Record<string, RunState>; head: string };
type Bookmark = { id: string; msgId: string; quote: string };

// 93 — презентация грузится отдельным чанком, только когда её открыли
const LazyPresenter = lazy(() => import("./presenter").then((m) => ({ default: m.Presenter })));
const WORDS_PER_MIN = 180;
const nowMs = () => Date.now();
const bookmarksKey = (chatId: string) => `kurai:bookmarks:${chatId}`;
const scrollKey = (chatId: string) => `kurai:scroll:${chatId}`;
/** Абзац ответа, в котором лежит цитата закладки. */
const blockWith = (msgId: string, quote: string) =>
  [...(document.getElementById(`msg-${msgId}`)?.querySelectorAll<HTMLElement>(".k-doc p, .k-doc li, .k-doc h3, .k-doc h4, .k-doc blockquote") ?? [])].find((el) => el.textContent?.includes(quote.slice(0, 80)));

const ANNOUNCE: Record<RunState["status"], string> = {
  streaming: "Модель отвечает",
  done: "Ответ готов",
  error: "Ошибка: генерация не удалась",
  aborted: "Ответ остановлен",
};

const WIDE = "(min-width: 1280px)";
const PHONE = "(max-width: 767px)";
const subscribeMedia = (query: string) => (cb: () => void) => {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const subscribeWide = subscribeMedia(WIDE);
const subscribePhone = subscribeMedia(PHONE);
/** 40 — положения листа на телефоне: доля высоты, на которую лист опущен. */
const SHEET_FULL = 0;
const SHEET_HALF = 0.45;

const textOf = (m: Message | undefined) => m?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
const isJobMode = (mode: Mode) => mode === "image" || mode === "video";
let seq = 0;
const newId = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Source citations are a persisted message projection, so they survive an SSE reconnect or a full reload. */
function persistedSourceRuns(messages: Message[], runs: Record<string, RunState> = {}): Record<string, RunState> {
  return Object.fromEntries(
    messages.flatMap((message) => {
      const sources = message.parts.find((part) => part.type === "sources");
      if (!sources || sources.items.length === 0) return [];
      // у живого запуска из снимка берём только источники: план, хронометраж и продолжения остаются
      const known = runs[message.id];
      return [[message.id, known ? { ...known, sources: sources.items } : { status: "done" as const, log: [], sources: sources.items }]];
    }),
  );
}

/** К15 — продолжение встаёт в поле ввода вместе со своим режимом («…слайды» → режим слайдов). */
function prefillFollowup(text: string) {
  window.dispatchEvent(new CustomEvent("kurai:mode", { detail: followupMode(text) }));
  window.dispatchEvent(new CustomEvent("kurai:prefill", { detail: text }));
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
  const [revokeAsk, setRevokeAsk] = useState(false);
  const liveRunId = useRef<string | null>(null);
  // режим запуска с живым потоком: при текстовом потоке опрос снимка пропускается (иначе задвоится текст)
  const liveMode = useRef<Mode>("text");
  const [docked, setDocked] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const calm = useCalm();
  const listed = useStore(chatsStore).find((c) => c.id === chat.id);
  useFocusTrap(sheet, sheetRef);
  // колонка инспектора помещается только на широком экране; ниже он открывается листом
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE).matches, () => false);
  const sheetY = useMotionValue(0);
  const sheetDrag = useDragControls();
  // высота листа — 90% экрана; все положения в пикселях, чтобы инерция считалась в одних единицах
  const sheetH = typeof window === "undefined" ? 800 : window.innerHeight * 0.9;
  const liveEventSource = useRef<EventSource | null>(null);
  const docTitle = useRef<HTMLHeadingElement>(null);
  // 6/52 — шапка сжимается и получает тень после прокрутки; 2 — название переезжает в шапку, когда заголовок ушёл
  const [scrolled, setScrolled] = useState(false);
  const [titleOut, setTitleOut] = useState(false);
  // 9 — сколько сообщений прибавилось, пока вы читали выше; 108 — сколько прочитано
  const [leftAt, setLeftAt] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  // 26/70 — направление смены версии: то, что после развилки, приезжает с этой стороны
  const [slideDir, setSlideDir] = useState(0);
  // 98 — ответ под клавиатурным фокусом J/K
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  // 8 — сноски в зоне чтения подсвечивают свои источники
  const [reading, setReading] = useState<number[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [presenting, setPresenting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const titleBtn = useRef<HTMLButtonElement>(null);
  const menuOpenedAt = useRef(0);
  /** 71 — поле на месте названия и той же ширины. */
  const startRename = () => {
    setRenameWidth(titleBtn.current?.offsetWidth ?? 0);
    setRenaming(true);
  };
  // 96 — временные сообщения сразу в ленте; после ответа сервера ключи остаются прежними (без перерисовки)
  const [aliases, setAliases] = useState<Record<string, string>>({});
  // 96 — судьба временного сообщения: «отправляется» до ответа сервера, «не отправлено» — с повтором
  const [delivery, setDelivery] = useState<Record<string, { status: "sending" | "failed"; msg: Outgoing; parentId: string | null }>>({});
  const [renameWidth, setRenameWidth] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  // 91 — абзац под курсором: на полях появляется кнопка закладки
  const [hoverBlock, setHoverBlock] = useState<{ top: number; left: number; msgId: string; text: string; marked: boolean } | null>(null);
  const follow = useRef(0);
  const lastTop = useRef(0);
  const title = listed?.title ?? chat.title;
  const [renderedAt] = useState(nowMs);
  // 101 — чат в проекте с инструкциями: тихая отметка, что они применяются к каждому запросу
  const project = useStore(projectsStore).find((p) => p.chatIds.includes(chat.id));

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

  const flashCopied = () => {
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 1400);
  };

  const createShareLink = useCallback(async () => {
    const api = kuraiApi;
    if (!api || shareState === "creating") return;
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        flashCopied();
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
        flashCopied();
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

  const saveArtifact = useCallback(async (message: Message): Promise<boolean> => {
    const api = kuraiApi;
    if (!api) return false;
    try {
      const kind = message.mode === "research" ? "research_packet" : "document";
      const artifact = await api.saveArtifact({ messageId: message.id, kind, title: chat.title });
      // К20 — осколок «выпадает» из ответа в раздел «Артефакты»
      const from = document.getElementById(`msg-${message.id}`);
      const to = [...document.querySelectorAll('a[href="/app/artifacts"]')].find((el) => el.getClientRects().length > 0);
      const code = artifact.id.replace(/[^0-9a-f]/gi, "").slice(0, 8).toUpperCase();
      if (from && to) void flyTo(from, to, { html: `<span class="k-money-chip k-code">ART·${code.slice(0, 4)}-${code.slice(4)}</span>`, arc: 80, endScale: 0.6, ms: 760 });
      setToast({ title: `Сохранено в артефакты · ${artifact.title}`, id: `artifact-${artifact.id}` });
      return true;
    } catch (reason) {
      setToast({ title: reason instanceof Error ? reason.message : "Не удалось сохранить артефакт.", id: `artifact-error-${message.id}` });
      return false;
    }
  }, [chat.title]);

  const saveRecipe = useCallback(async (message: Message): Promise<boolean> => {
    const api = kuraiApi;
    if (!api) return false;
    try {
      const recipe = await api.saveRecipe({ messageId: message.id, title: chat.title });
      setToast({ title: `Маршрут сохранён · ${recipe.title}`, id: `recipe-${recipe.id}` });
      return true;
    } catch (reason) {
      setToast({ title: reason instanceof Error ? reason.message : "Не удалось сохранить рецепт.", id: `recipe-error-${message.id}` });
      return false;
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

  // офлайн-прототип: запрос с главной уходит в этот новый чат. Забираем его только в момент отправки:
  // двойной монтаж в dev отменит первый таймер, и запрос не потеряется и не уйдёт дважды
  useEffect(() => {
    if (live) return;
    const t = setTimeout(() => {
      const h = takeHandoff(chat.id);
      if (h) postUser(null, h.text, h.mode, [], { model: h.model });
    }, 0);
    return () => clearTimeout(t);
    // postUser читает только setState и refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id, live]);

  // несколько генераций в одном чате: те, что без живого потока, обновляются опросом сервера
  const pendingJobs = live && state.messages.some((m) => m.parts.some((p) => p.type === "job" && (p.status === "running" || p.status === "queued")));
  useEffect(() => {
    const api = kuraiApi;
    if (!api || !pendingJobs) return;
    const t = window.setInterval(() => {
      if (liveRunId.current && !isJobMode(liveMode.current)) return;
      void api
        .getChat(chat.id)
        .then((next) => setState((current) => ({ ...current, messages: next.messages, runs: { ...current.runs, ...persistedSourceRuns(next.messages, current.runs) } })))
        .catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(t);
  }, [pendingJobs, chat.id]);

  // незавершённая генерация из истории: с сервером — подключаемся к настоящему запуску (jobId = id запуска),
  // в офлайн-прототипе — демо-поток. Симуляция с сервером запрещена: она выдумала бы результат и цену.
  useEffect(() => {
    const pending = initial.filter((m) => m.parts.some((p) => p.type === "job" && (p.status === "running" || p.status === "queued")));
    // запуск вне тела эффекта: подписка на «внешний» поток задач
    const t = setTimeout(() => {
      const api = kuraiApi;
      if (live) {
        // ponytail: живой поток держится для одного запуска — подключаем самый свежий, остальные показывают последнее известное состояние
        const job = pending.at(-1)?.parts.find((p) => p.type === "job");
        if (api && job?.type === "job" && !liveRunId.current)
          void api
            .getRun(job.jobId)
            .then((r) => (r.chatId === chat.id && !["completed", "failed", "canceled"].includes(r.status) ? attachLive(r, "") : undefined))
            .catch(() => undefined);
        return;
      }
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
    // attachLive читает только refs и setState — как и у подхвата ?run=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, run, live, chat.id]);

  const lastLen = state.messages.length + JSON.stringify(state.runs).length + state.messages.reduce((n, m) => n + textOf(m).length, 0);
  // 54 — лента едет за печатающимся ответом мягко, «магнитом» к низу; прокрутили вверх — магнит отпускает
  useEffect(() => {
    const el = scroller.current;
    if (!el || !stickToBottom.current) return;
    if (isCalm()) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    if (follow.current) return;
    const step = () => {
      const target = el.scrollHeight - el.clientHeight;
      const gap = target - el.scrollTop;
      if (!stickToBottom.current || gap < 1) {
        follow.current = 0;
        return;
      }
      el.scrollTop += Math.max(1, gap * 0.22);
      follow.current = requestAnimationFrame(step);
    };
    follow.current = requestAnimationFrame(step);
  }, [lastLen]);
  // отменённый кадр обнуляем: иначе магнит считает, что уже едет, и больше не запускается (двойной монтаж в dev)
  useEffect(
    () => () => {
      cancelAnimationFrame(follow.current);
      follow.current = 0;
    },
    [],
  );

  // 53 — возврат в чат открывает то место, где вы остановились, с короткой докруткой
  useLayoutEffect(() => {
    const el = scroller.current;
    let saved = NaN;
    try {
      saved = Number(sessionStorage.getItem(scrollKey(chat.id)));
    } catch {}
    if (!el || !saved || saved >= el.scrollHeight - el.clientHeight - 120) return;
    stickToBottom.current = false;
    el.scrollTop = Math.max(0, saved - 96);
    el.scrollTo({ top: saved, behavior: isCalm() ? "auto" : "smooth" });
  }, [chat.id]);

  // 91 — закладки этой задачи живут в браузере
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- чтение localStorage после гидрации
      setBookmarks(JSON.parse(localStorage.getItem(bookmarksKey(chat.id)) ?? "[]") as Bookmark[]);
    } catch {}
  }, [chat.id]);
  function saveBookmarks(next: Bookmark[]) {
    setBookmarks(next);
    try {
      localStorage.setItem(bookmarksKey(chat.id), JSON.stringify(next));
    } catch {}
  }
  // абзац с закладкой получает тонкую метку на полях
  useEffect(() => {
    document.querySelectorAll("[data-bookmark]").forEach((el) => el.removeAttribute("data-bookmark"));
    bookmarks.forEach((b) => blockWith(b.msgId, b.quote)?.setAttribute("data-bookmark", ""));
  }, [bookmarks, lastLen, state.head]);

  // 2 — название из строки истории перелетает в крупный заголовок; К20 — ссылка #msg-… открывает нужный ответ
  useEffect(() => {
    // точка старта привязана к этому чату: медленная загрузка не мешает, чужой чат её не подхватит
    flyFromOrigin(`chat-title:${chat.id}`, docTitle.current, 10_000);
    const target = window.location.hash.startsWith("#msg-") ? window.location.hash.slice(5) : null;
    if (target) window.setTimeout(() => scrollToMsg(target), 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- один раз при открытии каждого чата
  }, [chat.id]);

  // 2 — название уезжает в шапку, когда крупный заголовок документа скрылся под ней
  useEffect(() => {
    const el = docTitle.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setTitleOut(!entry?.isIntersecting), { root: scroller.current, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
    // 96 — сообщение в ленте сразу, ответ — заглушкой; сервер потом подменит их настоящими
    const temp = { user: newId("tmp-u"), answer: newId("tmp-a") };
    const at = new Date().toISOString();
    setState((s) => ({
      ...s,
      messages: [
        ...s.messages,
        { id: temp.user, chatId: chat.id, parentId, role: "user", mode: msg.mode, model: null, costMicro: 0, createdAt: at, parts: [...(msg.text ? [{ type: "text" as const, text: msg.text }] : []), ...msg.files.map((f) => ({ type: "file" as const, name: f.name, sizeBytes: f.size, mime: f.type }))] },
        { id: temp.answer, chatId: chat.id, parentId: temp.user, role: "assistant", mode: msg.mode, model: null, costMicro: 0, createdAt: at, parts: [] },
      ],
      runs: { ...s.runs, [temp.answer]: { ...newRun(), requested: msg.model.id } },
      head: temp.answer,
    }));
    setDelivery((d) => ({ ...d, [temp.user]: { status: "sending", msg, parentId } }));
    stickToBottom.current = true;
    try {
      const modelId = msg.model.id === "auto" ? "openrouter/auto" : msg.model.id;
      const attachmentIds = msg.files.flatMap((file) => file.assetId ? [file.assetId] : []);
      const options = apiOptions(msg.mode, msg);
      // дорогой запуск уже подтверждён по зафиксированной цене — повторно не считаем
      const quoteId = msg.quoteId ?? (await api.quote(msg.mode, msg.text, modelId, attachmentIds, options)).quoteId;
      const started = await api.startRun({
        chatId: chat.id,
        parentId,
        quoteId,
        mode: msg.mode,
        modelId,
        text: msg.text,
        attachmentIds,
        options,
        idempotencyKey: crypto.randomUUID(),
      });
      refreshBalance();
      await attachLive(started, msg.model.name, temp);
    } catch (reason) {
      // запуск не прошёл: сообщение остаётся в ленте честно помеченным, рядом — «Повторить»
      setState((s) => ({ ...s, messages: s.messages.filter((m) => m.id !== temp.answer), head: s.head === temp.answer ? temp.user : s.head }));
      setDelivery((d) => ({ ...d, [temp.user]: { status: "failed", msg, parentId } }));
      setToast({ title: `Не отправлено: ${reason instanceof Error ? reason.message : "сервер недоступен"}`, id: "live-error" });
    } finally {
      // Completion happens asynchronously through SSE. Failures before the connection is opened
      // still leave this block responsible for restoring the composer.
      if (!liveEventSource.current) {
        liveRunId.current = null;
        setLiveBusy(false);
      }
    }
  }

  /** Поток серверного запуска — и для нового сообщения, и для задачи, начатой на главной. */
  async function attachLive(started: KuraiRun, routeName: string, temp?: { user: string; answer: string }) {
    const api = kuraiApi;
    if (!api) return;
    liveRunId.current = started.runId;
    setLiveBusy(true);
    const snapshot = await api.getChat(chat.id);
    const outputId = started.outputMessageId ?? snapshot.messages.at(-1)?.id;
    if (!outputId) throw new Error("Сервер не вернул сообщение для ответа.");
    const inputId = snapshot.messages.find((m) => m.id === outputId)?.parentId;
    if (temp && inputId) setAliases((a) => ({ ...a, [inputId]: temp.user, [outputId]: temp.answer }));
    if (temp)
      setDelivery((d) => {
        const { [temp.user]: _done, ...rest } = d;
        return rest;
      });
    setState((current) => ({
      ...current,
      messages: snapshot.messages,
      // хронометраж запуска начинается с момента отправки, а не с ответа сервера
      runs: { ...current.runs, ...persistedSourceRuns(snapshot.messages, current.runs), [outputId]: current.runs[outputId] ?? (temp ? current.runs[temp.answer] : undefined) ?? newRun() },
      head: snapshot.chat.headId,
    }));
    // К12 — запуск видно из любого раздела, пока он идёт
    track({ runId: started.runId, chatId: chat.id, title: chat.title, mode: snapshot.messages.find((m) => m.id === outputId)?.mode ?? "text", startedAt: new Date().toISOString(), status: "running", step: "в очереди" });
    // 29/30 — план и лента действий исследования и слайдов строятся из тех же событий сервера
    const runMode = snapshot.messages.find((m) => m.id === outputId)?.mode ?? "text";
    liveMode.current = runMode;
    let phase: LivePhase = "queued";
    let sourceCount = 0;
    const plan = (next: LivePhase) => {
      phase = next;
      const tasks = livePlan(runMode, phase, sourceCount);
      if (tasks) apply(outputId, { type: "tasks", tasks });
    };
    const act = (text: string) => {
      if (livePlan(runMode, phase, 0)) apply(outputId, { type: "action", text });
    };
    plan("queued");
    // К12 — текущий шаг из настоящих событий запуска; обновляется только на смене шага
    let step = "в очереди";
    const stepTo = (next: string) => {
      if (next === step) return;
      step = next;
      settleTracked(started.runId, { step: next });
    };

    const refreshSnapshot = async () => {
      const next = await api.getChat(chat.id);
      setState((current) => ({ ...current, messages: next.messages, runs: { ...current.runs, ...persistedSourceRuns(next.messages, current.runs) }, head: next.chat.headId }));
      // К12 — у генерации медиа есть настоящий процент
      const job = next.messages.find((m) => m.id === outputId)?.parts.find((p) => p.type === "job");
      if (job?.type === "job") settleTracked(started.runId, { pct: job.progress, step: job.status === "queued" ? "в очереди" : "генерация" });
    };
    const finishLiveRun = async () => {
      liveEventSource.current?.close();
      liveEventSource.current = null;
      liveRunId.current = null;
      setLiveBusy(false);
      refreshBalance();
      // задача с новым ответом поднимается в истории (строка переезжает наверх)
      chatsStore.set((xs) => xs.map((x) => (x.id === chat.id ? { ...x, updatedAt: new Date().toISOString() } : x)));
      await refreshSnapshot();
    };
    const source = new EventSource(api.runEventUrl(started), { withCredentials: true });
    liveEventSource.current?.close();
    liveEventSource.current = source;
    const onEvent = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; text?: string; model?: string; costMicro?: number; code?: string; url?: string; title?: string; quote?: string; readAt?: string };
        switch (payload.type) {
          case "routed":
            apply(outputId, { type: "route", model: payload.model ?? routeName, node: "OpenRouter", latencyMs: 0 });
            stepTo(`маршрут · ${routeLabel(payload.model ?? routeName)}`);
            plan("routed");
            act(`маршрут → ${routeLabel(payload.model ?? routeName)}`);
            break;
          case "delta":
            apply(outputId, { type: "delta", text: payload.text ?? "" });
            stepTo("пишет ответ");
            if (phase !== "writing") {
              plan("writing");
              act("пишет ответ");
            }
            break;
          case "source":
            if (payload.url && payload.title) {
              apply(outputId, { type: "source", url: payload.url, title: payload.title, ...(payload.quote ? { quote: payload.quote } : {}), ...(payload.readAt ? { readAt: payload.readAt } : {}) });
              sourceCount += 1;
              plan(phase);
              act(`источник ${sourceCount} · ${hostOf(payload.url)} · ${payload.title}`);
            }
            stepTo("читает источники");
            break;
          case "done":
            plan("done");
            act(`готово${payload.costMicro ? ` · ${formatCredits(payload.costMicro)}` : ""}`);
            // К15 — продолжения только для режимов, которые сервер сейчас умеет
            void api
              .capabilities()
              .then((c) => apply(outputId, { type: "followups", items: followupsFor(runMode, (m) => c.modes.some((x) => x.id === m && x.available)) }))
              .catch(() => undefined);
            apply(outputId, { type: "done", costMicro: payload.costMicro ?? 0, durationMs: 0 });
            // 46 — сумма из квитанции улетает в баланс
            if (payload.costMicro) flyMoney(outputId, `−${formatCredits(payload.costMicro)}`, "ink");
            settleTracked(started.runId, { status: "done", costMicro: payload.costMicro ?? 0 });
            void finishLiveRun();
            break;
          case "error":
            apply(outputId, { type: "error", message: payload.code ?? "Не удалось выполнить запрос.", refundedMicro: 0 });
            settleTracked(started.runId, { status: "error" });
            void finishLiveRun();
            break;
          case "canceled":
            apply(outputId, { type: "aborted", costMicro: 0 });
            // 47 — невыполненный резерв возвращается в баланс тем же путём
            if (started.estimatedCostMicro > (payload.costMicro ?? 0)) flyMoney(outputId, `+${formatCredits(started.estimatedCostMicro - (payload.costMicro ?? 0))}`, "ok");
            // остановили сами — отслеживать нечего
            if (trackedStore.get()?.runId === started.runId) clearTracked();
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
  }

  // задача с главной могла ещё стоять в очереди: подхватываем её поток, а не ждём перезагрузки
  useEffect(() => {
    const api = kuraiApi;
    const runId = new URLSearchParams(window.location.search).get("run");
    if (!api || !runId) return;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    void api
      .getRun(runId)
      .then((run) => (run.chatId === chat.id && !["completed", "failed", "canceled"].includes(run.status) ? attachLive(run, "") : undefined))
      .catch(() => {
        liveRunId.current = null;
        setLiveBusy(false);
      });
    // attachLive читает только refs и setState — повторная подписка при каждом рендере не нужна
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id]);

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
      // сервер вешает новый вопрос под переданного родителя: новая версия — соседка исходного вопроса, а не его продолжение
      const input = state.messages.find((x) => x.id === m.parentId);
      void sendLive(liveOutgoing(textOf(input), m.mode, input?.model ?? null), input?.parentId ?? null);
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
    .find(({ m, job }) => job?.type === "job" && (state.runs[m.id]?.status === "streaming" || job.status === "running" || job.status === "queued"));
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
    el?.scrollIntoView({ behavior: isCalm() ? "auto" : "smooth", block: "center" });
    // 51 — цель на секунду подсвечивается и гаснет
    retrigger(el ?? null, "k-flash");
  }

  /** 46/47 — чип суммы перелетает от ответа к балансу внизу меню. */
  function flyMoney(messageId: string, label: string, tone: "ink" | "ok") {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const answer = document.getElementById(`msg-${messageId}`);
        const from = answer?.querySelector('[aria-label="Квитанция ответа"]') ?? answer;
        const to = [...document.querySelectorAll("[data-balance]")].find((el) => el.getClientRects().length > 0);
        if (!from || !to) return;
        void flyTo(from, to, {
          html: `<span class="k-money-chip" data-tone="${tone}">${label}</span>`,
          arc: 60,
          endScale: 0.7,
          ms: 720,
        });
      }),
    );
  }

  /** 26/70 — смена версии: всё после развилки приезжает со стороны выбранной версии. */
  function switchTo(id: string, dir: number) {
    setSlideDir(dir);
    setState((s) => ({ ...s, head: leafOf(id, s.messages) }));
    window.setTimeout(() => setSlideDir(0), 500);
  }

  /** 96 — повтор неотправленного: временная копия уходит, запрос отправляется заново с тем же текстом. */
  function retrySend(tempId: string) {
    const pending = delivery[tempId];
    if (!pending) return;
    setDelivery((d) => {
      const { [tempId]: _gone, ...rest } = d;
      return rest;
    });
    setState((s) => ({ ...s, messages: s.messages.filter((m) => m.id !== tempId), head: pending.parentId ?? "" }));
    void sendLive(pending.msg, pending.parentId);
  }

  function jumpToBookmark(b: Bookmark) {
    const el = blockWith(b.msgId, b.quote);
    if (!el) return scrollToMsg(b.msgId);
    el.scrollIntoView({ behavior: isCalm() ? "auto" : "smooth", block: "center" });
    retrigger(el, "k-flash");
  }

  function rename(next: string) {
    setRenaming(false);
    const t = next.trim();
    if (!t || t === title) return;
    const previous = title;
    chatsStore.set((xs) => xs.map((x) => (x.id === chat.id ? { ...x, title: t } : x)));
    kuraiApi?.updateChat(chat.id, { title: t }).catch(() => {
      chatsStore.set((xs) => xs.map((x) => (x.id === chat.id ? { ...x, title: previous } : x)));
      setToast({ title: "Не удалось переименовать — проверьте соединение.", id: "rename-error" });
    });
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
    // К15 — выбранное продолжение встаёт в поле ввода, как реплика в диалоге
    onFollowup: prefillFollowup,
    forks: forksOf(branch, state.messages),
    onSwitchBranch: (id: string) => setState((s) => ({ ...s, head: leafOf(id, s.messages) })),
    reading,
    bookmarks: bookmarks.filter((b) => branch.some((m) => m.id === b.msgId)),
    onBookmark: jumpToBookmark,
    onRemoveBookmark: (id: string) => saveBookmarks(bookmarks.filter((b) => b.id !== id)),
    instructions: project?.instructions || undefined,
  };
  const answerIds = branch.filter((m) => m.role === "assistant").map((m) => m.id);
  const paragraphs = branch.reduce((n, m) => n + textOf(m).split(/\n{2,}/).filter((p) => p.trim()).length, 0);
  const followups = (lastAnswerId && state.runs[lastAnswerId]?.status === "done" ? state.runs[lastAnswerId]?.followups : undefined) ?? [];
  // 108 — честная оценка: слова документа / 180 в минуту; по мере чтения — сколько осталось
  const words = branch.reduce((n, m) => n + (textOf(m).match(/\S+/g)?.length ?? 0), 0);
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MIN));
  const left = Math.max(1, Math.round(minutes * (1 - progress)));
  const mapItems = branch.map((m): MapItem => {
        const job = m.parts.find((p) => p.type === "job");
        const running = job?.type === "job" && (state.runs[m.id]?.status === "streaming" || job.status === "running" || job.status === "queued");
        return {
          id: m.id,
          kind: m.role === "user" ? "user" : (state.runs[m.id]?.sources?.length ?? 0) > 0 ? "sources" : "answer",
          label: textOf(m).slice(0, 120) || (m.model ?? "Ответ"),
          live: running ? `${job.kind === "video" ? "видео" : "изображение"} · ${Math.round(job.progress * 100)}%` : undefined,
        };
      });
  // К19 — сводка системы: баланс кончается — одна тихая строка в ленте, по цене последнего ответа
  const lastCost = [...branch].reverse().find((m) => m.role === "assistant" && m.costMicro > 0)?.costMicro ?? 0;
  const lowBalance = lastCost > 0 && Number.isFinite(balanceMicro) && balanceMicro < lastCost * 3;

  // 98 — J/K между ответами, C — копировать, R — новая версия; К15 — 1–4 ставят продолжение в поле ввода
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable))) return;
      if (/^[1-4]$/.test(e.key) && askers.current.size === 0) {
        const f = followups[Number(e.key) - 1];
        if (!f) return;
        e.preventDefault();
        prefillFollowup(f);
        return;
      }
      const key = e.key.toLowerCase();
      if (!["j", "k", "c", "r"].includes(key) || answerIds.length === 0) return;
      e.preventDefault();
      if (key === "j" || key === "k") {
        const next = focusIdx === null ? (key === "j" ? 0 : answerIds.length - 1) : Math.max(0, Math.min(answerIds.length - 1, focusIdx + (key === "j" ? 1 : -1)));
        setFocusIdx(next);
        const id = answerIds[next];
        if (id) document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: isCalm() ? "auto" : "smooth", block: "start" });
        return;
      }
      const target = branch.find((m) => m.id === answerIds[focusIdx ?? answerIds.length - 1]);
      if (!target) return;
      if (key === "c") {
        void navigator.clipboard?.writeText(textOf(target)).then(() => setToast({ title: "Ответ скопирован", id: `copy-${target.id}` }), () => undefined);
      } else regenerate(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const started = new Date(branch[0]?.createdAt ?? chat.updatedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: DISPLAY_TZ });

  function toggleInspector() {
    if (wide) setDocked((d) => !d);
    else setSheet((s) => !s);
  }

  return (
    <div className="k-workbench flex min-h-0 flex-1">
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {/* 6/52 — шапка тише и ниже, пока документ наверху; после прокрутки — граница и тень */}
      <header data-scrolled={scrolled || undefined} className="k-doc-head relative z-20 flex h-14 shrink-0 items-center gap-2 pr-3 pl-16 md:pr-4 md:pl-6">
        <div
          className="relative min-w-0"
          onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}
        >
          {renaming ? (
            // 71 — название становится полем на том же месте: Enter сохраняет, Esc отменяет
            <input
              autoFocus
              defaultValue={title}
              aria-label="Название задачи"
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter") rename(e.currentTarget.value);
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setRenaming(false);
                }
              }}
              onBlur={(e) => rename(e.currentTarget.value)}
              style={{ width: Math.min(Math.max(renameWidth, 180), 560) }}
              className="-ml-2 h-9 max-w-[70vw] rounded-(--radius-sm) border border-ink3 bg-g1 px-2 text-[14.5px] text-ink outline-none"
            />
          ) : (
          <button
            type="button"
            ref={titleBtn}
            onClick={() => {
              if (!menuOpen) menuOpenedAt.current = Date.now();
              setMenuOpen(!menuOpen);
            }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="-ml-2 flex h-9 max-w-full cursor-pointer items-center gap-1.5 rounded-(--radius-sm) px-2 text-left hover:bg-s2"
          >
            {/* 2 — пока крупный заголовок виден, шапка не дублирует его */}
            <span className={cn("k-head-title truncate text-[14.5px] text-ink", !titleOut && "k-head-title-hidden")}>{title}</span>
            {!titleOut && <span className="text-[13px] text-ink3">Задача</span>}
            <ChevronDown size={14} strokeWidth={1.5} className={cn("shrink-0 text-ink3 transition-transform duration-(--dur-fast)", menuOpen && "rotate-180")} />
          </button>
          )}
          {menuOpen && (
            <>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => {
                  setMenuOpen(false);
                  // 71 — второй клик двойного клика приходит сюда (меню уже открылось): название становится полем
                  if (Date.now() - menuOpenedAt.current < 350) startRename();
                }}
                className="fixed inset-0 z-(--z-bay) cursor-default"
              />
              <div
                aria-label="Действия с задачей"
                className="absolute top-11 left-0 z-(--z-bay) w-64 rounded-(--radius-md) border border-line2 bg-g1 p-1 shadow-(--shadow-float)"
              >
                <MenuRow icon={<Search size={15} strokeWidth={1.5} />} onClick={() => { setFindOpen(true); setMenuOpen(false); }}>
                  Найти в задаче
                </MenuRow>
                <MenuRow icon={<Pencil size={15} strokeWidth={1.5} />} onClick={() => { startRename(); setMenuOpen(false); }}>
                  Переименовать
                </MenuRow>
                {answerIds.some((id) => textOf(branch.find((m) => m.id === id)).length > 0) && (
                  <MenuRow icon={<Presentation size={15} strokeWidth={1.5} />} onClick={() => { setPresenting(true); setMenuOpen(false); }}>
                    Режим презентации
                  </MenuRow>
                )}
                <MenuRow
                  icon={listed?.pinned ? <PinOff size={15} strokeWidth={1.5} /> : <Pin size={15} strokeWidth={1.5} />}
                  onClick={() => {
                    const pinnedNow = !listed?.pinned;
                    chatsStore.set((xs) => xs.map((x) => (x.id === chat.id ? { ...x, pinned: pinnedNow } : x)));
                    kuraiApi?.updateChat(chat.id, { pinned: pinnedNow }).catch(() => chatsStore.set((xs) => xs.map((x) => (x.id === chat.id ? { ...x, pinned: !pinnedNow } : x))));
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
                {/* 66 — успех подтверждается на самой кнопке */}
                {shareCopied ? <DrawnCheck size={15} /> : <Share2 size={15} strokeWidth={1.5} />}
                <span className="max-sm:hidden">{shareCopied ? "Скопировано" : shareState === "creating" ? "Создаю…" : shareState === "ready" ? "Скопировать ссылку" : "Поделиться"}</span>
              </button>
              {shareLink && (() => {
                const hex = shareLink.id.replace(/[^0-9a-f]/gi, "").slice(0, 8).toUpperCase();
                const left = shareLink.expiresAt ? Date.parse(shareLink.expiresAt) - renderedAt : Infinity;
                return (
                  <>
                    {/* К18 — у ссылки свой короткий код */}
                    <span className="k-code hidden px-1 text-[11px] text-ink3 lg:inline">LNK·{hex.slice(0, 4)}-{hex.slice(4)}</span>
                    {/* К8 — истекающая ссылка: штрихованная метка с остатком срока */}
                    {left < 86_400_000 && (
                      <span className="k-hazard relative inline-flex h-7 items-center overflow-hidden rounded-(--radius-sm) border border-warn/50 px-2 text-[11.5px] text-warn">
                        <span className="relative">истекает через {Math.max(1, Math.round(left / 3_600_000))} ч</span>
                      </span>
                    )}
                  </>
                );
              })()}
              {shareLink &&
                (revokeAsk ? (
                  // К8 — опасное действие: подтверждение в штрихованной зоне
                  <span className="k-hazard relative inline-flex h-8 items-center gap-1 overflow-hidden rounded-(--radius-sm) border border-warn/50 pr-1 pl-2.5 text-[12.5px]">
                    <span className="relative text-ink2">Ссылка перестанет открываться</span>
                    <button type="button" autoFocus onClick={() => { setRevokeAsk(false); void revokeShareLink(); }} className="relative k-tool h-6 px-2 text-[12px] text-warn">Отозвать</button>
                    <button type="button" onClick={() => setRevokeAsk(false)} className="relative k-tool h-6 px-2 text-[12px]">Нет</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setRevokeAsk(true)} className="k-tool text-[12.5px] text-ink3 hover:text-warn">
                    Отозвать
                  </button>
                ))}
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
          // 54 — магнит отпускает только прокрутка вверх; собственная докрутка магнита его не сбрасывает
          const up = el.scrollTop < lastTop.current - 2;
          lastTop.current = el.scrollTop;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120 || (stickToBottom.current && follow.current !== 0 && !up);
          setBelow(!stickToBottom.current);
          setLeftAt((at) => (stickToBottom.current ? null : (at ?? paragraphs)));
          setScrolled(el.scrollTop > 8);
          setProgress(Math.round((el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)) * 10) / 10);
          try {
            sessionStorage.setItem(scrollKey(chat.id), String(Math.round(el.scrollTop)));
          } catch {}
          // 8 — сноски в средней полосе экрана — то, что вы сейчас читаете
          const band = el.getBoundingClientRect();
          const mid = [band.top + band.height * 0.3, band.top + band.height * 0.7];
          const now = [...el.querySelectorAll<HTMLElement>(".k-cite[data-n]")]
            .filter((c) => {
              const y = c.getBoundingClientRect().top;
              return y >= mid[0]! && y <= mid[1]!;
            })
            .map((c) => Number(c.dataset.n));
          setReading((cur) => (cur.join() === [...new Set(now)].join() ? cur : [...new Set(now)]));
        }}
        onMouseMove={(e) => {
          const block = (e.target as Element).closest?.(".k-doc p, .k-doc li, .k-doc h3, .k-doc h4, .k-doc blockquote") as HTMLElement | null;
          const owner = block?.closest("article")?.closest("[id^='msg-']");
          if (!block || !owner) return;
          const box = e.currentTarget.getBoundingClientRect();
          const r = block.getBoundingClientRect();
          const next = { top: r.top - box.top + e.currentTarget.scrollTop, left: r.left - box.left - 30, msgId: owner.id.slice(4), text: (block.textContent ?? "").trim().slice(0, 160), marked: block.hasAttribute("data-bookmark") };
          setHoverBlock((cur) => (cur && cur.top === next.top && cur.marked === next.marked ? cur : next));
        }}
        onMouseLeave={() => setHoverBlock(null)}
        id="chat-feed"
        className="relative flex-1 overflow-y-auto"
      >
        {/* 91 — закладка на абзац: значок на полях у абзаца под курсором */}
        {hoverBlock && hoverBlock.text && (
          <button
            type="button"
            style={{ top: hoverBlock.top, left: Math.max(4, hoverBlock.left) }}
            onClick={() => {
              const existing = bookmarks.find((b) => b.msgId === hoverBlock.msgId && hoverBlock.text.startsWith(b.quote.slice(0, 60)));
              saveBookmarks(existing ? bookmarks.filter((b) => b.id !== existing.id) : [...bookmarks, { id: newId("bm"), msgId: hoverBlock.msgId, quote: hoverBlock.text }]);
              setHoverBlock((cur) => (cur ? { ...cur, marked: !existing } : cur));
            }}
            aria-label={hoverBlock.marked ? "Убрать закладку с абзаца" : "Закладка на абзац"}
            className={cn("absolute z-10 grid size-6 cursor-pointer place-items-center rounded-(--radius-sm) hover:bg-s2 max-md:hidden", hoverBlock.marked ? "text-acc" : "text-ink3 hover:text-ink")}
          >
            <Bookmark size={13} strokeWidth={1.5} fill={hoverBlock.marked ? "currentColor" : "none"} />
          </button>
        )}
        {/* 7 — линия прогресса чтения (CSS scroll-timeline, без обработчиков) */}
        <i aria-hidden="true" className="k-read-progress" />
        <div className="mx-auto w-full max-w-[calc(var(--read-width,42rem)+3.25rem)] px-4 pt-6 pb-12 md:px-8 md:pt-9">
          <header className="mb-10 md:pl-[52px]">
            {/* К2 — название собирается из кодов один раз (и после переименования); текст ответов так не появляется */}
            <h1 ref={docTitle} className="text-[clamp(1.75rem,2.7vw,2.3rem)] leading-[1.15] font-light tracking-[-0.022em] text-balance text-ink">
              <Decode text={title} duration={500} />
            </h1>
            <p className="k-meta mt-3 flex flex-wrap items-center gap-x-2">
              <span>{started}</span>
              <span aria-hidden="true">·</span>
              <span>{branch.length} сообщ.</span>
              {words >= 150 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{progress >= 0.1 && progress < 1 ? `осталось ≈ ${left} мин` : `≈ ${minutes} мин чтения`}</span>
                </>
              )}
              {total > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formatCredits(total)}</span>
                </>
              )}
            </p>
          </header>
          <div className="k-feed flex flex-col gap-11">
            {(project?.instructions || project?.defaultModel) && (
              <SysNote>
                {project.instructions && project.defaultModel ? "инструкции и модель" : project.instructions ? "инструкции" : "модель"} проекта «{project.name}» применены
              </SysNote>
            )}
            {branch.map((m) => {
              if (m.role === "user") {
                const us = siblingsOf(m.id, state.messages);
                const ui = us.findIndex((x) => x.id === m.id);
                const goU = (i: number) => {
                  const target = us[i];
                  return target ? () => switchTo(target.id, i > ui ? 1 : -1) : undefined;
                };
                return (
                  <Appear key={aliases[m.id] ?? m.id} data-msg={m.id} index={initialIds.has(m.id) ? branch.indexOf(m) : 0}>
                    <motion.div initial={slideDir ? { x: slideDir * 36, opacity: 0.2 } : false} animate={{ x: 0, opacity: 1 }} transition={SPRING.gentle}>
                    <UserMessage
                      m={m}
                      editing={editing === m.id}
                      onEdit={() => setEditing(m.id)}
                      onCancel={() => setEditing(null)}
                      onSubmitEdit={(t) => editUser(m, t)}
                      versions={{ index: ui, total: us.length, prev: ui > 0 ? goU(ui - 1) : undefined, next: goU(ui + 1) }}
                      delivery={delivery[m.id]?.status}
                      onRetry={() => retrySend(m.id)}
                    />
                    </motion.div>
                  </Appear>
                );
              }
              const sibs = siblingsOf(m.id, state.messages);
              const idx = sibs.findIndex((x) => x.id === m.id);
              const go = (i: number) => {
                const target = sibs[i];
                return target ? () => switchTo(target.id, i > idx ? 1 : -1) : undefined;
              };
              const divider = dividers.has(m.id) && m.model ? routeLabel(m.model) : null;
              // 106 — в живом режиме версии живут на уровне вопроса: сравниваем с ответом предыдущей версии вопроса
              const qs = m.parentId ? siblingsOf(m.parentId, state.messages) : [];
              const qi = qs.findIndex((x) => x.id === m.parentId);
              const prevQ = qi > 0 ? qs[qi - 1] : undefined;
              const prevAnswer = idx > 0 ? sibs[idx - 1] : prevQ ? state.messages.find((x) => x.parentId === prevQ.id && x.role === "assistant") : undefined;
              return (
                <Fragment key={aliases[m.id] ?? m.id}>
                  {/* К19 — сводка системы одной тихой моно-строкой, а не всплывающим окном */}
                  {divider && <SysNote>маршрут → {divider}</SysNote>}
                  <Appear id={`msg-${m.id}`} index={initialIds.has(m.id) ? branch.indexOf(m) : 0} className="relative">
                    {/* 98 — рамка фокуса J/K переезжает от ответа к ответу */}
                    {focusIdx !== null && answerIds[focusIdx] === m.id && (
                      <motion.i aria-hidden="true" layoutId="k-answer-focus" transition={SPRING.snappy} className="pointer-events-none absolute -inset-3 rounded-(--radius-md) border border-acc-line" />
                    )}
                    <motion.div initial={slideDir ? { x: slideDir * 36, opacity: 0.2 } : false} animate={{ x: 0, opacity: 1 }} transition={SPRING.gentle}>
                    <AssistantMessage
                      m={m}
                      run={state.runs[m.id]}
                      promptChars={branch.slice(0, branch.indexOf(m)).reduce((n, x) => n + textOf(x).length, 0)}
                      versions={{ index: idx, total: sibs.length, prev: idx > 0 ? go(idx - 1) : undefined, next: go(idx + 1), prevText: prevAnswer ? textOf(prevAnswer) : undefined, models: sibs.length > 1 ? sibs.map((x) => x.model) : undefined }}
                      last={m.id === lastAnswerId}
                      onRegenerate={() => regenerate(m)}
                      onStop={state.runs[m.id]?.status === "streaming" ? stop : undefined}
                      onExportSlides={live ? () => void exportSlides(m) : undefined}
                      onSaveArtifact={live ? () => saveArtifact(m) : undefined}
                      onSaveRecipe={live ? () => saveRecipe(m) : undefined}
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
                      onFollowup={prefillFollowup}
                      onAnswer={(c) => answer(m.id, c)}
                      onOpenArtifact={() => {
                        const a = state.runs[m.id]?.artifact;
                        if (a) setPanel(a);
                      }}
                    />
                    </motion.div>
                  </Appear>
                </Fragment>
              );
            })}
            {lowBalance && <SysNote tone="warn">на балансе {formatCredits(balanceMicro)} — {Math.floor(balanceMicro / lastCost) < 1 ? "не хватит даже на один такой ответ" : `хватит примерно на ${plural(Math.floor(balanceMicro / lastCost), ["такой ответ", "таких ответа", "таких ответов"])}`}</SysNote>}
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
          if (a === "bookmark") {
            // 91 — закладка на абзац: метка на полях и строка в правой панели
            const msgId = window.getSelection()?.anchorNode?.parentElement?.closest("[id^='msg-']")?.id.slice(4);
            if (msgId) saveBookmarks([...bookmarks, { id: newId("bm"), msgId, quote: text.slice(0, 160) }]);
            return;
          }
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
            {textStreaming && <i aria-hidden="true" className="size-1.5 rounded-full bg-acc" />}
            <ArrowDown size={14} strokeWidth={1.5} />
            {leftAt !== null && paragraphs > leftAt ? "Новое" : textStreaming ? "К ответу — он ещё пишется" : "К последнему сообщению"}
            {/* 9 — сколько новых абзацев появилось ниже, пока вы читали */}
            {leftAt !== null && paragraphs > leftAt && (
              <motion.span key={paragraphs - leftAt} initial={{ scale: 1.5 }} animate={{ scale: 1 }} transition={SPRING.bouncy} className="rounded-full bg-acc px-1.5 font-mono text-[11px] text-acc-ink tabular-nums">
                {paragraphs - leftAt}
              </motion.span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
      {branch.length >= 4 && <Minimap scroller={scroller} items={mapItems} tick={lastLen} onJump={scrollToMsg} />}
      <AnimatePresence>
        {presenting && (
          <Suspense fallback={null}>
            <LazyPresenter
              slides={slidesOf(title, branch.filter((m) => m.role === "assistant").map(textOf).filter(Boolean))}
              onClose={() => setPresenting(false)}
            />
          </Suspense>
        )}
      </AnimatePresence>
      <div className="relative shrink-0 px-3 pt-1 pb-[max(0.9rem,env(safe-area-inset-bottom))] md:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-full h-10 bg-linear-to-t from-bg to-transparent" />
        <div className="mx-auto w-full max-w-[60rem]">
          <Composer
            variant="dock"
            draftKey={chat.id}
            routeInInspector={wide && docked && !panel}
            projectModel={project?.defaultModel || undefined}
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
          {phone ? (
            // 40 — на телефоне лист снизу: тянется за ручку, отпустили — доезжает до ближайшего положения с учётом скорости
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Контекст задачи"
              className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-(--radius-lg) border-t border-line2 bg-bg shadow-(--shadow-float)"
              style={{ y: sheetY, height: sheetH }}
              initial={{ y: sheetH }}
              animate={{ y: sheetH * SHEET_HALF }}
              exit={{ y: sheetH, transition: { duration: 0.18 } }}
              transition={SPRING.gentle}
              drag="y"
              dragControls={sheetDrag}
              dragListener={false}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                // куда лист «долетел» бы по инерции, если отпустить его сейчас
                const projected = sheetY.get() + info.velocity.y * 0.2;
                if (projected > sheetH * 0.75) return setSheet(false);
                const snap = [SHEET_FULL, SHEET_HALF].map((k) => k * sheetH).reduce((a, b) => (Math.abs(b - projected) < Math.abs(a - projected) ? b : a));
                void animate(sheetY, snap, SPRING.release);
              }}
            >
              <button
                type="button"
                aria-label="Потяните, чтобы развернуть или закрыть"
                onPointerDown={(e) => sheetDrag.start(e)}
                className="grid h-7 shrink-0 cursor-grab touch-none place-items-center"
              >
                <i aria-hidden="true" className="h-1 w-10 rounded-full bg-line2" />
              </button>
              <Inspector {...inspectorProps} onClose={() => setSheet(false)} className="min-h-0 w-full flex-1" />
            </motion.div>
          ) : (
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
          )}
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

/** К19 — сводка системы: моно-строка в ленте вместо всплывающего окна. */
function SysNote({ tone, children }: { tone?: "warn"; children: React.ReactNode }) {
  return (
    <div className="-mb-5 flex items-center gap-3 md:pl-[52px]">
      <span className={cn("k-index", tone === "warn" && "text-warn")}>◇ система · {children}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}
