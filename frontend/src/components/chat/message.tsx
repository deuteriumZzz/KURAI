"use client";

import { lazy, Suspense, useRef, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Archive, BookOpen, BookmarkPlus, Brain, Check, ChevronLeft, ChevronRight, Copy, FileDown, Pencil, Pin, RotateCcw, ThumbsDown, ThumbsUp, Volume2, VolumeX } from "lucide-react";
import { Reader } from "./reader";
import type { Message, MessagePart } from "@/types/api";
import type { RunState } from "@/lib/stream";
import { DISPLAY_TZ, formatBytes, formatCredits } from "@/lib/format";
import { modeById } from "@/lib/modes";
import { modelByName } from "@/lib/models";
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

// Markdown (≈ 40 KB) грузится отдельным чанком; до загрузки ответ виден обычным текстом.
const LazyMarkdown = lazy(() => import("./markdown").then((m) => ({ default: m.Markdown })));
type Src = { url: string; title: string };
const noop = () => () => {};

const time = (iso: string) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: DISPLAY_TZ });
const textOf = (m: Message) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

/** Пока чанк Markdown не загружен — показываем текст как есть. */
function MarkdownOrText({ text, sources }: { text: string; sources?: Src[] }) {
  return (
    <Suspense fallback={<p className="k-doc text-[length:var(--read-size,15.5px)] leading-[1.7] whitespace-pre-wrap">{text}</p>}>
      <LazyMarkdown text={text} sources={sources} />
    </Suspense>
  );
}

type Versions = { index: number; total: number; prev?: () => void; next?: () => void };

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
function Thinking({ text, live }: { text: string; live: boolean }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const isOpen = open ?? live;
  return (
    <div className="border-l border-line2 pl-3">
      <button type="button" onClick={() => setOpen(!isOpen)} aria-expanded={isOpen} className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] text-ink3 hover:text-ink">
        <Brain size={13} strokeWidth={1.5} className={live ? "fx-caret" : undefined} />
        {live ? "Модель рассуждает…" : "Ход рассуждения"} {isOpen ? "▾" : "▸"}
      </button>
      {isOpen && <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-wrap text-ink3">{text}</p>}
    </div>
  );
}

type UserProps = {
  m: Message;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSubmitEdit: (text: string) => void;
  versions: Versions;
};

/** Реплика человека: сдержанная, без «пузыря» — имя, время, текст. Правка создаёт новую ветку. */
export function UserMessage({ m, editing, onEdit, onCancel, onSubmitEdit, versions }: UserProps) {
  const member = useStore(memberStore);
  const text = textOf(m);
  const [draft, setDraft] = useState(text);
  const files = m.parts.filter((p): p is Extract<MessagePart, { type: "file" }> => p.type === "file");

  return (
    <div className="group grid gap-x-4 sm:grid-cols-[36px_minmax(0,1fr)]">
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
            <textarea
              id={`edit-${m.id}`}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancel();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (draft.trim()) onSubmitEdit(draft.trim());
                }
              }}
              className="k-composer min-h-20 w-full resize-none px-3 py-2.5 text-[15px] field-sizing-content outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <span className="mr-auto text-[12px] text-ink3">Исходная реплика сохранится в прошлой ветке</span>
              <button type="button" onClick={onCancel} className="k-tool">Отмена</button>
              <button type="submit" className="k-tool bg-acc text-acc-ink hover:bg-acc hover:text-acc-ink">Отправить новой веткой</button>
            </div>
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
            {text && <p className="text-[length:var(--read-size,15.5px)] leading-[1.65] whitespace-pre-wrap text-ink">{text}</p>}
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
  onSaveArtifact?: () => void;
  onSaveRecipe?: () => void;
  pinned?: boolean;
  onPin?: () => void;
  /** Исходник для сравнения «до / после» (апскейл). */
  compareBefore?: string;
};

/** Ответ — раздел документа: знак маршрута, текст, квитанция запуска и слой действий. */
export function AssistantMessage({ m, run, versions, last = false, onRegenerate, onStop, onAnswer, onOpenArtifact, onFollowup, onImageAction, onExportSlides, onSaveArtifact, onSaveRecipe, pinned = false, onPin, compareBefore }: Props) {
  const [copied, setCopied] = useState(false);
  const swipeX = useRef<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [reading, setReading] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  // без рассинхрона гидрации: на сервере озвучки нет, в браузере — есть
  const canSpeak = useSyncExternalStore(noop, () => "speechSynthesis" in window, () => false);
  const streaming = run?.status === "streaming";
  const text = textOf(m);
  const images = m.parts.filter((p): p is Extract<MessagePart, { type: "image" }> => p.type === "image");
  const info = m.model ? modelByName(m.model) : undefined;
  const settled = !streaming && run?.status !== "error";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <article
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
      <span className="grid size-9 place-items-center max-sm:hidden">
        <ModelGlyph id={info?.id ?? m.model ?? "auto"} kind={m.model ? glyphKind(info?.group) : "auto"} size={26} className={streaming ? "text-acc" : undefined} />
      </span>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex h-9 flex-wrap items-center gap-x-2.5">
          <span className="text-[14px] font-medium text-ink">{m.model ?? (streaming ? "Подбираю маршрут…" : "Автомаршрут")}</span>
          <span className="text-[12px] text-ink3">{time(m.createdAt)}</span>
          <VersionSwitch v={versions} />
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
        {run?.thinking && <Thinking text={run.thinking} live={streaming && !text} />}
        {run?.tasks && run.sources && run.sources.length > 0 && <EvidenceLog sources={run.sources} live={streaming} />}
        {m.parts.map((p, i) => {
          if (p.type === "text")
            return streaming ? (
              <div key={i} className="k-doc text-[length:var(--read-size,15.5px)] leading-[1.7]">
                <StreamText text={p.text} done={false} />
              </div>
            ) : (
              <MarkdownOrText key={i} text={p.text} sources={run?.sources} />
            );
          if (p.type === "job") return <JobCard key={i} job={p} queuePosition={run?.queuePosition} tip={run?.tip} />;
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
        {streaming && text === "" && !run?.ask && m.parts.every((p) => p.type === "text") && (
          <span aria-hidden="true" className="fx-caret font-mono text-acc">▍</span>
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

        {settled && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-2">
            <RunReceipt run={run} costMicro={m.costMicro} model={m.model} />
            <div className="k-answer-actions -mr-1.5 flex flex-wrap items-center">
              {text && (
                <button type="button" onClick={copy} aria-label={copied ? "Скопировано" : "Копировать"} data-tip={copied ? "Скопировано" : "Копировать"} className="k-act">
                  {copied ? <Check size={14} strokeWidth={1.5} className="text-acc" /> : <Copy size={14} strokeWidth={1.5} />}
                </button>
              )}
              <button type="button" onClick={onRegenerate} aria-label="Новая версия ответа" data-tip="Новая версия" className="k-act">
                <RotateCcw size={14} strokeWidth={1.5} />
              </button>
              {onPin && (
                <button type="button" onClick={onPin} aria-pressed={pinned} aria-label={pinned ? "Открепить" : "Закрепить"} data-tip={pinned ? "Открепить" : "Закрепить"} className="k-act">
                  <Pin size={14} strokeWidth={1.5} />
                </button>
              )}
              {text && onSaveArtifact && (
                <button type="button" onClick={onSaveArtifact} aria-label="Сохранить как артефакт" data-tip="В артефакты" className="k-act">
                  <Archive size={14} strokeWidth={1.5} />
                </button>
              )}
              {text && onSaveRecipe && (
                <button type="button" onClick={onSaveRecipe} aria-label="Сохранить как рецепт" data-tip="В рецепты" className="k-act">
                  <BookmarkPlus size={14} strokeWidth={1.5} />
                </button>
              )}
              {text && onExportSlides && (
                <button type="button" onClick={onExportSlides} aria-label="Скачать презентацию" data-tip="Экспорт .pptx" className="k-act">
                  <FileDown size={14} strokeWidth={1.5} />
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
                      return;
                    }
                    const u = new SpeechSynthesisUtterance(text.replace(/[#*|>`_\[\]()-]/g, " "));
                    u.lang = "ru-RU";
                    u.onend = () => setSpeaking(false);
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
      <AnimatePresence>{reading && <Reader text={text} model={m.model} onClose={() => setReading(false)} />}</AnimatePresence>
    </article>
  );
}
