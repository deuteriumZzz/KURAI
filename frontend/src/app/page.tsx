import Link from "next/link";
import { SignalField } from "@/components/app/signal-field";
import { Appear } from "@/components/fx/motion";
import { Decode } from "@/components/fx/decode";
import { Faq } from "@/components/landing/faq";
import { ModelMarquee } from "@/components/landing/model-marquee";
import { ScrollStory } from "@/components/landing/scroll-story";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { TryComposer } from "@/components/landing/try-composer";
import { plural } from "@/lib/format";
import { publicCatalog, type PublicCatalog } from "@/lib/public-catalog";
import type { Mode } from "@/types/api";

/** Состояние режима из живого каталога; без сервера — ничего не утверждаем. */
function ModeState({ catalog, mode, label }: { catalog: PublicCatalog | null; mode: Mode; label: string }) {
  const state = catalog?.modes.find((m) => m.id === mode);
  if (!state) return null;
  return (
    <li className="flex items-center justify-between gap-3 border-t border-line py-2 text-[13px]">
      <span className="text-ink2">{label}</span>
      <span className={state.available ? "k-code text-ok" : "k-code text-ink3"}>{state.available ? "работает" : "скоро"}</span>
    </li>
  );
}

/**
 * Лендинг по плану: шапка → первый экран с настоящим полем ввода → три карточки → как это работает →
 * вопросы → призыв → бегущая строка каталога → подвал. Материал, шрифты и геометрия — те же, что в кабинете.
 */
export default async function Landing() {
  const catalog = await publicCatalog();
  const providers = catalog?.providers ?? [];
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main id="k-main">
        {/* первый экран — как главная кабинета: индекс, заголовок, поле ввода */}
        <section className="relative overflow-hidden">
          <SignalField />
          <div className="relative mx-auto flex w-full max-w-[60rem] flex-col px-4 pt-[clamp(3rem,9vh,6.5rem)] pb-20 sm:px-6">
            <p className="k-index mb-5">K/00 · {catalog ? `${plural(catalog.textModels, ["модель", "модели", "моделей"])} в каталоге` : "Нейросети в одном чате"}</p>
            <h1 className="k-display text-[clamp(3.1rem,8.4vw,6.6rem)] text-ink">
              {/* К2 — заголовок собирается из кодов один раз */}
              <Decode text="Сотни нейросетей" duration={520} />
              <br />
              {/* 45 — вторая строка набирает вес по мере прокрутки */}
              <span className="k-weight-scroll">в одном чате</span>
            </h1>
            <p className="mt-6 max-w-[36rem] text-[16px] leading-relaxed text-ink2">
              Текст, исследования и слайды. KURAI подберёт модель сам или даст выбрать, а цена каждого запроса видна до отправки.
            </p>
            <div className="mt-10">
              <TryComposer modes={catalog?.modes ?? null} />
            </div>
          </div>
        </section>

        {/* три карточки из плана: текст, медиа, работа */}
        <section aria-labelledby="cap-title" className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <p className="k-index">K/01 · Возможности</p>
          <h2 id="cap-title" className="mt-3 mb-8 font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-tight font-medium">
            Что можно поручить
          </h2>
          <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr_1fr]">
            <Appear inView index={0} className="flex flex-col gap-4 rounded-(--radius-md) border border-line bg-g1 p-6">
              <p className="k-index text-acc">01 / Текст и research</p>
              <h3 className="text-lg font-medium">Разговор и исследование</h3>
              <p className="text-[14px] leading-relaxed text-ink2">
                Спрашивайте, уточняйте, просите новую версию другой моделью — прежняя останется в ветке. Research ищет и читает источники и даёт ссылки на них.
              </p>
              {providers.length > 0 && (
                <p className="mt-auto text-[13px] text-ink3">
                  {providers
                    .slice(0, 4)
                    .map((p) => p.name)
                    .join(", ")}{" "}
                  и другие
                </p>
              )}
            </Appear>
            <Appear inView index={1} className="flex flex-col gap-4 rounded-(--radius-md) border border-line bg-g1 p-6">
              <p className="k-index text-acc">02 / Медиа</p>
              <h3 className="text-lg font-medium">Изображения, видео и голос</h3>
              <p className="text-[14px] leading-relaxed text-ink2">Опишите картинку словами или сошлитесь на сообщение выше. Готовые работы собираются в медиатеке.</p>
              <ul className="mt-auto">
                <ModeState catalog={catalog} mode="image" label="Изображения" />
                <ModeState catalog={catalog} mode="video" label="Видео" />
                <ModeState catalog={catalog} mode="audio" label="Озвучка" />
              </ul>
            </Appear>
            <Appear inView index={2} className="flex flex-col gap-4 rounded-(--radius-md) border border-line bg-g1 p-6">
              <p className="k-index text-acc">03 / Работа</p>
              <h3 className="text-lg font-medium">Слайды и артефакты</h3>
              <p className="text-[14px] leading-relaxed text-ink2">
                Попросите презентацию из того, что уже обсудили: структура и текст слайдов появятся рядом с чатом. Удачный ответ сохраните артефактом, чтобы вернуться к нему позже.
              </p>
              <ul className="mt-auto">
                <ModeState catalog={catalog} mode="slides" label="Слайды" />
                <ModeState catalog={catalog} mode="research" label="Deep Research" />
              </ul>
            </Appear>
          </div>
        </section>

        <ScrollStory />
        <Faq />

        <section aria-labelledby="cta-title" className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <div className="flex flex-col items-start gap-5 rounded-(--radius-lg) border border-line bg-g1 p-8 sm:p-12">
            <p className="k-index">K/04 · Начать</p>
            <h2 id="cta-title" className="k-display text-[clamp(2.6rem,6vw,4.4rem)] text-ink">
              Начните с 10 кредитов
            </h2>
            <p className="max-w-[40rem] text-[15px] leading-relaxed text-ink2">
              Регистрация по email. Кредиты приходят на баланс сразу, их хватит на несколько первых запросов.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/register" className="fx-chamfer fx-sheen inline-flex h-12 items-center rounded-(--radius-sm) bg-acc px-5 text-[15px] font-semibold text-acc-ink [--ch:var(--chamfer-sm)]">
                Создать аккаунт
              </Link>
              <Link href="/login" className="inline-flex min-h-11 items-center text-[14px] text-ink2 hover:text-ink">
                Войти
              </Link>
            </div>
          </div>
        </section>

        <ModelMarquee providers={providers} />
      </main>
      <SiteFooter />
    </div>
  );
}
