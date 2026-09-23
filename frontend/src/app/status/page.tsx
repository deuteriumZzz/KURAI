import type { Metadata } from "next";
import { DocPage } from "@/components/site/doc-page";
import { StatusBar } from "@/components/app/status-bar";
import { Label, Segments } from "@/components/fx/primitives";
import { cn } from "@/lib/cn";
import { MOCK_STATUS } from "@/mocks/data";

export const metadata: Metadata = { title: "Статус KURAI", description: "Доступность моделей и сервисов KURAI в реальном времени." };

const SERVICES = [
  { name: "Чат и текстовые модели", state: "ok", uptime: 0.9997 },
  { name: "Изображения", state: "ok", uptime: 0.9991 },
  { name: "Видео", state: "degraded", uptime: 0.9912 },
  { name: "Озвучка и распознавание", state: "ok", uptime: 0.9989 },
  { name: "Оплата (ЮKassa)", state: "ok", uptime: 0.9999 },
] as const;

const STATE = { ok: ["text-ok", "работает"], degraded: ["text-warn", "медленнее обычного"], down: ["text-err", "сбой"] } as const;

export default function StatusPage() {
  return (
    <DocPage eyebrow="Статус" title="Все системы работают" lead="Если модель не отвечает, запросы автоматически уходят на резервные, а кредиты за сбой возвращаются.">
      <StatusBar status={MOCK_STATUS} className="justify-start" />
      <ul className="flex flex-col gap-px border border-line bg-line">
        {SERVICES.map((s) => (
          <li key={s.name} className="flex flex-col gap-2 bg-g1 px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[14px]">{s.name}</span>
              <span className={cn("font-mono text-[12px]", STATE[s.state][0])}>● {STATE[s.state][1]}</span>
            </div>
            <Segments value={s.uptime} count={30} tone={s.state === "ok" ? "acc" : "warn"} label={`${s.name}: доступность`} />
            <Label className="tracking-[0.04em] normal-case">доступность за 30 дней · {(s.uptime * 100).toFixed(2).replace(".", ",")}%</Label>
          </li>
        ))}
      </ul>
    </DocPage>
  );
}
