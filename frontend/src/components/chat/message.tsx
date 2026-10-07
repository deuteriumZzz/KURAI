"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Archive, BookOpen, BookmarkPlus, Brain, Check, ChevronLeft, ChevronRight, Copy, FileDown, FileText, Pencil, Pin, Printer, RotateCcw, ThumbsDown, ThumbsUp, Volume2, VolumeX } from "lucide-react";
import { Reader } from "./reader";
import type { Message, MessagePart } from "@/types/api";
import type { RunState } from "@/lib/stream";
import { DISPLAY_TZ, formatBytes, formatCredits, plural } from "@/lib/format";
import { modeById } from "@/lib/modes";
import { GROUP_LABEL, modelByName, routeLabel } from "@/lib/models";
import { memberStore } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { StreamText } from "@/components/fx/decode";
import { SysLine } from "@/components/fx/primitives";
import { Initials } from "@/components/brand/avatar";
import { ModelGlyph, glyphKind } from "@/components/brand/model-glyph";
import { AudioCard, ImageGrid, JobCard, VideoCard, type ImageAction } from "./media";
import { AgentChoice, AgentSummary, EvidenceLog, FileScan, RunReceipt, WorkPlan } from "./agent";
import { BeforeAfter } from "./before-after";
import { Workspace } from "./workspace";
import { cn } from "@/lib/cn";
import { flyInFromSend, isCalm, retrigger, SPRING } from "@/lib/motion";
import { wordDiff } from "@/lib/diff";
import { Bar } from "@/components/fx/skeleton";
import { DrawnCheck } from "@/components/ui/action-button";
import { kuraiApi } from "@/lib/kurai-api";

// Markdown (≈ 40 KB) грузится отдельным чанком; до загрузки ответ виден обычным текстом.
const LazyMarkdown = lazy(() => import("./markdown").then((m) => ({ default: m.Markdown })));
type Src = { url: string; title: string };
const noop = () => () => {};

const time = (iso: string) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: DISPLAY_TZ });
const textOf = (m: Message) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
const secs = (ms: number) => (ms / 1000).toLocaleString("ru-RU", { maximumFractionDigits: ms < 10_000 ? 1 : 0 });

/** Секундомер для живых состояний: тикает, только пока `on`. */
function useNow(on: boolean): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!on) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [on]);
  return now;
}

/** 107 — содержание из настоящих заголовков ответа (код не считается). */
function headingsOf(text: string): string[] {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .split("\n")
    .flatMap((line) => {
      const h = /^#{1,3}\s+(.+?)\s*#*$/.exec(line);
      return h?.[1] ? [h[1].replace(/[*_`]/g, "")] : [];
    });
}

/** 109 — текст ответа так, как его видит человек: текстовые узлы и их места в общей строке для озвучки. */
function speakable(doc: Element): { text: string; nodes: { node: Text; start: number }[] } {
  const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; start: number }[] = [];
  let text = "";
  let lastBlock: Element | null = null;
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const block = n.parentElement?.closest("p, li, h3, h4, blockquote, pre, td, th") ?? null;
    if (lastBlock && block !== lastBlock) text += "\n";
    lastBlock = block;
    nodes.push({ node: n, start: text.length });
    text += n.data;
  }
  return { text, nodes };
}

/** Подсветить слово под голосом прямо в тексте (CSS Custom Highlight). Нет поддержки — false. */
function highlightSpoken(map: ReturnType<typeof speakable>, at: number, len: number): boolean {
  const registry = (globalThis.CSS as unknown as { highlights?: Map<string, unknown> } | undefined)?.highlights;
  const Ctor = (globalThis as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  if (!registry || !Ctor) return false;
  let hit: { node: Text; start: number } | undefined;
  for (const entry of map.nodes) {
    if (entry.start > at) break;
    hit = entry;
  }
  if (!hit) return true;
  const range = document.createRange();
  const from = Math.min(at - hit.start, hit.node.length);
  range.setStart(hit.node, from);
  range.setEnd(hit.node, Math.min(from + Math.max(1, len), hit.node.length));
  registry.set("k-speak", new Ctor(range));
  return true;
}
const clearSpoken = () => (globalThis.CSS as unknown as { highlights?: Map<string, unknown> } | undefined)?.highlights?.delete("k-speak");

// К21 — цвет «говорящего» в сравнении: по порядку моделей среди версий
const SPEAKER = ["text-acc", "text-violet", "text-signal", "text-ink2"] as const;

/** Пока чанк Markdown не загружен — показываем текст как есть. */
function MarkdownOrText({ text, sources }: { text: string; sources?: Src[] }) {
  return (
    <Suspense fallback={<p className="k-doc text-[length:var(--read-size,15.5px)] leading-[1.7] whitespace-pre-wrap">{text}</p>}>
      <LazyMarkdown text={text} sources={sources} />
    </Suspense>
  );
}

type Versions = {
  index: number;
  total: number;
  prev?: () => void;
  next?: () => void;
  /** Текст предыдущей версии — для разметки «что изменилось» (106). */
  prevText?: string;
  /** Модели всех версий по порядку — в сравнении у каждой своя метка (К21). */
  models?: (string | null)[];
};

function VersionSwitch({ v }: { v: Versions }) {
  if (v.total < 2) return null;
  return (
    <span className="inline-flex items-center font-mono text-[11px] text-ink3" aria-label={`Версия ${v.index + 1} из ${v.total}`}>
      <button type="button" onClick={v.prev} disabled={!v.prev} aria-label="Предыдущая версия" className="k-act size-6 disabled:opacity-30">
        <ChevronLeft size={13} strokeWidth={1.5} />
      </button>
      {v.index + 1}/{v.total}
      <button type="button" onClick={v.next} disabled={!v.next} aria-label="Следующая версия" className="k-act size-6 disabled:opacity-30">
        <ChevronRight size={13} strokeWidth={1.5} />
      </button>
    </span>
  );
}

/** Рассуждения модели («Думать дольше»): открыты, пока идёт размышление, потом сворачиваются. */
function Thinking({ text, live, from, to }: { text: string; live: boolean; from?: number; to?: number }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const isOpen = open ?? live;
  const now = useNow(live && !!from);
  // 23 — честный таймер от первой мысли; после первого слова — итог «Думал N с»
  const ms = from ? (to ?? (live ? now : 0)) - from : 0;
  return (
    <div className="border-l border-line2 pl-3">
      <button type="button" onClick={() => setOpen(!isOpen)} aria-expanded={isOpen} className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] text-ink3 hover:text-ink">
        <Brain size={13} strokeWidth={1.5} className={live ? "fx-caret" : undefined} />
        {live ? "Модель рассуждает" : ms > 0 ? `Думал ${secs(ms)} с` : "Ход рассуждения"}
        {live && ms > 0 && <span className="font-mono tabular-nums">· {secs(ms)} с</span>} {isOpen ? "▾" : "▸"}
      </button>
      {/* 56 — раскрытие до естественной высоты */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING.gentle} className="overflow-hidden text-[13px] leading-relaxed whitespace-pre-wrap text-ink3">
            <span className="block pt-1.5">{text}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

type UserProps = {
  /** 96 — «отправляется» до ответа сервера; «не отправлено» — с кнопкой повтора. */
  delivery?: "sending" | "failed";
  onRetry?: () => void;
  m: Message;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSubmitEdit: (text: string) => void;
  versions: Versions;
};

/** Реплика человека: сдержанная, без «пузыря» — имя, время, текст. Правка создаёт новую ветку. */
export function UserMessage({ m, editing, onEdit, onCancel, onSubmitEdit, versions, delivery, onRetry }: UserProps) {
  const member = useStore(memberStore);
  const text = textOf(m);
  const [draft, setDraft] = useState(text);
  const files = m.parts.filter((p): p is Extract<MessagePart, { type: "file" }> => p.type === "file");
  const root = useRef<HTMLDivElement>(null);
  // 18 — только что отправленная реплика вылетает из поля ввода (старые сообщения не двигаются)
  useEffect(() => flyInFromSend(root.current), []);

  return (
    <div ref={root} className="group grid gap-x-4 sm:grid-cols-[36px_minmax(0,1fr)]">
      <Initials name={member.name} className="size-9 max-sm:hidden" />
      <div className="min-w-0">
        <div className="flex h-9 items-center gap-2.5">
          <span className="text-[14px] font-medium text-ink">{member.name}</span>
          <span className="text-[12px] text-ink3">{time(m.createdAt)}</span>
          {m.mode !== "text" && <span className="k-index">{modeById(m.mode).label}</span>}
          <VersionSwitch v={versions} />
          {text && !editing && (
            <button type="button" onClick={onEdit} className="k-answer-actions k-tool ml-auto h-8 text-[12.5px] text-ink3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100">
              <Pencil size={13} strokeWidth={1.5} /> Изменить
            </button>
          )}
        </div>
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) onSubmitEdit(draft.trim());
            }}
            className="mt-1 flex flex-col gap-2"
          >
            <label htmlFor={`edit-${m.id}`} className="fx-sr">Изменить сообщение</label>
            {/* 69 — поле той же формы и того же шрифта: текст не прыгает при переходе к правке */}
            <textarea
              id={`edit-${m.id}`}
              autoFocus
              onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancel();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (draft.trim()) onSubmitEdit(draft.trim());
                }
              }}
              className="-mx-3 -my-2 w-[calc(100%+1.5rem)] resize-none rounded-(--radius-md) border border-line2 bg-g1 px-3 py-2 text-[length:var(--read-size,15.5px)] leading-[1.65] text-ink field-sizing-content outline-none focus:border-ink3"
            />
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.snappy} className="mt-2 flex items-center justify-end gap-2">
              <span className="mr-auto text-[12px] text-ink3">Исходная реплика сохранится в прошлой ветке</span>
              <button type="button" onClick={onCancel} className="k-tool">Отмена</button>
              <button type="submit" className="k-tool bg-acc text-acc-ink hover:bg-acc hover:text-acc-ink">Отправить новой веткой</button>
            </motion.div>
          </form>
        ) : (
          <>
            {files.length > 0 && (
              <ul className="mt-1 mb-2 flex flex-wrap gap-1.5">
                {files.map((f) => (
                  <li key={f.name} className="rounded-(--radius-sm) border border-line bg-g1 px-2 py-1 font-mono text-[11.5px] text-ink2">
                    {f.name} · {formatBytes(f.sizeBytes)}
                  </li>
                ))}
              </ul>
            )}
            {text && <p className={cn("text-[length:var(--read-size,15.5px)] leading-[1.65] whitespace-pre-wrap", delivery === "failed" ? "text-ink2" : "text-ink")}>{text}</p>}
            {delivery === "sending" && <p className="k-meta mt-1 animate-pulse">отправляется…</p>}
            {delivery === "failed" && (
              <p role="alert" className="mt-1.5 flex items-center gap-2 text-[12.5px] text-err">
                не отправлено
                {onRetry && (
                  <button type="button" onClick={onRetry} className="k-tool h-7 border border-err/40 px-2 text-[12px] text-err">
                    <RotateCcw size={12} strokeWidth={1.5} /> Повторить
                  </button>
                )}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type Props = {
  m: Message;
  run?: RunState;
  versions: Versions;
  /** Последний ответ ветки: действия видны без наведения. */
  last?: boolean;
  onRegenerate: () => void;
  /** Остановить идущий запуск (агент, исследование). */
  onStop?: () => void;
  onAnswer?: (choice: number) => void;
  onOpenArtifact?: () => void;
  onFollowup?: (text: string) => void;
  onImageAction?: (a: ImageAction, index: number) => void;
  onExportSlides?: () => void;
  onSaveArtifact?: () => Promise<boolean> | void;
  onSaveRecipe?: () => Promise<boolean> | void;
  pinned?: boolean;
  onPin?: () => void;
  /** Исходник для сравнения «до / после» (апскейл). */
  compareBefore?: string;
  /** Сколько символов ветки ушло в запрос этого ответа — для «почему этот маршрут» (102). */
  promptChars?: number;
};

/** Ответ — раздел документа: знак маршрута, текст, квитанция запуска и слой действий. */
export function AssistantMessage({ m, run, versions, last = false, onRegenerate, onStop, onAnswer, onOpenArtifact, onFollowup, onImageAction, onExportSlides, onSaveArtifact, onSaveRecipe, pinned = false, onPin, compareBefore, promptChars = 0 }: Props) {
  const [copied, setCopied] = useState(false);
  const swipeX = useRef<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [reading, setReading] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  // 109 — где сейчас голос: события границ слов от синтеза речи браузера
  const [spoken, setSpoken] = useState<{ text: string; at: number; len: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [activeH, setActiveH] = useState(-1);
  const [saved, setSaved] = useState<"artifact" | "recipe" | null>(null);
  const root = useRef<HTMLElement>(null);
  const [stacking, setStacking] = useState(false);

  /** 92 — экспорт исследования: печать этого ответа в PDF браузера с обложкой и страницей источников. */
  function printAnswer() {
    const el = root.current;
    if (!el) return;
    const go = () => {
      const html = document.documentElement;
      const done = () => {
        html.classList.remove("k-printing");
        el.removeAttribute("data-printing");
        window.removeEventListener("afterprint", done);
      };
      html.classList.add("k-printing");
      el.setAttribute("data-printing", "");
      window.addEventListener("afterprint", done);
      window.print();
    };
    if (isCalm()) return go();
    // страницы собираются в стопку — и файл готов
    setStacking(true);
    window.setTimeout(() => {
      setStacking(false);
      go();
    }, 750);
  }
  // без рассинхрона гидрации: на сервере озвучки нет, в браузере — есть
  const canSpeak = useSyncExternalStore(noop, () => "speechSynthesis" in window, () => false);
  const streaming = run?.status === "streaming";
  const text = textOf(m);
  const images = m.parts.filter((p): p is Extract<MessagePart, { type: "image" }> => p.type === "image");
  const info = m.model ? modelByName(m.model) : undefined;
  const settled = !streaming && run?.status !== "error";
  const printable = (m.mode === "research" || (run?.sources?.length ?? 0) > 0) && text.length > 0;
  const waiting = streaming && text === "" && !run?.ask && !run?.thinking && m.parts.every((p) => p.type === "text");
  const now = useNow(waiting);
  const diff = useMemo(() => (showDiff && versions.prevText !== undefined ? wordDiff(versions.prevText, text) : null), [showDiff, versions.prevText, text]);
  const toc = useMemo(() => (settled && text.length > 1500 ? headingsOf(text) : []), [settled, text]);
  // 107 — длинный ответ из истории открыт тремя строками сути; полный текст раскрывается плавно
  const collapsible = settled && !run?.startedAt && text.length > 2500;
  // 8 — оглавление подсвечивает раздел, который вы сейчас читаете
  useEffect(() => {
    const heads = root.current ? [...root.current.querySelectorAll(".k-doc h3, .k-doc h4")] : [];
    if (toc.length < 3 || heads.length === 0 || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActiveH(heads.indexOf(e.target))),
      { rootMargin: "0px 0px -65% 0px" },
    );
    heads.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [toc.length, expanded]);
  const saveWith = async (action: (() => Promise<boolean> | void) | undefined, kind: "artifact" | "recipe") => {
    if (!action) return;
    // 66 — сохранение подтверждается на самой кнопке
    if ((await action()) === true) {
      setSaved(kind);
      setTimeout(() => setSaved((cur) => (cur === kind ? null : cur)), 1400);
    }
  };
  const speakers = [...new Set(versions.models ?? [])];
  const speaker = speakers.length > 1 && m.model ? SPEAKER[speakers.indexOf(m.model) % SPEAKER.length] : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <article
      ref={root}
      className="k-answer grid gap-x-4 sm:grid-cols-[36px_minmax(0,1fr)]"
      aria-busy={streaming}
      data-last={last || undefined}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) swipeX.current = t.clientX;
      }}
      onTouchEnd={(e) => {
        const t = e.changedTouches[0];
        if (!t || swipeX.current === null) return;
        const dx = t.clientX - swipeX.current;
        swipeX.current = null;
        // свайп по ответу листает его версии
        if (dx < -70) versions.next?.();
        if (dx > 70) versions.prev?.();
      }}
    >
      {printable && (
        <div className="k-print-only col-span-full mb-10 border-b border-black/20 pb-8">
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase">KURAI · исследование · {m.id.replace(/[^0-9a-f]/gi, "").slice(0, 8).toUpperCase()}</p>
          <p className="mt-6 text-[28px] leading-tight font-light">{headingsOf(text)[0] ?? text.split("\n")[0]?.slice(0, 120)}</p>
          <p className="mt-3 text-[12px]">
            {new Date(m.createdAt).toLocaleString("ru-RU", { timeZone: DISPLAY_TZ })} · {m.model ? routeLabel(m.model) : "Автомаршрут"} · {formatCredits(m.costMicro)}
            {run?.durationMs ? ` · ${secs(run.durationMs)} с` : ""}
          </p>
        </div>
      )}
      <span className="grid size-9 place-items-center max-sm:hidden">
        <ModelGlyph id={info?.id ?? m.model ?? "auto"} kind={m.model ? glyphKind(info?.group) : "auto"} size={26} className={streaming ? "text-acc" : undefined} />
      </span>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex h-9 flex-wrap items-center gap-x-2.5">
          <span className={cn("inline-flex items-center gap-2 text-[14px] font-medium", speaker ?? "text-ink")}>
            {speaker && <i aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-current" />}
            {m.model ? routeLabel(m.model) : streaming ? "Подбираю маршрут…" : "Автомаршрут"}
          </span>
          <span className="text-[12px] text-ink3">{time(m.createdAt)}</span>
          {/* 23 — сколько модель молчала до первого слова (только для запусков, которые мы видели) */}
          {run?.startedAt && run.firstTokenAt && !run.thinking && run.firstTokenAt - run.startedAt >= 1000 && (
            <span className="k-meta">думал {secs(run.firstTokenAt - run.startedAt)} с</span>
          )}
          <VersionSwitch v={versions} />
          {settled && text && versions.prevText !== undefined && (
            <button type="button" aria-pressed={showDiff} onClick={() => setShowDiff((v) => !v)} className="k-tool h-7 px-2 text-[12px]">
              изменения
            </button>
          )}
          {run?.status === "aborted" && (
            <>
              <span className="rounded-(--radius-sm) border border-warn/40 px-1.5 py-0.5 text-[11.5px] text-warn">Остановлено · списано {formatCredits(m.costMicro)}</span>
              <button type="button" onClick={onRegenerate} className="k-tool h-7 text-[12.5px]">
                <RotateCcw size={13} strokeWidth={1.5} /> Запустить заново
              </button>
            </>
          )}
        </div>

        {run?.log.filter((l) => streaming || l.tone === "warn").map((l, i) => (
          <SysLine key={i} tone={l.tone}>
            {l.text}
          </SysLine>
        ))}
        {run?.scans?.map((sc) => <FileScan key={sc.name} name={sc.name} labels={sc.labels} />)}
        {run?.ask && <AgentChoice ask={run.ask} onAnswer={(c) => onAnswer?.(c)} />}
        {run?.tasks && <WorkPlan tasks={run.tasks} live={streaming} onStop={onStop} />}
        {run?.actions && run.actions.length > 0 && <Workspace actions={run.actions} live={streaming} />}
        {run?.thinking && <Thinking text={run.thinking} live={streaming && !text} from={run.thinkingAt} to={run.firstTokenAt} />}
        {toc.length >= 3 && (
          <details className="k-toc rounded-(--radius-md) border border-line px-3 py-2 text-[13px]">
            <summary className="cursor-pointer text-ink2 hover:text-ink">Содержание · {plural(toc.length, ["раздел", "раздела", "разделов"])}</summary>
            <ol className="mt-2 flex flex-col gap-0.5 pb-1">
              {toc.map((h, i) => (
                <li key={`${i}-${h}`}>
                  <button
                    type="button"
                    onClick={() => {
                      const jump = () => {
                        const el = root.current?.querySelectorAll(".k-doc h3, .k-doc h4")[i];
                        el?.scrollIntoView({ behavior: "smooth", block: "start" });
                        retrigger(el ?? null, "k-flash");
                      };
                      if (collapsible && !expanded) {
                        setExpanded(true);
                        window.setTimeout(jump, 480);
                      } else jump();
                    }}
                    aria-current={i === activeH ? "true" : undefined}
                    className={cn("cursor-pointer border-l-2 pl-2 text-left transition-colors duration-(--dur-base)", i === activeH ? "border-acc text-ink" : "border-transparent text-ink3 hover:text-ink")}
                  >
                    <span className="mr-2 font-mono text-[11px]">{String(i + 1).padStart(2, "0")}</span>
                    {h}
                  </button>
                </li>
              ))}
            </ol>
          </details>
        )}
        {run?.tasks && run.sources && run.sources.length > 0 && <EvidenceLog sources={run.sources} live={streaming} />}
        {m.parts.map((p, i) => {
          if (p.type === "text")
            return streaming ? (
              <div key={i} className="k-doc text-[length:var(--read-size,15.5px)] leading-[1.7]">
                <StreamText text={p.text} done={false} />
              </div>
            ) : diff ? (
              // 106 — добавленное подсвечено, убранное зачёркнуто
              <p key={i} className="k-doc text-[length:var(--read-size,15.5px)] leading-[1.7] whitespace-pre-wrap">
                {diff.map((d, j) =>
                  d.kind === "same" ? d.text : d.kind === "add" ? <ins key={j} className="rounded-[2px] bg-acc-soft text-ink no-underline">{d.text}</ins> : <del key={j} className="text-ink3 decoration-err/70">{d.text}</del>,
                )}
              </p>
            ) : collapsible ? (
              <div key={i}>
                <div className={cn("k-collapsible", !expanded && "k-collapsed")}>
                  <MarkdownOrText text={p.text} sources={run?.sources} />
                </div>
                <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="k-tool mt-1 h-8 text-[12.5px] text-ink2">
                  {expanded ? "Свернуть ответ" : "Показать ответ полностью"}
                </button>
              </div>
            ) : (
              <MarkdownOrText key={i} text={p.text} sources={run?.sources} />
            );
          if (p.type === "job") return <JobCard key={i} job={p} queuePosition={run?.queuePosition} tip={run?.tip} since={run?.startedAt} />;
          if (p.type === "video") return <VideoCard key={i} video={p} />;
          if (p.type === "audio") return <AudioCard key={i} audio={p} />;
          return null;
        })}
        {images.length > 0 &&
          (compareBefore && images[0] ? (
            <BeforeAfter before={compareBefore} after={images[0].url} alt={images[0].alt} />
          ) : (
            <ImageGrid images={images} id={m.id} caption={`${m.model ?? ""}`} onAction={onImageAction} fresh={!!run} />
          ))}
        {run?.status === "done" && run.tasks && <AgentSummary run={run} costMicro={m.costMicro} onOpenArtifact={onOpenArtifact} onSavePacket={m.mode === "research" ? onSaveArtifact : undefined} />}
        {/* 22 — до первого слова: строки-заглушки с общим бликом и честный секундомер */}
        {waiting && (
          <div aria-hidden="true" className="flex flex-col gap-2.5 pt-1">
            <Bar className="h-3 w-[92%] rounded-full" />
            <Bar className="h-3 w-[78%] rounded-full" />
            <Bar className="h-3 w-[55%] rounded-full" />
            {run?.startedAt && now > run.startedAt + 1000 && <span className="k-meta">ждём первое слово · {secs(now - run.startedAt)} с</span>}
          </div>
        )}

        {run?.status === "error" && (
          <div role="alert" className="flex max-w-lg flex-col gap-2 rounded-(--radius-md) border border-err/40 bg-err-soft p-3.5">
            <p className="text-[13.5px] text-err">Генерация не удалась{run.refundedMicro ? ` · возвращено ${formatCredits(run.refundedMicro)}` : ""}</p>
            <p className="text-[13px] text-ink2">Провайдер не ответил. Повторите или выберите другую модель — KURAI не меняет выбранную модель молча.</p>
            <button type="button" onClick={onRegenerate} className="k-tool w-max bg-s2 text-ink">
              <RotateCcw size={14} strokeWidth={1.5} /> Повторить
            </button>
          </div>
        )}

        {/* 102 — почему этот маршрут: только известные факты — что выбрал «Авто», его контекст и объём запроса */}
        {settled && (run?.requested === "auto" || run?.requested === "openrouter/auto") && m.model && m.model !== "openrouter/auto" && (
          <details className="k-why text-[12.5px]">
            <summary className="k-meta cursor-pointer hover:text-ink">
              «Авто» выбрал {routeLabel(m.model)}
              {info && ` · ${GROUP_LABEL[info.group].toLowerCase()}`}
              {info && info.contextK > 0 && ` · контекст до ${info.contextK >= 1000 ? `${info.contextK / 1000}M` : `${info.contextK}K`}`}
              {` · в запросе ≈ ${Math.max(1, Math.ceil(promptChars / 4)).toLocaleString("ru-RU")} ток.`}
            </summary>
            <dl className="mt-2 grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-(--radius-md) border border-line bg-g1 px-3 py-2.5">
              <dt className="text-ink3">Запрошено</dt>
              <dd className="text-ink2">«Авто» — маршрутизатор OpenRouter</dd>
              <dt className="text-ink3">Выбрано</dt>
              <dd className="text-ink2">{routeLabel(m.model)}{info ? ` · ${info.provider}` : ""}</dd>
              {info && info.contextK > 0 && (
                <>
                  <dt className="text-ink3">Контекст модели</dt>
                  <dd className="text-ink2">до {info.contextK >= 1000 ? `${info.contextK / 1000}M` : `${info.contextK}K`} токенов</dd>
                </>
              )}
              <dt className="text-ink3">Объём запроса</dt>
              <dd className="text-ink2">≈ {Math.max(1, Math.ceil(promptChars / 4)).toLocaleString("ru-RU")} токенов (по символам)</dd>
              <dt className="text-ink3">Другие кандидаты</dt>
              <dd className="text-ink3">маршрутизатор их не сообщает — не показываем выдуманные</dd>
            </dl>
          </details>
        )}
        {settled && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-2">
            <RunReceipt run={run} costMicro={m.costMicro} model={m.model} code={m.id} />
            <div className="k-answer-actions -mr-1.5 flex flex-wrap items-center">
              {text && (
                <button type="button" onClick={copy} aria-label={copied ? "Скопировано" : "Копировать"} data-tip={copied ? "Скопировано" : "Копировать"} className="k-act">
                  {/* 24 — «Копировать» превращается в галочку */}
                  <motion.span key={String(copied)} initial={copied ? { scale: 0.4, rotate: -30 } : false} animate={{ scale: 1, rotate: 0 }} transition={SPRING.bouncy} className="grid place-items-center">
                    {copied ? <Check size={14} strokeWidth={1.5} className="text-acc" /> : <Copy size={14} strokeWidth={1.5} />}
                  </motion.span>
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  // 24 — «Ветка» рисует линию ответвления
                  retrigger(e.currentTarget, "k-branch-draw");
                  onRegenerate();
                }}
                aria-label="Новая версия ответа"
                data-tip="Новая версия"
                className="k-act relative"
              >
                <RotateCcw size={14} strokeWidth={1.5} />
              </button>
              {onPin && (
                <button type="button" onClick={onPin} aria-pressed={pinned} aria-label={pinned ? "Открепить" : "Закрепить"} data-tip={pinned ? "Открепить" : "Закрепить"} className="k-act">
                  {/* 24 — «Закрепить» ставит печать */}
                  <motion.span key={String(pinned)} initial={pinned ? { scale: 1.7, rotate: -18, opacity: 0.4 } : false} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={SPRING.bouncy} className="grid place-items-center">
                    <Pin size={14} strokeWidth={1.5} fill={pinned ? "currentColor" : "none"} />
                  </motion.span>
                </button>
              )}
              {text && onSaveArtifact && (
                <button type="button" onClick={() => void saveWith(onSaveArtifact, "artifact")} aria-label="Сохранить как артефакт" data-tip={saved === "artifact" ? "Сохранено" : "В артефакты"} className={cn("k-act", saved === "artifact" && "text-acc")}>
                  {saved === "artifact" ? <DrawnCheck /> : <Archive size={14} strokeWidth={1.5} />}
                </button>
              )}
              {text && onSaveRecipe && (
                <button type="button" onClick={() => void saveWith(onSaveRecipe, "recipe")} aria-label="Сохранить как рецепт" data-tip={saved === "recipe" ? "Сохранено" : "В рецепты"} className={cn("k-act", saved === "recipe" && "text-acc")}>
                  {saved === "recipe" ? <DrawnCheck /> : <BookmarkPlus size={14} strokeWidth={1.5} />}
                </button>
              )}
              {text && onExportSlides && (
                <button type="button" onClick={onExportSlides} aria-label="Скачать презентацию" data-tip="Экспорт .pptx" className="k-act">
                  <FileDown size={14} strokeWidth={1.5} />
                </button>
              )}
              {printable && (
                <button type="button" onClick={printAnswer} aria-label="Экспорт в PDF" data-tip="Экспорт PDF" className="k-act">
                  <Printer size={14} strokeWidth={1.5} />
                </button>
              )}
              {printable && kuraiApi && (
                <button
                  type="button"
                  onClick={() => {
                    const api = kuraiApi;
                    if (!api) return;
                    setStacking(true);
                    void api
                      .exportDocument(m.id)
                      .then((file) => {
                        const url = URL.createObjectURL(file);
                        const a = Object.assign(document.createElement("a"), { href: url, download: "kurai-research.docx" });
                        document.body.append(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      })
                      .catch(() => undefined)
                      .finally(() => setStacking(false));
                  }}
                  aria-label="Экспорт в DOCX"
                  data-tip="Экспорт .docx"
                  className="k-act"
                >
                  <FileText size={14} strokeWidth={1.5} />
                </button>
              )}
              {text.length > 500 && (
                <button type="button" onClick={() => setReading(true)} aria-label="Режим чтения" data-tip="Чтение" className="k-act">
                  <BookOpen size={14} strokeWidth={1.5} />
                </button>
              )}
              {text && canSpeak && (
                <button
                  type="button"
                  aria-pressed={speaking}
                  aria-label={speaking ? "Остановить озвучку" : "Слушать"}
                  data-tip={speaking ? "Стоп" : "Слушать"}
                  onClick={() => {
                    const synth = window.speechSynthesis;
                    if (speaking) {
                      synth.cancel();
                      setSpeaking(false);
                      setSpoken(null);
                      clearSpoken();
                      return;
                    }
                    // 109 — озвучивается видимый текст, и слово под голосом подсвечивается прямо в нём
                    const doc = root.current?.querySelector(".k-doc");
                    const map = doc ? speakable(doc) : null;
                    const plain = map?.text ?? text.replace(/[#*|>`_\[\]()-]/g, " ").replace(/[ \t]+/g, " ");
                    const u = new SpeechSynthesisUtterance(plain);
                    u.lang = "ru-RU";
                    u.onboundary = (ev) => {
                      if (ev.name !== "word") return;
                      const len = ev.charLength || (/^\S+/.exec(plain.slice(ev.charIndex))?.[0].length ?? 0);
                      if (!(map && highlightSpoken(map, ev.charIndex, len))) setSpoken({ text: plain, at: ev.charIndex, len });
                    };
                    u.onend = () => {
                      setSpeaking(false);
                      setSpoken(null);
                      clearSpoken();
                    };
                    synth.cancel();
                    synth.speak(u);
                    setSpeaking(true);
                  }}
                  className="k-act"
                >
                  {speaking ? <VolumeX size={14} strokeWidth={1.5} /> : <Volume2 size={14} strokeWidth={1.5} />}
                </button>
              )}
              <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
              <button type="button" aria-pressed={rating === "up"} onClick={() => setRating(rating === "up" ? null : "up")} aria-label="Полезно" data-tip="Полезно" className="k-act">
                <ThumbsUp size={14} strokeWidth={1.5} />
              </button>
              <button type="button" aria-pressed={rating === "down"} onClick={() => setRating(rating === "down" ? null : "down")} aria-label="Не то" data-tip="Не то" className={cn("k-act", rating === "down" && "text-warn")}>
                <ThumbsDown size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {speaking && spoken && <SpokenLine {...spoken} />}
        {/* 109 — подсветка слова под голосом прямо в тексте; правило живёт здесь: парсер CSS сборки не знает ::highlight() */}
        {speaking && <style>{"::highlight(k-speak){background-color:var(--color-acc-soft);color:var(--color-ink)}"}</style>}

        {rating === "down" && !reason && (
          <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
            <span className="text-ink3">Что не так?</span>
            {["Неточно", "Слишком длинно", "Не по теме", "Устарело"].map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)} className="cursor-pointer rounded-(--radius-sm) border border-line px-2 py-1 text-ink2 hover:border-warn hover:text-warn">
                {r}
              </button>
            ))}
          </div>
        )}
        {(rating === "up" || reason) && (
          <p role="status" className="text-[12.5px] text-ink3">
            {rating === "up" ? "Спасибо за оценку." : `Принято: «${reason}». Попробуйте новую версию другой моделью.`}
          </p>
        )}

        {/* Продолжения: на широком экране живут в инспекторе, здесь — для планшета и телефона */}
        {last && run?.status === "done" && run.followups && run.followups.length > 0 && onFollowup && (
          <ul className="flex flex-wrap gap-1.5 xl:hidden" aria-label="Продолжить работу">
            {run.followups.map((f, i) => (
              <motion.li key={f} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.04, duration: 0.18 }}>
                <button type="button" onClick={() => onFollowup(f)} className="k-tool h-9 border border-line text-[13px]">
                  {f}
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
      {printable && (run?.sources?.length ?? 0) > 0 && (
        <ol className="k-print-only col-span-full mt-10 break-before-page text-[12px]">
          <li className="mb-3 list-none font-mono text-[11px] tracking-[0.12em] uppercase">Источники</li>
          {run?.sources?.map((src, i) => (
            <li key={src.url} className="mb-1.5 list-none">
              [{i + 1}] {src.title} — {src.url}
            </li>
          ))}
        </ol>
      )}
      <AnimatePresence>
        {stacking && (
          <motion.div aria-hidden="true" className="fixed inset-0 z-(--z-overlay) grid place-items-center bg-bg/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="relative h-40 w-32">
              {[0, 1, 2].map((i) => (
                <motion.i
                  key={i}
                  className="absolute inset-0 rounded-[3px] border border-line2 bg-g2 shadow-(--shadow-float)"
                  initial={{ y: 60 + i * 30, opacity: 0, rotate: (i - 1) * 6 }}
                  animate={{ y: -i * 4, opacity: 1, rotate: (i - 1) * 2 }}
                  transition={{ ...SPRING.gentle, delay: i * 0.12 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{reading && <Reader text={text} model={m.model} onClose={() => setReading(false)} />}</AnimatePresence>
    </article>
  );
}

/** 109 — текущая фраза озвучки, слово под голосом подсвечено (по событиям границ слов браузера). */
function SpokenLine({ text, at, len }: { text: string; at: number; len: number }) {
  const start = Math.max(text.lastIndexOf(".", at - 1), text.lastIndexOf("\n", at - 1)) + 1;
  const stops = [text.indexOf(".", at + len), text.indexOf("\n", at + len)].filter((i) => i >= 0);
  const end = stops.length ? Math.min(...stops) + 1 : text.length;
  return (
    <p aria-hidden="true" className="rounded-(--radius-md) border border-line bg-g1 px-3 py-2 text-[13.5px] leading-relaxed text-ink3">
      {text.slice(start, at).trimStart()}
      <mark className="rounded-[3px] bg-acc-soft px-0.5 text-ink">{text.slice(at, at + len)}</mark>
      {text.slice(at + len, end)}
    </p>
  );
}
