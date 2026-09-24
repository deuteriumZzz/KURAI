import Link from "next/link";
import { MODELS, type ModelInfo } from "@/lib/models";
import { Label, Segments } from "@/components/fx/primitives";
import { PageTitle } from "@/components/fx/page-title";
import { Appear } from "@/components/fx/motion";
import { formatCredits } from "@/lib/format";
import { cn } from "@/lib/cn";

const TYPES = [
  { id: "all", label: "Все" },
  { id: "text", label: "Текст" },
  { id: "image", label: "Изображения" },
  { id: "video", label: "Видео" },
  { id: "audio", label: "Голос" },
] as const;

const STATS: { key: keyof ModelInfo["stats"]; label: string }[] = [
  { key: "quality", label: "Качество" },
  { key: "speed", label: "Скорость" },
  { key: "value", label: "Выгода" },
];

/** «Все модели» — каталог как у Kimi: вкладки по типу, карточка с ценой и «лучше для». */
export default async function ModelsPage(props: PageProps<"/app/models">) {
  const sp = await props.searchParams;
  const type = TYPES.find((t) => t.id === sp.type)?.id ?? "all";
  const list = MODELS.filter((m) => type === "all" || m.modes.includes(type));

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-4 pl-16 md:pl-6">
        <PageTitle title="Все модели" code="SEC-07 // MODELS" />
        <Label>{MODELS.length} в каталоге · 300+ через OpenRouter</Label>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6">
        <nav aria-label="Тип модели" className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <Link
              key={t.id}
              href={t.id === "all" ? "/app/models" : `/app/models?type=${t.id}`}
              aria-current={t.id === type ? "page" : undefined}
              className={cn(
                "rounded-(--radius-field) px-3 py-1.5 text-[13px]",
                t.id === type
                  ? "bg-s3 text-ink"
                  : "text-ink2 hover:bg-s1 hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m, i) => (
            <li key={m.id}>
              <Appear index={i} className="h-full">
                <article className="flex h-full flex-col gap-3 rounded-(--radius-field) bg-s1 p-4">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center bg-s3 font-mono text-[14px] text-ink"
                    >
                      {m.emblem}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-[15px] text-ink">
                        {m.name}
                      </h2>
                      <Label>
                        {m.provider}
                        {m.contextK > 0 &&
                          ` · ${m.contextK >= 1000 ? `${m.contextK / 1000}M` : `${m.contextK}K`} контекст`}
                      </Label>
                    </div>
                    <span className="ml-auto shrink-0 font-mono text-[12.5px] text-ink2 tabular-nums">
                      ≈ {formatCredits(m.priceHintMicro)}
                    </span>
                  </div>
                  <p className="text-[13.5px] leading-snug text-ink2">
                    {m.note}
                  </p>
                  <dl className="grid gap-1.5">
                    {STATS.map((s) => (
                      <div
                        key={s.key}
                        className="grid grid-cols-[72px_1fr] items-center gap-2"
                      >
                        <dt className="text-[12px] text-ink3">{s.label}</dt>
                        <dd>
                          <Segments
                            value={m.stats[s.key] / 10}
                            label={`${s.label}: ${m.stats[s.key]} из 10`}
                          />
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Link
                    href={`/app?mode=${m.modes[0]}&model=${m.id}`}
                    className="mt-auto self-start rounded-(--radius-field) bg-s2 px-3 py-1.5 text-[13px] text-ink hover:bg-s3"
                  >
                    Попробовать
                  </Link>
                </article>
              </Appear>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
