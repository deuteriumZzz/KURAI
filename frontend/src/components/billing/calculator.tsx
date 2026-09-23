"use client";

import { useId, useState } from "react";
import { bestPlan, estimateMicro, PLANS, type Usage } from "@/lib/pricing";
import { formatCredits } from "@/lib/format";
import { Label, SysLine } from "@/components/fx/primitives";

const ROWS: { key: keyof Usage; label: string; max: number; step: number; unit: string }[] = [
  { key: "texts", label: "Текстовых запросов", max: 1000, step: 10, unit: "≈ 2 кр" },
  { key: "images", label: "Изображений", max: 500, step: 5, unit: "≈ 4 кр" },
  { key: "videos", label: "Видео по 8 с", max: 40, step: 1, unit: "≈ 120 кр" },
];

/** Калькулятор «сколько это стоит в месяц»: подбирает самый дешёвый вариант тарифа с докупкой. */
export function Calculator() {
  const id = useId();
  const [u, setU] = useState<Usage>({ texts: 300, images: 60, videos: 2 });
  const need = estimateMicro(u);
  const best = bestPlan(u);
  const plan = PLANS.find((p) => p.id === best.plan);

  return (
    <div className="grid gap-6 border border-line bg-g1 p-5 md:grid-cols-[1.2fr_0.8fr] md:p-6">
      <div className="flex flex-col gap-5">
        {ROWS.map((r) => (
          <div key={r.key} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <label htmlFor={`${id}-${r.key}`} className="text-ink2">
                {r.label} в месяц <span className="text-ink3">· {r.unit}</span>
              </label>
              <span className="font-mono text-ink tabular-nums">{u[r.key]}</span>
            </div>
            <input
              id={`${id}-${r.key}`}
              type="range"
              min={0}
              max={r.max}
              step={r.step}
              value={u[r.key]}
              onChange={(e) => setU((s) => ({ ...s, [r.key]: Number(e.target.value) }))}
              className="h-6 w-full cursor-pointer accent-(--color-acc)"
            />
          </div>
        ))}
      </div>
      <div className="flex flex-col justify-between gap-4 border-t border-line pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6">
        <div className="flex flex-col gap-1.5">
          <Label>Нужно кредитов</Label>
          <p className="font-mono text-2xl tabular-nums">{formatCredits(need)}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-acc">Выгоднее всего</Label>
          <p className="font-display text-3xl font-light tabular-nums">{best.totalRub.toLocaleString("ru-RU")} ₽ / мес</p>
          <SysLine tone="acc">{`${plan?.name ?? ""}${best.topUpRub > 0 ? ` + докупка ${best.topUpRub.toLocaleString("ru-RU")} кр` : ""}`}</SysLine>
        </div>
        <p className="text-[12px] text-ink3">Оценка по средней цене запроса. Точная цена видна в поле ввода перед каждой отправкой.</p>
      </div>
    </div>
  );
}
