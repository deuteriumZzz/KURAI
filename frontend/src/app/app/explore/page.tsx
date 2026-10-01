import Link from "next/link";
import { TRENDS } from "@/mocks/trends";
import { ModeIcon } from "@/components/brand/mode-icons";
import { Label } from "@/components/fx/primitives";
import { PageTitle } from "@/components/fx/page-title";
import { cn } from "@/lib/cn";
import { formatCredits } from "@/lib/format";
import { modeById } from "@/lib/modes";
import { SavedRecipes } from "@/components/app/saved-recipes";
import type { Mode } from "@/types/api";

const CATS = ["Все", "Для бизнеса", "Для соцсетей", "Для учёбы", "Для себя"] as const;
const MEDIA = new Set<Mode>(["image", "video", "audio"]);
/** Ожидаемый результат рецепта по режиму — то, что человек получит, а не маркетинговое обещание. */
const OUTPUT: Record<Mode, string> = {
  text: "Текст в чате",
  image: "4 изображения",
  video: "Ролик до 8 секунд",
  audio: "Аудиофайл озвучки",
  research: "Отчёт с источниками",
  slides: "Презентация 8–10 слайдов",
};

/** Prompt Recipes are editable starting routes, not a gallery of immutable prompts. */
export default async function ExplorePage(props: PageProps<"/app/explore">) {
  const sp = await props.searchParams;
  const cat = CATS.find((c) => c === sp.cat) ?? "Все";
  const list = [...TRENDS].filter((t) => cat === "Все" || t.category === cat).sort((a, b) => b.uses - a.uses);

  return (
    <main className="kurai-recipes-page flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="kurai-recipes-page__header flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 pl-16 md:pl-6">
        <PageTitle title="Рабочие рецепты" />
        <Label>{TRENDS.length} стартовых маршрутов</Label>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6">
        <section>
          <p className="k-index mb-3">Рецепты · параметризованные сценарии</p>
          <p className="max-w-2xl text-[15px] leading-relaxed text-ink2">Рецепт открывает поле с готовой постановкой и режимом. Запрос можно изменить; перед запуском KURAI покажет модель и цену.</p>
        </section>
        <SavedRecipes />
        <nav aria-label="Категории рецептов" className="kurai-recipes-filters flex flex-wrap gap-1">
          {CATS.map((c) => (
            <Link
              key={c}
              href={c === "Все" ? "/app/explore" : `/app/explore?cat=${encodeURIComponent(c)}`}
              aria-current={c === cat ? "page" : undefined}
              className={cn("px-3 py-2 text-[13.5px]", c === cat ? "text-ink" : "text-ink3 hover:text-ink")}
            >
              {c}
            </Link>
          ))}
        </nav>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="text-[12.5px] text-ink3">
                <th scope="col" className="py-2.5 pr-3 font-normal">Рецепт</th>
                <th scope="col" className="w-40 px-3 py-2.5 font-normal">Режим</th>
                <th scope="col" className="w-48 px-3 py-2.5 font-normal">На выходе</th>
                <th scope="col" className="w-24 px-3 py-2.5 font-normal">Оценка</th>
                <th scope="col" className="w-32 py-2.5 pl-3 font-normal"><span className="fx-sr">Действие</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className="group border-t border-line transition-colors duration-(--dur-fast) hover:bg-s1">
                  <th scope="row" className="py-3.5 pr-3 text-left font-normal">
                    <span className="block text-[14.5px] text-ink">{t.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-ink3">{t.prompt}</span>
                  </th>
                  <td className="px-3 py-3.5">
                    <span className="inline-flex items-center gap-2 text-[13px] text-ink2">
                      <ModeIcon mode={t.mode} size={15} className={MEDIA.has(t.mode) ? "text-signal" : t.mode === "research" ? "text-violet" : "text-ink3"} />
                      {modeById(t.mode).label}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-[13px] text-ink2">{OUTPUT[t.mode]}</td>
                  <td className="px-3 py-3.5 font-mono text-[12.5px] text-ink2">{formatCredits(modeById(t.mode).costHintMicro, { approx: true })}</td>
                  <td className="py-3.5 pl-3 text-right">
                    <Link href={`/app?mode=${t.mode}&prompt=${encodeURIComponent(t.prompt)}`} className="k-tool h-8 border border-line text-[12.5px] text-ink">
                      Использовать
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
