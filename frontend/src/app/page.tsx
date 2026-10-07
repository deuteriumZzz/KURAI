import { Appear } from "@/components/fx/motion";
import Link from "next/link";
import { Decode } from "@/components/fx/decode";
import { KeyHint, Label, SysLine } from "@/components/fx/primitives";
import { LiveDemo } from "@/components/landing/live-demo";
import { NeuralCore } from "@/components/landing/neural-core";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { Compare, Faq, Scenarios } from "@/components/landing/sections";
import { ModeTabs } from "@/components/landing/mode-tabs";
import { Gallery } from "@/components/landing/gallery";
import { Magnetic } from "@/components/landing/magnetic";
import { ScrollStory } from "@/components/landing/scroll-story";
import { LANDING_CAPABILITIES, LANDING_MODES } from "@/lib/landing-content";

const FUTURE_CAPABILITIES = LANDING_CAPABILITIES.filter((capability) => !capability.available);

const PRINCIPLES = [
  { line: "выбор остаётся за вами", text: "KURAI не прячет модель за красивой кнопкой: сравнивайте доступные варианты и выбирайте тот, который подходит текущей задаче." },
  { line: "цена — до запуска", text: "Перед работой создаётся оценка. Статус запуска и итог остаются видимыми в контексте чата, а не растворяются в фоне." },
  { line: "каждый шаг связан", text: "Ответ, исследование, изображение и структура презентации растут из одной ветки — без копирования между десятком окон." },
];

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main>
        {/* hero */}
        <section className="fx-landing-stage relative -mt-[76px] overflow-hidden pt-[76px]">
          <div aria-hidden="true" className="fx-landing-vertical absolute top-36 right-[max(1rem,calc((100vw-80rem)/2))] hidden h-96 w-96 lg:block">
            <NeuralCore />
          </div>
          <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 pt-24 pb-28 sm:px-6 sm:pt-32 sm:pb-40">
            <Label className="text-acc">
              <Decode text="KURAI / рабочее пространство для AI" duration={600} />
            </Label>
            <h1 className="fx-weight-in max-w-[46rem] font-display text-[clamp(2.65rem,5.7vw,4.8rem)] leading-[0.98] font-normal tracking-[-0.03em] text-balance">
              Меньше шума.<br />
              {/* 45 — строка набирает вес по мере прокрутки (переменный шрифт, без картинок) */}
              <span className="k-weight-scroll text-ink3">Больше ясной работы.</span>
            </h1>
            <p className="max-w-[53ch] text-[17px] leading-relaxed text-ink2">
              KURAI объединяет выбор модели, живой контекст и понятный путь от вопроса к результату. Точно, спокойно, с вниманием к настоящей работе.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Magnetic>
                <Link href="/register" className="fx-chamfer fx-sheen inline-block bg-acc px-5 py-3 text-[15px] font-semibold text-acc-ink [--ch:var(--chamfer-lg)]">
                  Создать аккаунт
                </Link>
              </Magnetic>
              <Link href="/login" className="inline-flex min-h-6 items-center text-[14px] text-ink2 hover:text-ink pointer-coarse:min-h-11">
                Войти →
              </Link>
              <Label>диалог · research · изображения · слайды</Label>
            </div>
            <div className="fx-landing-readout mt-4 grid max-w-2xl grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
              <div className="bg-bg p-3"><Label className="text-acc">01 / контекст</Label><p>Ветки вместо потерянных идей</p></div>
              <div className="bg-bg p-3"><Label className="text-acc">02 / маршрут</Label><p>Модель и оценка до запуска</p></div>
              <div className="bg-bg p-3"><Label className="text-acc">03 / результат</Label><p>Следующий шаг уже рядом</p></div>
            </div>
          </div>
        </section>

        <section id="models" aria-label="Готовые режимы" className="border-y border-line bg-g1">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4 sm:px-6">
            <Label>готово сейчас</Label>
            {LANDING_MODES.map((mode, index) => (
              <span key={mode.id} className="font-mono text-[12px] tracking-[0.08em] text-ink2"><span className="mr-2 text-acc">0{index + 1}</span>{mode.label}</span>
            ))}
          </div>
        </section>

        {/* demo */}
        <section id="workflow" className="mx-auto grid max-w-6xl scroll-mt-20 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="fx-rise flex flex-col gap-4">
            <Label className="text-acc">Как это работает</Label>
            <h2 className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight font-normal text-balance">
              От вопроса к обоснованной работе — в одном потоке
            </h2>
            <p className="max-w-[52ch] text-ink2">
              Начните с задачи, выберите подходящую модель и продолжайте в том же контексте. KURAI показывает путь запуска и удерживает ход работы — от первой формулировки до результата.
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink3">
              <span><KeyHint>/i</KeyHint> изображение</span>
              <span><KeyHint>/r</KeyHint> research</span>
              <span><KeyHint>/s</KeyHint> слайды</span>
            </p>
          </div>
          <LiveDemo />
        </section>

        <ScrollStory />

        {/* features */}
        <section aria-label="Возможности" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-px border border-line bg-line md:grid-cols-2">
            {LANDING_MODES.map((f, i) => (
              <Appear inView index={i} key={f.id} className="bg-g1">
              <article className="fx-hover h-full p-6">
                <Label className="text-acc">{f.eyebrow}</Label>
                <h3 className="mt-5 text-lg font-medium">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink2">{f.description}</p>
              </article>
              </Appear>
            ))}
          </div>
        </section>

        {/* numbers */}
        <section aria-label="Контур KURAI" className="mx-auto grid max-w-6xl grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-4">
          {[
            { v: "01", l: "контекст сохраняется в ветках" },
            { v: "02", l: "модель выбирается под задачу" },
            { v: "03", l: "оценка создаётся до запуска" },
            { v: "04", l: "результат остаётся частью работы" },
          ].map((n) => (
            <div key={n.l} className="flex flex-col gap-1 bg-bg p-5 sm:p-6">
              <span className="font-display text-4xl font-normal text-acc">{n.v}</span>
              <span className="text-[13px] text-ink2">{n.l}</span>
            </div>
          ))}
        </section>

        {/* why */}
        <section className="border-y border-line bg-g1">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3">
            {PRINCIPLES.map((w, i) => (
              <Appear inView index={i} key={w.line} className="flex flex-col gap-3">
                <SysLine tone="acc">{w.line}</SysLine>
                <p className="text-[14.5px] leading-relaxed text-ink2">{w.text}</p>
              </Appear>
            ))}
          </div>
        </section>

        <ModeTabs />
        <Gallery />
        <Scenarios />
        <Compare />

        {/* capability boundary */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-normal">Система развивается контурами, а не обещаниями</h2>
            <Link href="/status" className="inline-flex min-h-6 items-center text-[14px] text-acc hover:underline pointer-coarse:min-h-11">
              Статус сервисов →
            </Link>
          </div>
          <div className="grid gap-px border border-line bg-line md:grid-cols-[1.35fr_0.65fr]">
            <div className="bg-g1 p-6">
              <Label className="text-acc">в работе</Label>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {LANDING_MODES.map((mode, index) => (
                  <div key={mode.id} className="border-t border-line pt-3 text-[14px] text-ink2"><span className="mr-2 font-mono text-acc">0{index + 1}</span>{mode.label}</div>
                ))}
              </div>
            </div>
            <div className="bg-bg p-6">
              <Label>по конфигурации</Label>
              <div className="mt-5 flex flex-col gap-3">
                {FUTURE_CAPABILITIES.map((capability) => <p key={capability.id} className="text-[14px] text-ink3"><span className="mr-2 text-warn">◇</span>{capability.label} · проверяйте в статусе</p>)}
              </div>
            </div>
          </div>
          <p className="mt-4 text-[12.5px] text-ink3">Доступность каждого режима определяется живым каталогом, ключом провайдера и готовностью приватного контура хранения результата.</p>
        </section>

        <Faq />

        {/* final cta */}
        <section className="fx-landing-final fx-cut relative mx-4 mb-16 overflow-hidden border border-line bg-g1 sm:mx-6 lg:mx-auto lg:max-w-6xl">
          <div className="relative flex flex-col items-start gap-5 p-8 sm:p-12">
            <h2 className="max-w-2xl font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight font-normal text-balance">
              Пространство, в котором AI помогает думать, а не отвлекает от работы.
            </h2>
            <Link href="/register" className="fx-chamfer bg-acc px-5 py-3 text-[15px] font-semibold text-acc-ink [--ch:var(--chamfer-lg)]">
              Создать аккаунт
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
