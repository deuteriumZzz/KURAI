"use client";

import { lazy, Suspense, useRef, useState } from "react";
import { motion } from "motion/react";
import { Brain } from "lucide-react";
import { Check, ChevronLeft, ChevronRight, Copy, Pencil, Pin, RotateCcw } from "lucide-react";
import type { Message, MessagePart } from "@/types/api";
import type { RunState } from "@/lib/stream";
import { formatBytes, formatCredits } from "@/lib/format";
import { modeById } from "@/lib/modes";
import { StreamText } from "@/components/fx/decode";
import { Label, SysLine } from "@/components/fx/primitives";
// Markdown (≈ 40 KB) грузится отдельным чанком; до загрузки ответ виден обычным текстом.
const LazyMarkdown = lazy(() => import("./markdown").then((m) => ({ default: m.Markdown })));
type Src = { url: string; title: string };
import { ImageGrid, JobCard, VideoCard, type ImageAction } from "./media";
import { AgentChoice, AgentSummary, FileScan, QuestLog, SourceNet } from "./agent";
import { BeforeAfter } from "./before-after";

const time = (iso: string) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const textOf = (m: Message) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

/** Пока чанк Markdown не загружен — показываем текст как есть. */
function MarkdownOrText({ text, sources }: { text: string; sources?: Src[] }) {
  return (
    <Suspense fallback={<p className="text-[length:var(--read-size,15px)] leading-relaxed whitespace-pre-wrap">{text}</p>}>
      <LazyMarkdown text={text} sources={sources} />
    </Suspense>
  );
}

type Versions = { index: number; total: number; prev?: () => void; next?: () => void };

function VersionSwitch({ v }: { v: Versions }) {
  if (v.total < 2) return null;
  return (
    <span className="inline-flex items-center font-mono text-[11px] text-ink2">
      <button type="button" onClick={v.prev} disabled={!v.prev} aria-label="Предыдущая версия" className="grid size-6 cursor-pointer place-items-center disabled:opacity-30">
        <ChevronLeft size={14} strokeWidth={1.5} />
      </button>
      {v.index + 1} / {v.total}
      <button type="button" onClick={v.next} disabled={!v.next} aria-label="Следующая версия" className="grid size-6 cursor-pointer place-items-center disabled:opacity-30">
        <ChevronRight size={14} strokeWidth={1.5} />
      </button>
    </span>
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

/** Рассуждения модели («Думать дольше»): открыты, пока идёт размышление, потом сворачиваются. */
function Thinking({ text, live }: { text: string; live: boolean }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const isOpen = open ?? live;
  return (
    <div className="max-w-2xl border-l border-acc-line pl-3">
      <button type="button" onClick={() => setOpen(!isOpen)} aria-expanded={isOpen} className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-[11.5px] text-ink3 hover:text-ink">
        <Brain size={13} strokeWidth={1.5} className={live ? "fx-caret text-acc" : undefined} />
        {live ? "Модель думает…" : "Рассуждение"} {isOpen ? "▾" : "▸"}
      </button>
      {isOpen && <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-wrap text-ink3">{text}</p>}
    </div>
  );
}

export function UserMessage({ m, editing, onEdit, onCancel, onSubmitEdit, versions }: UserProps) {
  const text = textOf(m);
  const [draft, setDraft] = useState(text);
  const files = m.parts.filter((p): p is Extract<MessagePart, { type: "file" }> => p.type === "file");

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) onSubmitEdit(draft.trim());
        }}
        className="fx-brackets ml-auto flex w-full max-w-[85%] flex-col gap-2 sm:max-w-[75%]"
        data-selected="true"
      >
        <label htmlFor={`edit-${m.id}`} className="fx-sr">
          Изменить сообщение
        </label>
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
          className="min-h-20 w-full resize-none border border-acc-line bg-g1 px-3 py-2 text-[14.5px] field-sizing-content outline-none"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="cursor-pointer px-3 py-1.5 text-[13px] text-ink2 hover:text-ink">
            Отмена
          </button>
          <button type="submit" className="fx-chamfer cursor-pointer bg-acc px-3 py-1.5 text-[13px] font-semibold text-acc-ink [--ch:var(--chamfer-sm)]">
            Отправить новой веткой
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="group ml-auto flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[75%]">
      <div className="border border-line bg-g2 px-3.5 py-2.5 text-[14.5px]">
        {m.mode !== "text" && <Label className="mb-1 block text-acc">{modeById(m.mode).label}</Label>}
        {files.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {files.map((f) => (
              <li key={f.name} className="border border-line2 bg-g1 px-2 py-1 font-mono text-[11.5px] text-ink2">
                {f.name} · {formatBytes(f.sizeBytes)}
              </li>
            ))}
          </ul>
        )}
        {text && <p className="whitespace-pre-wrap">{text}</p>}
      </div>
      <div className="flex items-center gap-1 text-[12px] text-ink3">
        <VersionSwitch v={versions} />
        {text && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 px-1.5 opacity-0 transition-opacity duration-(--dur-fast) group-hover:opacity-100 focus-visible:opacity-100 hover:text-ink pointer-coarse:h-11 pointer-coarse:opacity-100"
          >
            <Pencil size={13} strokeWidth={1.5} /> Изменить
          </button>
        )}
      </div>
    </div>
  );
}

type Props = {
  m: Message;
  run?: RunState;
  versions: Versions;
  onRegenerate: () => void;
  onAnswer?: (choice: number) => void;
  onOpenArtifact?: () => void;
  onFollowup?: (text: string) => void;
  onImageAction?: (a: ImageAction, index: number) => void;
  pinned?: boolean;
  onPin?: () => void;
  /** Исходник для сравнения «до / после» (апскейл). */
  compareBefore?: string;
};

export function AssistantMessage({ m, run, versions, onRegenerate, onAnswer, onOpenArtifact, onFollowup, onImageAction, pinned = false, onPin, compareBefore }: Props) {
  const [copied, setCopied] = useState(false);
  const swipeX = useRef<number | null>(null);
  const streaming = run?.status === "streaming";
  const text = textOf(m);
  const images = m.parts.filter((p): p is Extract<MessagePart, { type: "image" }> => p.type === "image");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <article
      className="group flex flex-col gap-2"
      aria-busy={streaming}
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
      <div className="flex flex-wrap items-center gap-2.5">
        {m.model && <span className="border border-acc-line bg-acc-soft px-1.5 py-0.5 font-mono text-[11px] text-acc">{m.model}</span>}
        <VersionSwitch v={versions} />
        {run?.status === "aborted" && (
          <span className="border border-warn/40 px-1.5 py-0.5 font-mono text-[11px] text-warn">ПРЕРВАНО · списано {formatCredits(m.costMicro)}</span>
        )}
      </div>

      {run?.log.map((l, i) => (
        <SysLine key={i} tone={l.tone} decode>
          {l.text}
        </SysLine>
      ))}

      {run?.scans?.map((sc) => <FileScan key={sc.name} name={sc.name} labels={sc.labels} />)}
      {run?.ask && <AgentChoice ask={run.ask} onAnswer={(c) => onAnswer?.(c)} />}
      {run?.tasks && <QuestLog tasks={run.tasks} />}
      {run?.thinking && <Thinking text={run.thinking} live={streaming && !text} />}
      {run?.tasks && run.sources && run.sources.length > 0 && <SourceNet sources={run.sources} />}
      {m.parts.map((p, i) => {
        if (p.type === "text")
          return streaming ? (
            <div key={i} className="text-[length:var(--read-size,15px)] leading-relaxed">
              <StreamText text={p.text} done={false} />
            </div>
          ) : (
            <MarkdownOrText key={i} text={p.text} sources={run?.sources} />
          );
        if (p.type === "job") return <JobCard key={i} job={p} queuePosition={run?.queuePosition} tip={run?.tip} />;
        if (p.type === "video") return <VideoCard key={i} video={p} id={`${m.id}-v${i}`} />;
        return null;
      })}
      {images.length > 0 &&
        (compareBefore && images[0] ? (
          <BeforeAfter before={compareBefore} after={images[0].url} alt={images[0].alt} />
        ) : (
          <ImageGrid images={images} id={m.id} caption={`${m.model ?? ""}`} onAction={onImageAction} fresh={!!run} />
        ))}
      {run?.status === "done" && run.tasks && <AgentSummary run={run} costMicro={m.costMicro} onOpenArtifact={onOpenArtifact} />}
      {!run?.tasks && run?.sources && run.sources.length > 0 && !streaming && (
        <ul aria-label="Источники" className="flex flex-wrap gap-1.5">
          {run.sources.map((s, i) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="fx-hover flex items-center gap-1.5 border border-line bg-g1 px-2 py-1 text-[12px] text-ink2 hover:border-line2 hover:text-ink">
                <span className="font-mono text-[10px] text-acc">{i + 1}</span>
                {new URL(s.url).hostname.replace(/^www\./, "")}
              </a>
            </li>
          ))}
        </ul>
      )}
      {run?.status === "done" && run.followups && run.followups.length > 0 && onFollowup && (
        <div className="flex flex-wrap gap-1.5">
          {run.followups.map((f, i) => (
            <motion.button
              key={f}
              type="button"
              onClick={() => onFollowup(f)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.2 }}
              className="fx-hover cursor-pointer border border-line bg-g1 px-2.5 py-1.5 text-[12.5px] text-ink2 hover:border-acc-line hover:text-acc pointer-coarse:py-2.5"
            >
              ↳ {f}
            </motion.button>
          ))}
        </div>
      )}
      {streaming && text === "" && !run?.ask && m.parts.every((p) => p.type === "text") && (
        <span aria-hidden="true" className="fx-caret font-mono text-acc">▍</span>
      )}

      {run?.status === "error" && (
        <div role="alert" className="fx-glitch flex max-w-lg flex-col gap-2 border border-err/45 bg-err-soft p-3">
          <SysLine tone="err" prefix="✕">генерация не удалась · кредиты возвращены</SysLine>
          <p className="text-[13px] text-ink2">Провайдер не ответил, и резервная модель тоже. Попробуйте ещё раз или выберите другую модель.</p>
          <button type="button" onClick={onRegenerate} className="fx-chamfer w-max cursor-pointer bg-acc px-3 py-1.5 text-[13px] font-semibold text-acc-ink [--ch:var(--chamfer-sm)]">
            Повторить
          </button>
        </div>
      )}
      {!streaming && (
        <div className="flex flex-wrap items-center gap-1 text-[12px] text-ink3">
          {text && (
            <button type="button" onClick={copy} className="inline-flex h-7 cursor-pointer items-center gap-1.5 px-1.5 hover:text-ink pointer-coarse:h-11">
              {copied ? <Check size={13} strokeWidth={1.5} /> : <Copy size={13} strokeWidth={1.5} />}
              {copied ? "Скопировано" : "Копировать"}
            </button>
          )}
          <button type="button" onClick={onRegenerate} className="inline-flex h-7 cursor-pointer items-center gap-1.5 px-1.5 hover:text-ink pointer-coarse:h-11">
            <RotateCcw size={13} strokeWidth={1.5} /> Перегенерировать
          </button>
          {onPin && (
            <button type="button" onClick={onPin} aria-pressed={pinned} className={`inline-flex h-7 cursor-pointer items-center gap-1.5 px-1.5 hover:text-ink pointer-coarse:h-11 ${pinned ? "text-acc" : ""}`}>
              <Pin size={13} strokeWidth={1.5} /> {pinned ? "Закреплено" : "Закрепить"}
            </button>
          )}
          <span className="ml-1 font-mono text-[11px] opacity-0 transition-opacity duration-(--dur-fast) group-hover:opacity-100 group-focus-within:opacity-100">
            {time(m.createdAt)} · {formatCredits(m.costMicro)}
            {run?.durationMs ? ` · ${(run.durationMs / 1000).toFixed(1).replace(".", ",")} с` : ""}
          </span>
        </div>
      )}
    </article>
  );
}
