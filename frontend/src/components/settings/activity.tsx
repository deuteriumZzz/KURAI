import { Label } from "@/components/fx/primitives";

const LEVELS = ["bg-line", "bg-acc/25", "bg-acc/50", "bg-acc/75", "bg-acc"] as const;
const level = (n: number) => (n === 0 ? 0 : n < 4 ? 1 : n < 8 ? 2 : n < 13 ? 3 : 4);

/** Карта активности за 12 недель: одна шкала (один оттенок, светлее → ярче), квадраты-деления. */
export function Activity({ days }: { days: { date: string; count: number }[] }) {
  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const total = days.reduce((s, d) => s + d.count, 0);
  const best = days.reduce((a, b) => (b.count > a.count ? b : a), days[0] ?? { date: "", count: 0 });
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <figure className="flex flex-col gap-3 border border-line bg-g1 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <figcaption className="text-[14px]">Активность · 12 недель</figcaption>
        <Label className="tabular-nums">{total.toLocaleString("ru-RU")} запросов</Label>
      </div>
      <div className="flex gap-[3px] overflow-x-auto" aria-hidden="true">
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {w.map((d) => (
              <i key={d.date} title={`${fmt(d.date)}: ${d.count} запросов`} className={`block size-3 ${LEVELS[level(d.count)]}`} />
            ))}
          </div>
        ))}
      </div>
      <p className="fx-sr">
        Всего {total} запросов за 12 недель. Самый активный день — {fmt(best.date)}: {best.count}.
      </p>
      <div className="flex items-center gap-1.5 text-[11px] text-ink3" aria-hidden="true">
        меньше
        {LEVELS.map((c) => (
          <i key={c} className={`block size-3 ${c}`} />
        ))}
        больше
        <span className="ml-auto">пик: {fmt(best.date)} · {best.count}</span>
      </div>
    </figure>
  );
}
