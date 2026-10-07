import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FirstSteps, HomeComposer, RecentWork } from "@/components/app/home-composer";
import { WorkspaceSignal } from "@/components/app/workspace-signal";
import { SavedRecipes } from "@/components/app/saved-recipes";
import { SignalField } from "@/components/app/signal-field";
import { Decode } from "@/components/fx/decode";
import { MODES } from "@/lib/modes";
import type { Mode } from "@/types/api";

/** Быстрый старт — текстовые маршруты, а не галерея карточек: каждый открывает поле с готовой постановкой. */
const STARTS: { mode: Mode; title: string; hint: string; prompt: string }[] = [
  { mode: "research", title: "Исследовать рынок", hint: "Deep Research · источники", prompt: "Собери позиционирование трёх конкурентов в моём сегменте: ключевые сообщения, аудитория, сильные и слабые стороны. В конце — возможности для отличия." },
  { mode: "text", title: "Разобрать документ", hint: "Текст · файл", prompt: "Разбери приложенный документ: главные тезисы, риски, сроки и обязательства сторон." },
  { mode: "image", title: "Сделать визуал", hint: "Изображение · 4 варианта", prompt: "Обложка для статьи о технологиях: тёмный графит, одна яркая лаймовая линия, много воздуха." },
  { mode: "slides", title: "Собрать презентацию", hint: "Слайды · 8–10", prompt: "Презентация на 8 слайдов: проблема, решение, рынок, продукт, модель денег, план." },
];

/** Command Deck: одна главная задача — описать работу. Недавнее и быстрый старт подчинены полю ввода. */
export default async function AppHome(props: PageProps<"/app">) {
  const sp = await props.searchParams;
  const mode = MODES.find((m) => m.id === sp.mode)?.id as Mode | undefined;
  const model = typeof sp.model === "string" ? sp.model : undefined;
  const compare = typeof sp.compare === "string" ? sp.compare.split(",").filter(Boolean).slice(0, 3) : [];
  const prompt = typeof sp.prompt === "string" ? sp.prompt.slice(0, 2000) : "";
  return (
    <main className="relative flex flex-1 flex-col overflow-y-auto">
      <SignalField />
      <div className="relative mx-auto flex w-full max-w-[60rem] flex-col px-4 pt-[clamp(4.5rem,14vh,9rem)] pb-16 md:px-8">
        <header className="mb-8">
          <p className="k-index mb-5">K/00 · Новая задача</p>
          {/* К2 — заголовок собирается из кодов один раз за полсекунды */}
          <h1 className="k-display text-[clamp(3.1rem,7.2vw,6rem)] text-ink">
            <Decode text="Что хотите сделать?" duration={520} />
          </h1>
          <p className="mt-5 max-w-[34rem] text-[15.5px] leading-relaxed text-ink2">
            Опишите задачу своими словами. KURAI подберёт маршрут и покажет цену ещё до запуска.
          </p>
          <WorkspaceSignal />
        </header>

        <HomeComposer mode={mode} model={model} compare={compare} prompt={prompt} />
        <div className="mt-10">
          <FirstSteps />
        </div>

        <div className="mt-16 grid gap-x-12 gap-y-10 md:grid-cols-2">
          <section aria-labelledby="recent-title">
            <h2 id="recent-title" className="mb-3 text-[13px] text-ink3">Продолжить работу</h2>
            <RecentWork />
          </section>
          <section aria-labelledby="starts-title">
            <h2 id="starts-title" className="mb-3 text-[13px] text-ink3">Быстрый старт</h2>
            <ul className="flex flex-col">
              {STARTS.map((s) => (
                <li key={s.title}>
                  <Link
                    href={`/app?mode=${s.mode}&prompt=${encodeURIComponent(s.prompt)}`}
                    className="group flex items-center justify-between gap-4 border-t border-line py-3"
                  >
                    <span className="min-w-0">
                      <span className="block text-[14px] text-ink2 group-hover:text-ink">{s.title}</span>
                      <span className="block text-[12px] text-ink3">{s.hint}</span>
                    </span>
                    <ArrowRight size={15} strokeWidth={1.5} className="shrink-0 text-ink3 transition-transform duration-(--dur-fast) group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="mt-10">
          <SavedRecipes />
        </div>
      </div>
    </main>
  );
}
