import { Appear } from "@/components/fx/motion";
import Link from "next/link";
import { Decode } from "@/components/fx/decode";
import { KeyHint, Label, SysLine } from "@/components/fx/primitives";
import { LiveDemo } from "@/components/landing/live-demo";
import { NeuralField } from "@/components/landing/neural-field";
import { NeuralCore } from "@/components/landing/neural-core";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { CountUp } from "@/components/landing/count-up";
import { Compare, Faq, Scenarios } from "@/components/landing/sections";

const MODELS = ["GPT-5 · OpenAI", "Claude Opus · Anthropic", "Gemini 2.5 · Google", "DeepSeek V3", "Grok 4 · xAI", "Nano Banana Pro", "Veo 3", "Kling 2", "Qwen 3", "Flux 2"];

const FEATURES = [
  { tag: "Текст", title: "Исследования и знания", text: "GPT, Claude, Gemini, DeepSeek, Grok. Поиск в интернете, работа с файлами, Deep Research с источниками." },
  { tag: "Медиа", title: "Творческая студия в чате", text: "Nano Banana, Flux, Veo, Kling. Картинку из ответа можно сразу оживить в видео — это тот же диалог." },
  { tag: "Работа", title: "Документы и слайды", text: "Презентации, таблицы и отчёты готовыми файлами .pptx, .docx и .xlsx." },
];

const WHY = [
  { line: "цена видна до отправки", text: "Перед каждым запросом видно, сколько он стоит. Никаких сюрпризов в конце месяца." },
  { line: "нет ответа → резервная модель", text: "Если модель не ответила, запрос сам уходит на резервную. Кредиты за сбой возвращаются автоматически." },
  { line: "один чат · общий контекст", text: "Текст, картинки, видео и голос в одной ленте. Каждый шаг опирается на предыдущий." },
];

const PLANS = [
  { name: "Free", price: "0 ₽", note: "5 запросов к текстовым моделям и 5 кредитов на медиа" },
  { name: "Pro", price: "990 ₽/мес", note: "+1 000 кредитов ежемесячно, все модели, видео и слайды", hl: true },
  { name: "Ultra", price: "2 990 ₽/мес", note: "+3 500 кредитов, приоритетная очередь, API-доступ" },
];

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main>
        {/* hero */}
        <section className="relative -mt-[76px] overflow-hidden border-b border-line pt-[76px]">
          <div className="fx-halftone absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="fx-parallax absolute inset-x-0 bottom-0 h-[60%]" aria-hidden="true">
            <NeuralField />
          </div>
          <div className="fx-scanlines pointer-events-none absolute inset-0" aria-hidden="true" />
          <span aria-hidden="true" className="absolute top-24 left-4 font-mono text-[9.5px] tracking-[0.14em] text-ink3 sm:left-6">
            KURAI // v0.9 // NODE-EU-01
          </span>
          <span aria-hidden="true" className="absolute top-24 right-4 hidden font-mono text-[9.5px] tracking-[0.14em] text-ink3 sm:right-6 sm:block">
            300+ MODELS · ONLINE
          </span>

          <div aria-hidden="true" className="absolute top-20 right-[max(0px,calc((100vw-72rem)/2))] hidden h-[480px] w-[480px] lg:block">
            <NeuralCore />
          </div>
          <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 pt-24 pb-28 sm:px-6 sm:pt-32 sm:pb-40">
            <Label className="text-acc">
              <Decode text="Один интерфейс · 300+ моделей" duration={600} />
            </Label>
            <h1 className="max-w-4xl font-display text-[clamp(2.4rem,6.5vw,5rem)] leading-[1.02] font-extralight tracking-[-0.01em] text-balance">
              Ведущие нейросети —<br />
              <span className="fx-neon fx-neon-on font-light">в одном терминале.</span>
            </h1>
            <p className="max-w-[58ch] text-[17px] leading-relaxed text-ink2">
              Текст, изображения, видео, голос и документы. KURAI подберёт модель сам или даст выбрать вручную — с ценой каждого запроса до
              отправки и резервным маршрутом при сбое.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/register" className="fx-chamfer bg-acc px-5 py-3 text-[15px] font-semibold text-acc-ink [--ch:var(--chamfer-lg)]">
                Создать аккаунт
              </Link>
              <Link href="/login" className="text-[14px] text-ink2 hover:text-ink">
                Войти →
              </Link>
              <Label>5 бесплатных запросов · без карты</Label>
            </div>
          </div>
        </section>

        {/* models marquee */}
        <section id="models" aria-label="Модели" className="overflow-hidden border-b border-line py-3">
          <div className="fx-marquee flex w-max" aria-hidden="true">
            {[...MODELS, ...MODELS].map((m, i) => (
              <span key={i} className="pr-10 font-mono text-[12px] tracking-[0.08em] whitespace-nowrap text-ink3">
                {m}
              </span>
            ))}
          </div>
          <p className="fx-sr">Модели: {MODELS.join(", ")}.</p>
        </section>

        {/* demo */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="fx-rise flex flex-col gap-4">
            <Label className="text-acc">Как это работает</Label>
            <h2 className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight font-extralight text-balance">
              Один чат вместо пяти вкладок и трёх подписок
            </h2>
            <p className="max-w-[52ch] text-ink2">
              Пишете задачу — KURAI выбирает модель, показывает маршрут и цену, отвечает. Нужна картинка к ответу? Переключите режим прямо в
              поле ввода: контекст сохранится.
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink3">
              <span><KeyHint>/i</KeyHint> изображение</span>
              <span><KeyHint>/v</KeyHint> видео</span>
              <span><KeyHint>⌘K</KeyHint> поиск</span>
            </p>
          </div>
          <LiveDemo />
        </section>

        {/* features */}
        <section aria-label="Возможности" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-px border border-line bg-line md:grid-cols-[1.15fr_0.85fr_1fr]">
            {FEATURES.map((f, i) => (
              <Appear inView index={i} key={f.tag} className="bg-g1">
              <article className="fx-hover h-full p-6">
                <Label className="text-acc">{f.tag}</Label>
                <h3 className="mt-5 text-lg font-medium">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink2">{f.text}</p>
              </article>
              </Appear>
            ))}
          </div>
        </section>

        {/* numbers */}
        <section aria-label="KURAI в цифрах" className="mx-auto grid max-w-6xl grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-4">
          {[
            { v: 300, s: "+", l: "моделей в одном чате" },
            { v: 6, s: "", l: "режимов: текст, фото, видео, голос, Research, слайды" },
            { v: 0, s: " ₽", l: "за ответы, которые не пришли" },
            { v: 15, s: "%", l: "скидка при оплате за год" },
          ].map((n) => (
            <div key={n.l} className="flex flex-col gap-1 bg-bg p-5 sm:p-6">
              <span className="font-display text-4xl font-extralight text-acc">
                <CountUp to={n.v} suffix={n.s} />
              </span>
              <span className="text-[13px] text-ink2">{n.l}</span>
            </div>
          ))}
        </section>

        {/* why */}
        <section className="border-y border-line bg-g1">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3">
            {WHY.map((w, i) => (
              <Appear inView index={i} key={w.line} className="flex flex-col gap-3">
                <SysLine tone="acc">{w.line}</SysLine>
                <p className="text-[14.5px] leading-relaxed text-ink2">{w.text}</p>
              </Appear>
            ))}
          </div>
        </section>

        <Scenarios />
        <Compare />

        {/* plans teaser */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-extralight">Платите за запросы, а не за подписки</h2>
            <Link href="/pricing" className="text-[14px] text-acc hover:underline">
              Калькулятор и все тарифы →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {PLANS.map((p, i) => (
              <Appear inView index={i} key={p.name}>
              <div data-selected={p.hl} className="fx-brackets fx-hover flex h-full flex-col gap-3 border border-line bg-g1 p-5 data-[selected=true]:border-acc-line">
                <Label className={p.hl ? "text-acc" : undefined}>{p.name}</Label>
                <p className="font-display text-3xl font-light">{p.price}</p>
                <p className="text-[13.5px] text-ink2">{p.note}</p>
              </div>
              </Appear>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-ink3">Кредиты не сгорают · оплата картами РФ и СБП · чеки по 54-ФЗ · ваши данные не используются для обучения моделей</p>
        </section>

        <Faq />

        {/* final cta */}
        <section className="fx-cut relative mx-4 mb-16 overflow-hidden border border-line bg-g1 sm:mx-6 lg:mx-auto lg:max-w-6xl">
          <div className="fx-halftone absolute inset-0 opacity-30" aria-hidden="true" />
          <div className="relative flex flex-col items-start gap-5 p-8 sm:p-12">
            <h2 className="max-w-2xl font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight font-extralight text-balance">
              Подключитесь. Первые 5 запросов — бесплатно.
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
