import type { LedgerEntry } from "@/types/api";

export type SpendDay = { date: string; micro: number; models: { name: string; micro: number }[] };
const DAY = 86_400_000;
const spent = (e: LedgerEntry) => (e.kind === "charge" ? -e.amountMicro : e.kind === "refund" ? -e.amountMicro : 0);
const monthOf = (iso: string) => iso.slice(0, 7);

/** 49 — расходы по дням (UTC) за последние `days` дней: списания минус возвраты, с разбивкой по моделям. */
export function spendDays(entries: LedgerEntry[], now: number, days = 30): SpendDay[] {
  const start = Math.floor(now / DAY) * DAY - (days - 1) * DAY;
  const out = Array.from({ length: days }, (_, i) => ({ date: new Date(start + i * DAY).toISOString().slice(0, 10), micro: 0, models: new Map<string, number>() }));
  for (const e of entries) {
    const i = Math.floor((Date.parse(e.at) - start) / DAY);
    const day = out[i];
    const v = spent(e);
    if (!day || v === 0) continue;
    day.micro += v;
    const name = e.model ?? "прочее";
    day.models.set(name, (day.models.get(name) ?? 0) + v);
  }
  return out.map((d) => ({ date: d.date, micro: Math.max(0, d.micro), models: [...d.models].filter(([, m]) => m > 0).map(([name, micro]) => ({ name, micro })) }));
}

/** 111 — сколько потрачено в текущем календарном месяце (UTC). */
export function monthSpend(entries: LedgerEntry[], now: number): number {
  const month = new Date(now).toISOString().slice(0, 7);
  return Math.max(0, entries.filter((e) => monthOf(e.at) === month).reduce((n, e) => n + spent(e), 0));
}

/** 113 — квитанция месяца: модели по убыванию трат. */
export function monthReceipt(entries: LedgerEntry[], now: number): { model: string; micro: number; runs: number }[] {
  const month = new Date(now).toISOString().slice(0, 7);
  const by = new Map<string, { micro: number; runs: number }>();
  for (const e of entries) {
    if (monthOf(e.at) !== month || spent(e) === 0) continue;
    const key = e.model ?? "прочее";
    const row = by.get(key) ?? { micro: 0, runs: 0 };
    row.micro += spent(e);
    if (e.kind === "charge") row.runs++;
    by.set(key, row);
  }
  return [...by].map(([model, r]) => ({ model, ...r })).filter((r) => r.micro > 0).sort((a, b) => b.micro - a.micro);
}

/**
 * 112 — прогноз по похожим прошлым запускам: та же модель, иначе тот же режим.
 * Нижний и верхний квартиль, не меньше трёх точек — иначе прогноза нет.
 */
export function forecast(entries: LedgerEntry[], like: { model?: string; mode?: string }): { low: number; high: number; points: number[]; by: "model" | "mode" } | null {
  const charges = entries.filter((e) => e.kind === "charge");
  const byModel = like.model ? charges.filter((e) => e.model === like.model) : [];
  const by = byModel.length >= 3 ? "model" : "mode";
  const points = (by === "model" ? byModel : charges.filter((e) => like.mode && e.mode === like.mode)).map((e) => -e.amountMicro).sort((a, b) => a - b);
  if (points.length < 3) return null;
  const q = (p: number) => points[Math.min(points.length - 1, Math.floor(p * (points.length - 1)))]!;
  return { low: q(0.25), high: q(0.75), points, by };
}
