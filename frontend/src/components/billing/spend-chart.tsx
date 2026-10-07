"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { formatCredits } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Label } from "@/components/fx/primitives";

type Day = { date: string; micro: number; models: { name: string; micro: number }[] };

const SEG = 10; // делений в самом высоком столбике шкалы
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });

/** Чистая «круглая» верхняя граница шкалы: 50, 100, 150, 200… кредитов. */
function niceMax(maxCredits: number): number {
  const step = maxCredits > 150 ? 50 : 25;
  return Math.max(step, Math.ceil(maxCredits / step) * step);
}

/**
 * Расходы по дням: одна серия (название в заголовке, легенда не нужна), столбики из делений,
 * одна шкала, подсказка по наведению и фокусу, таблица для скринридеров и по кнопке.
 */
export function SpendChart({ days }: { days: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const top = niceMax(Math.max(...days.map((d) => d.micro / 10_000)));
  const total = days.reduce((s, d) => s + d.micro, 0);
  const cur = active !== null ? days[active] : null;

  return (
    <section aria-labelledby="spend-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="spend-title" className="text-[15px] font-semibold">
          Расходы по дням · 30 дней
        </h2>
        <div className="flex items-center gap-3">
          <Label className="tabular-nums">всего {formatCredits(total)}</Label>
          <button type="button" onClick={() => setTable((t) => !t)} aria-pressed={table} className="min-h-6 cursor-pointer text-[12.5px] text-ink2 underline-offset-2 hover:text-ink hover:underline pointer-coarse:min-h-11">
            {table ? "График" : "Таблица"}
          </button>
        </div>
      </div>

      {table ? (
        <div className="max-h-72 overflow-auto border border-line">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line bg-g1 text-left font-mono text-[11px] tracking-[0.1em] text-ink3 uppercase">
                <th className="px-3 py-2 font-medium">День</th>
                <th className="px-3 py-2 text-right font-medium">Кредиты</th>
                <th className="px-3 py-2 font-medium">Модели</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-b border-line last:border-b-0">
                  <td className="px-3 py-2 font-mono text-[12px] text-ink2">{fmtDay(d.date)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCredits(d.micro, { unit: false })}</td>
                  <td className="px-3 py-2 text-ink2">{d.models.map((m) => m.name).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative border border-line bg-g1 p-3 pt-4">
          {/* подсказка над графиком — не перекрывает столбики */}
          <div className="mb-2 flex h-10 items-start justify-between gap-3" aria-live="polite">
            {cur ? (
              <div className="flex flex-col">
                <span className="font-mono text-[12px] text-ink">
                  {fmtDay(cur.date)} · <span className="tabular-nums">{formatCredits(cur.micro)}</span>
                </span>
                <span className="text-[12px] text-ink3">{cur.models.map((m) => `${m.name} ${formatCredits(m.micro, { unit: false })}`).join(" · ")}</span>
              </div>
            ) : (
              <span className="text-[12px] text-ink3">Наведите на день, чтобы увидеть модели</span>
            )}
          </div>
          <div className="grid grid-cols-[36px_1fr] gap-2">
            {/* ось Y: три чистые отметки на той же шкале */}
            <div aria-hidden="true" className="relative h-40 font-mono text-[10px] text-ink3">
              {[1, 0.5, 0].map((k) => (
                <span key={k} className="absolute right-0 -translate-y-1/2 tabular-nums" style={{ top: `${(1 - k) * 100}%` }}>
                  {Math.round(top * k)}
                </span>
              ))}
            </div>
            <div className="relative h-40">
              {[0, 0.5, 1].map((k) => (
                <span key={k} aria-hidden="true" className="absolute inset-x-0 h-px bg-line" style={{ top: `${k * 100}%` }} />
              ))}
              <div role="list" aria-label="Расходы по дням" className="absolute inset-0 flex items-end gap-0.5">
                {days.map((d, i) => {
                  const credits = d.micro / 10_000;
                  const on = Math.round((credits / top) * SEG);
                  return (
                    <motion.button
                      key={d.date}
                      type="button"
                      role="listitem"
                      // 49 — столбцы поднимаются от нуля лёгкой волной, когда график попал в экран; один раз
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
                      transition={{ delay: i * 0.018, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                      style={{ originY: 1 }}
                      aria-label={`${fmtDay(d.date)}: ${formatCredits(d.micro)}`}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                      onBlur={() => setActive(null)}
                      className="group flex h-full min-w-0 flex-1 cursor-default flex-col-reverse items-center gap-0.5 outline-none"
                    >
                      {Array.from({ length: on }, (_, s) => (
                        <i
                          key={s}
                          className={cn(
                            "block w-full max-w-6 shrink-0 transition-colors duration-(--dur-fast)",
                            active === i ? "bg-acc" : "bg-ink3/45",
                          )}
                          style={{ height: `calc(${100 / SEG}% - 2px)` }}
                        />
                      ))}
                      {on === 0 && <i className="block h-px w-full max-w-6 bg-line2" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>
            <span />
            <div aria-hidden="true" className="flex justify-between font-mono text-[10px] text-ink3">
              {days.filter((_, i) => i % 7 === 0 || i === days.length - 1).map((d) => (
                <span key={d.date}>{fmtDay(d.date)}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
