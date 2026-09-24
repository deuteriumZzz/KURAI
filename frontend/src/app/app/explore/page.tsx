import Link from "next/link";
import { TRENDS } from "@/mocks/trends";
import { Art } from "@/components/app/inspiration";
import { Appear } from "@/components/fx/motion";
import { Label } from "@/components/fx/primitives";
import { PageTitle } from "@/components/fx/page-title";
import { cn } from "@/lib/cn";

const CATS = ["Все", "Для бизнеса", "Для соцсетей", "Для учёбы", "Для себя"] as const;

/** Тренды и шаблоны: «до / после», популярность, повтор в один клик (как тренды Syntx). */
export default async function ExplorePage(props: PageProps<"/app/explore">) {
  const sp = await props.searchParams;
  const cat = CATS.find((c) => c === sp.cat) ?? "Все";
  const list = [...TRENDS].filter((t) => cat === "Все" || t.category === cat).sort((a, b) => b.uses - a.uses);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 pl-16 md:pl-6">
        <PageTitle title="Тренды и шаблоны" code="SEC-06 // TRENDS" />
        <Label>{TRENDS.length} шаблонов</Label>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6">
        <nav aria-label="Категории" className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <Link
              key={c}
              href={c === "Все" ? "/app/explore" : `/app/explore?cat=${encodeURIComponent(c)}`}
              aria-current={c === cat ? "page" : undefined}
              className={cn("border px-3 py-1.5 text-[13px]", c === cat ? "border-acc-line bg-acc-soft text-acc" : "border-line text-ink2 hover:text-ink")}
            >
              {c}
            </Link>
          ))}
        </nav>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {list.map((t, i) => (
            <Appear key={t.id} index={i}>
              <Link href={`/app?mode=${t.mode}&prompt=${encodeURIComponent(t.prompt)}`} className="fx-hover group flex h-full flex-col border border-line bg-g1 hover:border-line2">
                <span className="relative grid aspect-[4/3] grid-cols-2 overflow-hidden border-b border-line">
                  <span className="relative overflow-hidden border-r border-line grayscale">
                    <Art kind={t.art} seed={i * 3} />
                    <Label className="absolute bottom-1.5 left-1.5 bg-bg/80 px-1">до</Label>
                  </span>
                  <span className="relative overflow-hidden transition-transform duration-(--dur-slow) group-hover:scale-[1.04]">
                    <Art kind={t.art} seed={i * 3 + 1} />
                    <Label className="absolute right-1.5 bottom-1.5 bg-bg/80 px-1 text-acc">после</Label>
                  </span>
                  {i < 3 && <Label className="absolute top-1.5 left-1.5 bg-acc px-1.5 text-acc-ink">ТОП {i + 1}</Label>}
                </span>
                <span className="flex flex-1 flex-col gap-1 p-3">
                  <span className="text-[13.5px] leading-snug">{t.title}</span>
                  <span className="mt-auto flex items-center justify-between gap-2">
                    <Label>{t.tag}</Label>
                    <span className="font-mono text-[11px] text-ink3 tabular-nums">{t.uses.toLocaleString("ru-RU")} повторов</span>
                  </span>
                </span>
              </Link>
            </Appear>
          ))}
        </div>
      </div>
    </main>
  );
}
