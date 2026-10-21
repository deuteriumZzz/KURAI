import type { Metadata } from "next";
import { Label } from "@/components/fx/primitives";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";

export const metadata: Metadata = {
  title: "Стоимость запусков KURAI",
  description: "Оплата за запросы в кредитах. Цена видна до отправки, списание — в журнале операций.",
};

export default function PricingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-3">
          <Label className="text-acc">Стоимость</Label>
          <h1 className="max-w-3xl font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-tight font-medium text-balance">
            Цена каждого запроса видна до отправки
          </h1>
          <p className="max-w-[60ch] text-ink2">Каждый запрос стоит кредиты: цена зависит от модели и длины переписки и видна до отправки. Пакеты кредитов и цены в рублях опубликуем вместе с подключением оплаты.</p>
        </div>
        <section aria-label="Как устроена стоимость" className="grid gap-px border border-line bg-line md:grid-cols-3 rounded-(--radius-md) overflow-hidden">
          {[
            ["01 / оценка", "Под полем ввода видна оценка в кредитах для выбранной модели."],
            ["02 / резерв", "На время работы оценка резервируется на балансе. Если модель не ответила, резерв возвращается."],
            ["03 / журнал", "Списывается фактическая цена. Она видна в квитанции ответа и в журнале операций."],
          ].map(([label, text]) => (
            <article key={label} className="bg-g1 p-6">
              <Label className="text-acc">{label}</Label>
              <p className="mt-5 text-[14px] leading-relaxed text-ink2">{text}</p>
            </article>
          ))}
        </section>
        <p className="max-w-[62ch] text-[13px] leading-relaxed text-ink3">Способы оплаты, чеки и правила возврата денег появятся здесь вместе с подключением оплаты.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
