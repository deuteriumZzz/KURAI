import type { Metadata } from "next";
import { Calculator } from "@/components/billing/calculator";
import { Plans } from "@/components/billing/plans";
import { Label } from "@/components/fx/primitives";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";

export const metadata: Metadata = {
  title: "Тарифы KURAI — платите за запросы, а не за подписки",
  description: "Free, Pro и Ultra. Кредиты не сгорают, 1 кредит = 1 ₽. Калькулятор подберёт самый выгодный вариант.",
};

export default function PricingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-3">
          <Label className="text-acc">Тарифы</Label>
          <h1 className="max-w-3xl font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-tight font-normal text-balance">
            Платите за запросы, а не за три подписки
          </h1>
          <p className="max-w-[60ch] text-ink2">Цена каждого запроса видна до отправки. За сбой модели кредиты возвращаются автоматически.</p>
        </div>
        <Plans />
        <section aria-labelledby="calc" className="flex flex-col gap-4">
          <h2 id="calc" className="font-display text-2xl font-light">
            Посчитайте свой месяц
          </h2>
          <Calculator />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
