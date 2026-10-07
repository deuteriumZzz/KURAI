"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, FileText, Square } from "lucide-react";
import type { AgentTask, RunState } from "@/lib/stream";
import { cn } from "@/lib/cn";
import { formatCredits, hostOf, webHref, plural } from "@/lib/format";
import { routeLabel } from "@/lib/models";


/** Уточнение перед запуском: план не стартует, пока человек не выбрал вариант (клик или клавиша 1–3). */
export function AgentChoice({ ask, onAnswer }: { ask: NonNullable<RunState["ask"]>; onAnswer: (choice: number) => void }) {
  const answered = ask.choice !== undefined;
  return (
    <div role="group" aria-label={ask.question} className="flex max-w-xl flex-col gap-2">
      <p className="k-index">Перед запуском</p>
      <p className="text-[15px] text-ink">{ask.question}</p>
      <div className="mt-1 flex flex-col gap-1">
        {ask.options.map((o, i) => (
          <button
            key={o}
            type="button"
            disabled={answered}
            onClick={() => onAnswer(i)}
            aria-pressed={ask.choice === i}
            className={cn(
              "k-bay-row flex cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-[13.5px] text-ink2 disabled:cursor-default pointer-coarse:py-3",
              !answered && "hover:bg-s2 hover:text-ink",
              ask.choice === i && "border-acc-line bg-acc-soft text-ink",
              answered && ask.choice !== i && "opacity-40",
            )}
          >
            <span className="k-kbd">{i + 1}</span>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * План работы агента: шаги запечатываются один раз по завершении, у текущего — локальный
 * сигнал, пока идёт запуск. На финальном состоянии движение прекращается.
 */
export function WorkPlan({ tasks, live = false, onStop }: { tasks: AgentTask[]; live?: boolean; onStop?: () => void }) {
  const done = tasks.filter((t) => t.status === "done").length;
  const doing = tasks.some((t) => t.status === "doing");
  // 29 — линия между шагами заполняется по мере работы: половина отрезка — на текущий шаг
  const fill = tasks.length > 1 ? Math.min(1, (done + (doing ? 0.5 : 0)) / (tasks.length - 1)) : 0;
  return (
    <section aria-label="План работы" className="max-w-xl rounded-(--radius-md) border border-line bg-g1">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <p className="text-[13.5px] text-ink">План работы</p>
        <span className="flex items-center gap-3">
          <span className="k-meta">{done} из {tasks.length}</span>
          {live && onStop && (
            <button type="button" onClick={onStop} className="k-tool h-7 text-[12.5px]">
              <Square size={10} strokeWidth={2} fill="currentColor" /> Остановить
            </button>
          )}
        </span>
      </header>
      <ol className="relative flex flex-col py-1.5">
        {tasks.length > 1 && (
          <i aria-hidden="true" className="absolute top-[22px] bottom-[22px] left-[24.5px] w-px bg-line">
            <i className="block h-full w-full origin-top bg-acc transition-transform duration-500 ease-(--ease-out) motion-reduce:transition-none" style={{ transform: `scaleY(${fill})` }} />
          </i>
        )}
        {tasks.map((t, i) => (
          <li key={t.title} aria-current={t.status === "doing" ? "step" : undefined} className={cn("flex items-center gap-3 px-4 py-2 text-[13.5px]", t.status === "todo" ? "text-ink3" : t.status === "doing" ? "text-ink" : "text-ink2")}>
            <span
              aria-hidden="true"
              className={cn(
                "relative grid size-[18px] shrink-0 place-items-center rounded-(--radius-xs) border font-mono text-[10px]",
                t.status === "done" && "k-seal border-acc bg-acc text-acc-ink",
                t.status === "doing" && cn("border-acc-line bg-g1 text-acc", live && "k-live"),
                t.status === "todo" && "border-line bg-g1 text-ink3",
              )}
            >
              {t.status === "done" ? <Check size={11} strokeWidth={2.5} /> : String(i + 1)}
            </span>
            <span className="min-w-0 flex-1">{t.title}</span>
            {t.progress && <span className="k-meta">{t.progress}</span>}
            <span className="fx-sr">{t.status === "done" ? "выполнено" : t.status === "doing" ? "выполняется" : "в очереди"}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Журнал доказательств: источники в порядке чтения, номер совпадает со сноской в ответе. */
export function EvidenceLog({ sources, live }: { sources: NonNullable<RunState["sources"]>; live: boolean }) {
  return (
    <details open={live || undefined} className="group max-w-xl rounded-(--radius-md) border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-[13.5px] text-ink">
        <span className="flex items-center gap-2">
          Прочитанные источники <span className="font-mono text-[12px] text-violet">{sources.length}</span>
        </span>
        <span className="k-meta group-open:hidden">показать</span>
      </summary>
      <ol className="border-t border-line py-1.5">
        {sources.map((s, i) => (
          <li key={s.url} className="fx-reveal">
            <a href={webHref(s.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-1.5 text-[13px] text-ink2 hover:text-ink">
              <span className="w-5 font-mono text-[11px] text-violet">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1 truncate">{s.title}</span>
              <span className="font-mono text-[11px] text-ink3">{hostOf(s.url)}</span>
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** Итог работы агента: ответ ниже, здесь — что получено и во что это можно превратить. */
export function AgentSummary({ run, costMicro, onOpenArtifact, onSavePacket }: { run: RunState; costMicro: number; onOpenArtifact?: () => void; onSavePacket?: () => void }) {
  const sec = run.durationMs ? Math.round(run.durationMs / 1000) : 0;
  const facts = [
    sec > 0 ? (sec < 60 ? `${sec} с` : `${Math.floor(sec / 60)} мин ${sec % 60} с`) : null,
    formatCredits(costMicro),
    run.sources?.length ? plural(run.sources.length, ["источник", "источника", "источников"]) : null,
    run.tasks ? plural(run.tasks.length, ["шаг", "шага", "шагов"]) : null,
  ].filter(Boolean);
  return (
    <div className="fx-reveal flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-(--radius-md) border border-acc-line bg-acc-soft px-4 py-3">
      <span className="flex items-center gap-2.5">
        <span aria-hidden="true" className="k-seal grid size-[18px] place-items-center rounded-(--radius-xs) bg-acc text-acc-ink"><Check size={11} strokeWidth={2.5} /></span>
        <span className="text-[13.5px] text-ink">Готово</span>
        <span className="k-meta">{facts.join(" · ")}</span>
      </span>
      <span className="flex flex-wrap gap-1.5">
        {run.artifact && (
          <button type="button" onClick={onOpenArtifact} className="k-tool h-8 border border-line bg-g1 text-[12.5px] text-ink">
            Открыть «{run.artifact.title}» · {run.artifact.slides.length} слайдов
          </button>
        )}
        {onSavePacket && (
          <button type="button" onClick={onSavePacket} className="k-tool h-8 border border-line bg-g1 text-[12.5px] text-ink">
            Сохранить пакет исследования
          </button>
        )}
      </span>
    </div>
  );
}

/** Квитанция ответа: модель, цена, время и источники — только то, что реально вернул запуск. */
const secs = (ms: number) => `${(ms / 1000).toLocaleString("ru-RU", { maximumFractionDigits: ms < 10_000 ? 1 : 0 })} с`;

/**
 * К17 — хронометраж как таймлайн: очередь, размышление, поиск, печать.
 * Отрезки строятся только из отметок событий этого запуска; для истории отметок нет — полосы нет.
 */
function Chrono({ run }: { run: RunState }) {
  const { startedAt, routedAt, thinkingAt, searchAt, firstTokenAt, doneAt } = run;
  if (!startedAt || !doneAt || doneAt <= startedAt) return null;
  const marks = [
    { label: routedAt ? "очередь" : "ожидание", at: startedAt, cls: "bg-line2" },
    ...(routedAt ? [{ label: "ожидание", at: routedAt, cls: "bg-ink3/50" }] : []),
    ...(thinkingAt ? [{ label: "размышление", at: thinkingAt, cls: "bg-violet" }] : []),
    ...(searchAt ? [{ label: "поиск", at: searchAt, cls: "bg-signal" }] : []),
    ...(firstTokenAt ? [{ label: "печать", at: firstTokenAt, cls: "bg-acc" }] : []),
  ].sort((a, b) => a.at - b.at);
  const total = doneAt - startedAt;
  const segs = marks.map((mark, i) => ({ ...mark, to: marks[i + 1]?.at ?? doneAt })).filter((seg) => seg.to > seg.at);
  const label = segs.map((seg) => `${seg.label} ${secs(seg.to - seg.at)}`).join(" · ");
  return (
    <span role="img" aria-label={`Хронометраж: ${label}`} className="group/chrono relative inline-flex h-1.5 w-24 overflow-visible rounded-full bg-s2">
      {segs.map((seg) => (
        <i key={seg.label + seg.at} title={`${seg.label} · ${secs(seg.to - seg.at)}`} className={cn("h-full first:rounded-l-full last:rounded-r-full hover:brightness-125", seg.cls)} style={{ width: `${((seg.to - seg.at) / total) * 100}%` }} />
      ))}
      <span className="pointer-events-none absolute bottom-full left-0 mb-1.5 hidden w-max rounded-(--radius-sm) border border-line2 bg-g1 px-2 py-1 text-[11px] text-ink2 shadow-(--shadow-float) group-hover/chrono:block">{label}</span>
    </span>
  );
}

/** К18 — короткий код ответа: его достаточно назвать поддержке; ноль перечёркнут, клик копирует. */
function ObjectCode({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const hex = id.replace(/[^0-9a-f]/gi, "").slice(0, 8).toUpperCase();
  if (hex.length < 8) return null;
  const code = `MSG·${hex.slice(0, 4)}-${hex.slice(4)}`;
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }, () => undefined);
      }}
      aria-label={copied ? "Код ответа скопирован" : `Скопировать код ответа ${code}`}
      className="k-code cursor-pointer rounded-(--radius-xs) px-1 hover:bg-s2 hover:text-ink"
    >
      {copied ? "скопировано" : code}
    </button>
  );
}

export function RunReceipt({ run, costMicro, model, code }: { run?: RunState; costMicro: number; model?: string | null; code?: string }) {
  const sec = run?.durationMs ? Math.max(1, Math.round(run.durationMs / 1000)) : 0;
  const sources = run?.sources?.length ?? 0;
  return (
    <p className="k-meta flex flex-wrap items-center gap-x-2" aria-label="Квитанция ответа">
      {code && <ObjectCode id={code} />}
      <span>{model ? routeLabel(model) : "Автомаршрут"}</span>
      {costMicro > 0 && (
        <>
          <span aria-hidden="true">·</span>
          <span>{formatCredits(costMicro)}</span>
        </>
      )}
      {sec > 0 && (
        <>
          <span aria-hidden="true">·</span>
          <span>{sec} с</span>
          {run && <Chrono run={run} />}
        </>
      )}
      {sources > 0 && (
        <>
          <span aria-hidden="true">·</span>
          <span className="text-violet">{sources} источн.</span>
        </>
      )}
      {costMicro > 0 && (
        <Link href="/app/billing" className="ml-1 underline decoration-line2 underline-offset-4 hover:text-ink">
          История списаний
        </Link>
      )}
    </p>
  );
}

/** Что модель увидела во вложении — факты о файле без имитации «сканирования». */
export function FileScan({ name, labels }: { name: string; labels: string[] }) {
  return (
    <div className="flex max-w-md items-start gap-3 rounded-(--radius-md) border border-line px-3 py-2.5">
      <FileText size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ink3" />
      <div className="min-w-0">
        <p className="truncate text-[13px] text-ink">{name}</p>
        <p className="mt-1 flex flex-wrap gap-1.5">
          {labels.map((l) => (
            <span key={l} className="k-index rounded-(--radius-xs) border border-line px-1.5 py-1 text-ink2">
              {l}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
