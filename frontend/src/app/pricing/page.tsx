import type { Metadata } from "next";
import { Label } from "@/components/fx/primitives";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";

export const metadata: Metadata = {
  title: "Стоимость запусков KURAI",
  description: "KURAI показывает оценку стоимости до запуска и итог операции после завершения.",
};

export default function PricingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-3">
          <Label className="text-acc">Стоимость</Label>
          <h1 className="max-w-3xl font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-tight font-medium text-balance">
            Стоимость должна быть понятна до того, как работа началась
          </h1>
          <p className="max-w-[60ch] text-ink2">KURAI создаёт оценку для конкретного запроса, сохраняет статус запуска и фиксирует итог в журнале операций. Мы не показываем вымышленные тарифы до подключения платёжного контура.</p>
        </div>
        <section aria-label="Как устроена стоимость" className="grid gap-px border border-line bg-line md:grid-cols-3 rounded-(--radius-md) overflow-hidden">
          {[
            ["01 / оценка", "Перед отправкой система проверяет доступный маршрут и создаёт оценку стоимости."],
            ["02 / запуск", "Сумма резервируется только на время работы — состояние задачи остаётся наблюдаемым."],
            ["03 / журнал", "После завершения итог отражается в журнале операций вместе с результатом и причиной статуса."],
          ].map(([label, text]) => (
            <article key={label} className="bg-g1 p-6">
              <Label className="text-acc">{label}</Label>
              <p className="mt-5 text-[14px] leading-relaxed text-ink2">{text}</p>
            </article>
          ))}
        </section>
        <p className="max-w-[62ch] text-[13px] leading-relaxed text-ink3">Подписки, способы оплаты, фискализация и условия возвратов появятся здесь только после согласования юридической модели и подключения провайдера платежей.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
