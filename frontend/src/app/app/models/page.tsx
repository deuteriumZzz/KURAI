import Link from "next/link";
import { ModelCatalog, type CatalogFilter } from "@/components/app/model-catalog";
import { Label } from "@/components/fx/primitives";
import { PageTitle } from "@/components/fx/page-title";
import { cn } from "@/lib/cn";

const TYPES: { id: CatalogFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "text", label: "Текст" },
  { id: "image", label: "Изображения" },
  { id: "video", label: "Видео" },
  { id: "audio", label: "Голос" },
];

/** Catalog page keeps selection lightweight while the client substitutes the real OpenRouter registry when connected. */
export default async function ModelsPage(props: PageProps<"/app/models">) {
  const searchParams = await props.searchParams;
  const filter = TYPES.find((item) => item.id === searchParams.type)?.id ?? "all";
  return (
    <main className="kurai-registry-page flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="kurai-registry-page__header flex h-14 shrink-0 items-center justify-between gap-3 px-4 pl-16 md:pl-6">
        <PageTitle title="Все модели" />
        <Label>каталог</Label>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="k-index mb-3">Реестр маршрутов</p>
            <p className="max-w-2xl text-[15px] leading-relaxed text-ink2">Выберите модель для поля ввода или сравните до трёх на одном запросе. «Авто» подбирает модель сам; в каждом ответе видно, какая отвечала.</p>
          </div>
          <Link href="/app" className="k-tool border border-line text-ink">Открыть рабочее поле</Link>
        </section>
        <nav aria-label="Тип модели" className="kurai-registry-filters flex flex-wrap gap-1">
          {TYPES.map((item) => (
            <Link key={item.id} href={item.id === "all" ? "/app/models" : `/app/models?type=${item.id}`} aria-current={item.id === filter ? "page" : undefined} className={cn("px-3 py-2 text-[13.5px]", item.id === filter ? "text-ink" : "text-ink3 hover:text-ink")}>{item.label}</Link>
          ))}
        </nav>
        <ModelCatalog filter={filter} />
      </div>
    </main>
  );
}
