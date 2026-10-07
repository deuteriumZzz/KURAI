"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Mode } from "@/types/api";
import { MOCK_NOW } from "@/mocks/data";
import { kuraiApi } from "@/lib/kurai-api";
import { balanceStore, chatsStore } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { formatWhen } from "@/lib/format";
import { Composer } from "./composer";
import { usePrefs } from "@/lib/use-prefs";
import { writePrefs } from "@/lib/prefs";
import { DrawnCheck } from "@/components/ui/action-button";

const FIRST_STEPS = [
  { id: "text", label: "Задать первый вопрос" },
  { id: "project", label: "Собрать чаты в проект" },
  { id: "share", label: "Поделиться задачей по ссылке" },
] as const;

/** 86 — чек-лист первых шагов: галочки прорисовываются, кольцо заполняется по реальным действиям. */
export function FirstSteps() {
  const prefs = usePrefs();
  const done = FIRST_STEPS.filter((s) => prefs.steps.includes(s.id)).length;
  if (prefs.checklistHidden || done === FIRST_STEPS.length) return null;
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <section aria-label="Первые шаги" className="flex flex-wrap items-center gap-5 rounded-(--radius-md) border border-line bg-g1 px-4 py-3">
      <span className="relative grid size-10 shrink-0 place-items-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-line2)" strokeWidth="2" />
          <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-acc)" strokeWidth="2" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - done / FIRST_STEPS.length)} className="transition-[stroke-dashoffset] duration-700 ease-(--ease-out)" />
        </svg>
        <span className="font-mono text-[11px] text-ink2 tabular-nums">{done}/{FIRST_STEPS.length}</span>
      </span>
      <ol className="flex flex-1 flex-wrap gap-x-5 gap-y-1.5">
        {FIRST_STEPS.map((s) => {
          const ok = prefs.steps.includes(s.id);
          return (
            <li key={s.id} className={ok ? "flex items-center gap-2 text-[13px] text-ink3 line-through decoration-line2" : "flex items-center gap-2 text-[13px] text-ink2"}>
              <span className={ok ? "grid size-4 place-items-center rounded-[4px] bg-acc text-acc-ink" : "size-4 rounded-[4px] border border-line2"}>{ok && <DrawnCheck size={11} />}</span>
              {s.label}
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={() => writePrefs({ checklistHidden: true })} className="k-tool h-7 text-[12px] text-ink3">Скрыть</button>
    </section>
  );
}

export function HomeComposer({ mode, model, compare, prompt }: { mode?: Mode; model?: string; compare?: string[]; prompt?: string }) {
  // баланс ещё не пришёл — не блокируем отправку выдуманным нулём
  const balanceMicro = useStore(balanceStore)?.micro ?? Infinity;

  return <Composer key={`${mode}:${model}:${compare?.join(",")}:${prompt}`} variant="home" initialMode={mode} initialValue={prompt} initialModel={model} initialCompareModels={compare} balanceMicro={balanceMicro} />;
}

/** Недавняя работа — подчинённый модуль под полем: три последних задачи из реальной истории. */
export function RecentWork() {
  const chats = useStore(chatsStore);
  const recent = [...chats].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 3);
  const now = kuraiApi ? new Date() : MOCK_NOW;
  if (recent.length === 0) return null;
  return (
    <ul className="flex flex-col">
      {recent.map((c) => (
        <li key={c.id}>
          <Link href={`/app/c/${c.id}`} className="group flex items-center justify-between gap-4 border-t border-line py-3 text-left">
            <span className="min-w-0">
              <span className="block truncate text-[14px] text-ink2 group-hover:text-ink">{c.title}</span>
              <span className="block text-[12px] text-ink3">{formatWhen(c.updatedAt, now)}</span>
            </span>
            <ArrowUpRight size={15} strokeWidth={1.5} className="shrink-0 text-ink3 transition-transform duration-(--dur-fast) group-hover:translate-x-0.5 group-hover:text-ink" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
