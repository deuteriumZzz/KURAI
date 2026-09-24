import { PageTitle } from "@/components/fx/page-title";
import { Calculator } from "@/components/billing/calculator";
import { Ledger } from "@/components/billing/ledger";
import { Plans } from "@/components/billing/plans";
import { TopUp } from "@/components/billing/top-up";
import { Label } from "@/components/fx/primitives";
import { MOCK_BALANCE, MOCK_LEDGER, MOCK_SPEND } from "@/mocks/data";
import { SpendChart } from "@/components/billing/spend-chart";

export default function BillingPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 pl-16 md:pl-6">
        <PageTitle title="Баланс и тарифы" code="SEC-03 // BILLING" />
        <Label>Pro · до 23.10</Label>
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-6 md:px-6">
        <TopUp initialMicro={MOCK_BALANCE.micro} grantMicro={MOCK_BALANCE.monthlyGrantMicro} />
        <div className="fx-ruler" aria-hidden="true" />
        <SpendChart days={MOCK_SPEND} />
        <Ledger entries={MOCK_LEDGER} />
        <div className="fx-ruler" aria-hidden="true" />
        <section aria-labelledby="plans-title" className="flex flex-col gap-4">
          <h2 id="plans-title" className="text-[15px] font-semibold">
            Тарифы
          </h2>
          <Plans current={MOCK_BALANCE.plan} cta="switch" />
        </section>
        <section aria-labelledby="calc-title" className="flex flex-col gap-4">
          <h2 id="calc-title" className="text-[15px] font-semibold">
            Сколько нужно в месяц
          </h2>
          <Calculator />
        </section>
      </div>
    </main>
  );
}
