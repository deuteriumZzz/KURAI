import Link from "next/link";
import { getImageProps } from "next/image";
import { SignalField } from "@/components/app/signal-field";
import { Faq } from "@/components/landing/faq";
import { FinalCall } from "@/components/landing/final-call";
import { landingFonts } from "@/components/landing/fonts";
import { HeroSwarm } from "@/components/landing/hero-swarm";
import { HeroTitle } from "@/components/landing/hero-title";
import { ModelMarquee } from "@/components/landing/model-marquee";
import { ProductStage } from "@/components/landing/product-stage";
import { ProductTour } from "@/components/landing/product-tour";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { TryComposer } from "@/components/landing/try-composer";
import { formatCredits, plural } from "@/lib/format";
import { publicCatalog, type PublicCatalog } from "@/lib/public-catalog";

/** Правила цены — те же, что на странице стоимости и в кабинете. */
const RULES = [
  ["Цена зависит от модели и длины переписки.", "Короткий вопрос стоит меньше, чем разбор документа."],
  ["Видна до отправки", "— под полем ввода. Сменили модель — оценка пересчиталась."],
  ["Списывается по факту.", "На время ответа сумма резервируется; если модель не ответила, резерв вернётся на баланс."],
  ["Без подписки.", "Кредиты тратятся только на запросы."],
];

/** Цифры — из живого каталога; без сервера показываем только то, что не зависит от него. */
function Pricing({ catalog }: { catalog: PublicCatalog | null }) {
  const names = catalog?.providers.slice(0, 3).map((p) => p.name) ?? [];
  const nums = [
    { value: "10", unit: "кр", text: "на баланс при регистрации", accent: true },
    ...(catalog?.autoPriceMicro != null ? [{ value: `≈ ${formatCredits(catalog.autoPriceMicro, { unit: false })}`, unit: "кр", text: "типовой запрос в режиме «Авто»" }] : []),
    ...(catalog?.textModels ? [{ value: String(catalog.textModels), unit: "", text: `${plural(catalog.textModels, ["модель", "модели", "моделей"]).replace(/^\d+\s/, "")} для текста${names.length ? `: ${names.join(", ")} и другие` : ""}` }] : []),
  ];
  return (
    <section id="price" aria-labelledby="price-title" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <p className="k-index">K/02 · Стоимость</p>
      <h2 id="price-title" className="k-tech mt-3 mb-10 max-w-[20ch] text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.05] text-balance">
        Платите за ответы, а не за подписку
      </h2>
      <dl className="grid border-y border-line sm:grid-cols-3">
        {nums.map((n) => (
          <div key={n.text} className="border-line px-1 py-8 not-first:border-t sm:px-6 sm:not-first:border-t-0 sm:not-first:border-l">
            <dt className="sr-only">{n.text}</dt>
            <dd className={`k-display text-[clamp(4rem,8vw,7.5rem)] ${n.accent ? "text-acc" : "text-ink"}`}>
              {n.value}
              {n.unit && <span className="ml-1 text-[0.4em] text-ink3">{n.unit}</span>}
            </dd>
            <p aria-hidden="true" className="mt-4 max-w-[18rem] text-[15px] leading-relaxed text-ink2">
              {n.text}
            </p>
          </div>
        ))}
      </dl>
      <ul className="mt-12 grid gap-x-16 md:grid-cols-2">
        {RULES.map(([lead, rest], i) => (
          <li key={lead} className="grid grid-cols-[2rem_1fr] border-b border-line py-4 text-[15px] leading-relaxed text-ink2 first:border-t md:nth-2:border-t">
            <span className="k-code pt-0.5 text-[11px] text-acc">{String(i + 1).padStart(2, "0")}</span>
            <span>
              <strong className="font-medium text-ink">{lead}</strong> {rest}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/pricing" className="mt-8 inline-flex min-h-11 items-center text-[14px] text-ink2 underline underline-offset-4 hover:text-ink">
        Подробнее о стоимости
      </Link>
    </section>
  );
}

/**
 * Лендинг: всё соединяется в одно. Названия провайдеров слетаются в «Авто», экран кабинета
 * собирается из слоёв, финал сводит каталог в одну линию. Свет — один лаймовый, как в кабинете,
 * только громче; поле ввода, фон-сетка и черновик — общие с кабинетом.
 */
export default async function Landing() {
  const catalog = await publicCatalog();
  const providers = catalog?.providers ?? [];
  const names = providers.map((p) => p.name);
  const { props: shot } = getImageProps({
    src: "/landing/chat.jpg",
    width: 2000,
    height: 1250,
    sizes: "(min-width: 1200px) 1136px, 100vw",
    alt: "Чат в кабинете KURAI: вопрос, ответ модели с ценой под ним и список чатов слева. Текст ответа — иллюстрация.",
  });
  return (
    <div className={`flex flex-1 flex-col ${landingFonts}`}>
      <SiteHeader />
      <main id="k-main" className="overflow-x-clip">
        <section className="relative">
          <div className="k-beams" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <SignalField />
          <HeroSwarm names={names} />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-[clamp(2.5rem,8vh,6rem)] text-center sm:px-6">
            <p className="k-index mb-6">K/00 · {catalog ? `${plural(catalog.textModels, ["модель", "модели", "моделей"])} в каталоге` : "Нейросети в одном чате"}</p>
            <HeroTitle />
            <p className="mt-8 max-w-[36rem] text-[clamp(16px,1.5vw,19px)] leading-relaxed text-ink2">
              Пишите как в мессенджере. KURAI подберёт модель под задачу, а цену ответа покажет до отправки.
            </p>
            <div className="mt-9 w-full max-w-[54rem] text-left">
              <TryComposer modes={catalog?.modes ?? null} />
            </div>
          </div>
          <div className="mx-auto mt-[clamp(6rem,17vh,11rem)] w-full max-w-6xl px-4 pb-16 sm:px-6">
            <ProductStage img={shot} />
          </div>
        </section>

        <ModelMarquee providers={providers} />
        <ProductTour />
        <Pricing catalog={catalog} />
        <Faq />
        <FinalCall names={names} />
      </main>
      <SiteFooter />
    </div>
  );
}
