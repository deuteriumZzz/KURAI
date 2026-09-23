"use client";

import type { AgentTask, RunState } from "@/lib/stream";
import { cn } from "@/lib/cn";
import { formatCredits } from "@/lib/format";
import { Decode } from "@/components/fx/decode";
import { Label, Scanline, Segments, SysLine } from "@/components/fx/primitives";

/** Уточнение агента — как выбор реплики в диалоге: клик или клавиша 1–3. */
export function AgentChoice({ ask, onAnswer }: { ask: NonNullable<RunState["ask"]>; onAnswer: (choice: number) => void }) {
  const answered = ask.choice !== undefined;
  return (
    <div role="group" aria-label={ask.question} className="flex max-w-xl flex-col gap-2">
      <SysLine tone="acc">агент уточняет</SysLine>
      <p className="text-[14.5px]">{ask.question}</p>
      {ask.options.map((o, i) => (
        <button
          key={o}
          type="button"
          disabled={answered}
          onClick={() => onAnswer(i)}
          aria-pressed={ask.choice === i}
          className={cn(
            "flex cursor-pointer items-center gap-3 border bg-g1 px-3 py-2.5 text-left text-[13.5px] transition-colors duration-(--dur-fast) disabled:cursor-default pointer-coarse:py-3",
            ask.choice === i ? "border-acc-line shadow-[inset_3px_0_0_var(--color-acc)]" : "border-line",
            !answered && "hover:border-acc-line hover:shadow-[inset_3px_0_0_var(--color-acc)]",
            answered && ask.choice !== i && "opacity-35",
          )}
        >
          <span className="border border-line2 bg-g2 px-1.5 font-mono text-[11px] text-ink2">{i + 1}</span>
          {o}
        </button>
      ))}
    </div>
  );
}

/** Журнал заданий агента: цели с отметками и общей шкалой. */
export function QuestLog({ tasks }: { tasks: AgentTask[] }) {
  const done = tasks.filter((t) => t.status === "done").length;
  return (
    <div className="flex max-w-xl flex-col gap-2.5 border border-line bg-g1 p-3">
      <ol className="flex flex-col gap-1.5 text-[13.5px]">
        {tasks.map((t, i) => (
          <li key={t.title} className={cn("flex items-baseline gap-3", t.status === "todo" ? "text-ink3" : t.status === "doing" ? "text-ink" : "text-ink2")}>
            <span className={cn("w-5 shrink-0 font-mono text-[11px]", t.status !== "todo" && "text-acc")}>
              {t.status === "done" ? "✓" : t.status === "doing" ? "▶" : String(i + 1).padStart(2, "0")}
            </span>
            {t.title}
            {t.progress && <span className="ml-auto font-mono text-[11px] text-ink3 tabular-nums">{t.progress}</span>}
          </li>
        ))}
      </ol>
      <Segments value={done / tasks.length} count={tasks.length * 3} label="Прогресс агента" />
    </div>
  );
}

const POS = [
  [48, 34], [272, 30], [30, 128], [258, 148], [126, 170], [292, 92], [92, 72],
] as const;

/** Сеть источников: реальные сайты узлами по мере чтения. Узлы кликабельны. */
export function SourceNet({ sources }: { sources: NonNullable<RunState["sources"]> }) {
  const cx = 160;
  const cy = 96;
  return (
    <figure className="flex max-w-xl flex-col gap-2 border border-line bg-g1 p-2">
      <svg viewBox="0 0 330 190" className="w-full" role="img" aria-label={`Источники: ${sources.map((s) => s.title).join(", ")}`}>
        {sources.map((s, i) => {
          const [x, y] = POS[i % POS.length] as readonly [number, number];
          return <line key={`l-${s.url}`} x1={cx} y1={cy} x2={x} y2={y} className="stroke-acc-line" strokeWidth={1} />;
        })}
        <rect x={cx - 6} y={cy - 6} width={12} height={12} className="fill-acc" />
        <text x={cx + 12} y={cy + 4} className="fill-ink2 font-mono text-[10px]">
          запрос
        </text>
        {sources.map((s, i) => {
          const [x, y] = POS[i % POS.length] as readonly [number, number];
          return (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">
              <rect x={x - 4} y={y - 4} width={8} height={8} className="fill-g3 stroke-acc" strokeWidth={1} />
              <text x={Math.min(x + 8, 262)} y={y + 3} className="fill-ink2 font-mono text-[10px] hover:fill-acc">
                {s.title}
              </text>
            </a>
          );
        })}
      </svg>
      <figcaption className="px-1">
        <Label>Источников {sources.length}</Label>
      </figcaption>
    </figure>
  );
}

/** Итог работы агента: за что заплачено и что получено. */
export function AgentSummary({ run, costMicro, onOpenArtifact }: { run: RunState; costMicro: number; onOpenArtifact?: () => void }) {
  const sec = run.durationMs ? Math.round(run.durationMs / 1000) : 0;
  return (
    <div className="fx-flicker-border flex max-w-xl flex-col gap-1.5 border border-acc-line bg-g2 p-3">
      <Decode text="● ГОТОВО" className="font-mono text-[11px] tracking-[0.14em] text-acc" />
      <SysLine prefix={null}>{`Время ${Math.floor(sec / 60)} мин ${sec % 60} с · стоимость ${formatCredits(costMicro)}`}</SysLine>
      {run.sources && <SysLine prefix={null}>{`Источников ${run.sources.length} · задач выполнено ${run.tasks?.length ?? 0}`}</SysLine>}
      {run.artifact && (
        <button type="button" onClick={onOpenArtifact} className="mt-1 w-max cursor-pointer border border-acc-line bg-acc-soft px-3 py-1.5 text-[13px] text-acc hover:bg-acc hover:text-acc-ink">
          Открыть «{run.artifact.title}» · {run.artifact.slides.length} слайдов
        </button>
      )}
    </div>
  );
}

/** Сканер вложения: скан-линия по «документу» и подписи того, что увидела модель. */
export function FileScan({ name, labels }: { name: string; labels: string[] }) {
  return (
    <div className="flex max-w-md flex-col gap-2">
      <SysLine>{`сканирую ${name}`}</SysLine>
      <div className="relative flex flex-col gap-1.5 overflow-hidden border border-line bg-g1 p-3">
        <Scanline active />
        {[62, 100, 86, 40].map((w, i) => (
          <i key={i} className="h-1.5 bg-g3" style={{ width: `${w}%` }} />
        ))}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {labels.map((l) => (
            <span key={l} className="border border-acc-line bg-bg/80 px-1.5 font-mono text-[10px] tracking-[0.1em] text-acc">
              <Decode text={l} duration={300} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
