import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { ModelGlyph, glyphKind } from "@/components/brand/model-glyph";
import { formatCredits } from "@/lib/format";
import { MODELS } from "@/lib/models";

export const metadata: Metadata = {
  title: "Модели KURAI - текст, изображения, видео и голос",
  description: "Каталог моделей KURAI: назначение, контекст и ориентировочная цена каждого запроса.",
};

const MODE_LABEL = { text: "текст", image: "изображения", video: "видео", audio: "аудио", research: "исследования", slides: "слайды" } as const;
const ctx = (k: number) => (k <= 0 ? "—" : k >= 1000 ? `${k / 1000}M` : `${k}K`);

/** Публичный каталог: только факты о модели — назначение, контекст, режимы, ориентир цены. Без выдуманных оценок. */
export default function PublicModelsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="k-index">Каталог моделей</p>
          <h1 className="k-display text-[clamp(3rem,7vw,5.5rem)] text-ink">Модель под задачу</h1>
          <p className="max-w-[60ch] text-[15.5px] leading-relaxed text-ink2">Назначение, контекст и ориентировочная цена запроса. В рабочем поле можно оставить выбор на «Авто» — модель и цена всегда видны до запуска.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="text-[12.5px] text-ink3">
                <th scope="col" className="py-2.5 pr-3 font-normal">Модель</th>
                <th scope="col" className="px-3 py-2.5 font-normal">Для каких задач</th>
                <th scope="col" className="w-24 px-3 py-2.5 font-normal">Контекст</th>
                <th scope="col" className="w-44 px-3 py-2.5 font-normal">Режимы</th>
                <th scope="col" className="w-24 py-2.5 pl-3 font-normal">Цена</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map((model) => (
                <tr key={model.id} className="border-t border-line transition-colors duration-(--dur-fast) hover:bg-s1">
                  <th scope="row" className="py-3.5 pr-3 text-left font-normal">
                    <Link href={`/models/${model.id}`} className="flex items-center gap-3">
                      <ModelGlyph id={model.id} kind={glyphKind(model.group)} size={22} />
                      <span>
                        <span className="block text-[14.5px] text-ink underline-offset-4 hover:underline">{model.name}</span>
                        <span className="block text-[12px] text-ink3">{model.provider}</span>
                      </span>
                    </Link>
                  </th>
                  <td className="px-3 py-3.5 text-[13.5px] leading-snug text-ink2">{model.note}</td>
                  <td className="px-3 py-3.5 font-mono text-[12.5px] text-ink2">{ctx(model.contextK)}</td>
                  <td className="px-3 py-3.5 text-[13px] text-ink2">{model.modes.map((m) => MODE_LABEL[m]).join(", ")}</td>
                  <td className="py-3.5 pl-3 font-mono text-[12.5px] text-ink2">{formatCredits(model.priceHintMicro, { approx: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[12.5px] text-ink3">Цена — ориентир для типового запроса; точная сумма показывается перед каждым запуском и фиксируется в квитанции ответа.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
