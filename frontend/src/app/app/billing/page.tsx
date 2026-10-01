import { PageTitle } from "@/components/fx/page-title";
import { Label } from "@/components/fx/primitives";
import { BillingDashboard } from "@/components/billing/billing-dashboard";

export default function BillingPage() {
  return (
    <main className="kurai-billing-page flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="kurai-billing-page__header flex h-14 shrink-0 items-center justify-between gap-3 bg-s1 px-4 pl-16 md:pl-6">
        <PageTitle title="Баланс и тарифы" />
        <Label>Учёт кредитов</Label>
      </header>
      <BillingDashboard />
    </main>
  );
}
