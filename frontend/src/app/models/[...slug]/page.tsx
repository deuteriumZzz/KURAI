import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { ModelGlyph, glyphKind } from "@/components/brand/model-glyph";
import { formatCredits } from "@/lib/format";
import { publicModels } from "@/lib/public-catalog";

type Props = PageProps<"/models/[...slug]">;

/** id каталога содержит «/» (anthropic/claude-…), поэтому страница ловит путь целиком. */
async function modelFor(slug: string[]) {
  const id = slug.map(decodeURIComponent).join("/");
  return (await publicModels())?.find((m) => m.id === id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const model = await modelFor((await params).slug);
  return model ? { title: `${model.name} в KURAI`, description: model.note } : {};
}

export default async function ModelPage({ params }: Props) {
  const model = await modelFor((await params).slug);
  if (!model) notFound();
  const category = model.modes.map((mode) => ({ text: "текст", image: "изображения", video: "видео", audio: "аудио", research: "исследования", slides: "слайды" })[mode]).join(", ");

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
        <Link href="/models" className="inline-flex min-h-11 w-max items-center text-[13px] text-ink2 hover:text-ink">Все модели</Link>
        <article className="flex flex-col gap-7">
          <div className="flex flex-col gap-4">
            <ModelGlyph id={model.id} kind={glyphKind(model.group)} size={40} />
            <p className="k-index">{model.provider}</p>
            <h1 className="k-display text-[clamp(3rem,8vw,5.5rem)] text-ink">{model.name}</h1>
          </div>
          <p className="max-w-[62ch] text-[16px] leading-relaxed text-ink2">{model.note}</p>
          <dl className="grid border-y border-line sm:grid-cols-3">
            <div className="py-4 sm:pr-4"><dt className="text-[12.5px] text-ink3">Ориентировочная цена</dt><dd className="k-code mt-1 text-[16px] text-ink">{model.priceKnown ? formatCredits(model.priceHintMicro, { approx: true }) : "появится после обновления каталога"}</dd></div>
            <div className="border-line py-4 sm:border-l sm:px-4"><dt className="text-[12.5px] text-ink3">Контекст</dt><dd className="k-code mt-1 text-[16px] text-ink">{model.contextK === 0 ? "не применяется" : `${model.contextK >= 1000 ? `${model.contextK / 1000}M` : `${model.contextK}K`} токенов`}</dd></div>
            <div className="border-line py-4 sm:border-l sm:pl-4"><dt className="text-[12.5px] text-ink3">Подходит для</dt><dd className="mt-1 text-[14px] text-ink">{category}</dd></div>
          </dl>
          <p className="text-[13px] text-ink3">Точная цена показывается перед каждым запуском и фиксируется в квитанции ответа.</p>
          <Link href={`/app?mode=${model.modes[0]}&model=${encodeURIComponent(model.id)}`} className="fx-chamfer fx-sheen inline-flex h-11 w-max items-center rounded-(--radius-sm) bg-acc px-4 text-[13.5px] font-semibold text-acc-ink [--ch:var(--chamfer-sm)]">Попробовать в KURAI</Link>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
