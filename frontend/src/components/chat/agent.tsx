"use client";

import Link from "next/link";
import { Check, FileText, Square } from "lucide-react";
import type { AgentTask, RunState } from "@/lib/stream";
import { cn } from "@/lib/cn";
import { formatCredits, hostOf, webHref } from "@/lib/format";


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
      <ol className="flex flex-col py-1.5">
        {tasks.map((t, i) => (
          <li key={t.title} aria-current={t.status === "doing" ? "step" : undefined} className={cn("flex items-center gap-3 px-4 py-2 text-[13.5px]", t.status === "todo" ? "text-ink3" : t.status === "doing" ? "text-ink" : "text-ink2")}>
            <span
              aria-hidden="true"
              className={cn(
                "grid size-[18px] shrink-0 place-items-center rounded-(--radius-xs) border font-mono text-[10px]",
                t.status === "done" && "k-seal border-acc bg-acc text-acc-ink",
                t.status === "doing" && cn("border-acc-line text-acc", live && "k-live"),
                t.status === "todo" && "border-line text-ink3",
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
    sec > 0 ? `${Math.floor(sec / 60)} мин ${sec % 60} с` : null,
    formatCredits(costMicro),
    run.sources?.length ? `${run.sources.length} источников` : null,
    run.tasks ? `${run.tasks.length} шагов` : null,
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
export function RunReceipt({ run, costMicro, model }: { run?: RunState; costMicro: number; model?: string | null }) {
  const sec = run?.durationMs ? Math.max(1, Math.round(run.durationMs / 1000)) : 0;
  const sources = run?.sources?.length ?? 0;
  return (
    <p className="k-meta flex flex-wrap items-center gap-x-2" aria-label="Квитанция ответа">
      <span>{model ?? "Автомаршрут"}</span>
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
