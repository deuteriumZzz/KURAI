"use client";

import { useEffect, useState } from "react";
import { Calculator } from "@/components/billing/calculator";
import { Ledger } from "@/components/billing/ledger";
import { Plans } from "@/components/billing/plans";
import { TopUp } from "@/components/billing/top-up";
import { SpendChart } from "@/components/billing/spend-chart";
import { kuraiApi, type KuraiLedger } from "@/lib/kurai-api";
import { MOCK_BALANCE, MOCK_LEDGER, MOCK_SPEND } from "@/mocks/data";
import type { LedgerEntry } from "@/types/api";

const toLedgerRows = (entries: KuraiLedger["entries"]): LedgerEntry[] =>
  entries.map((entry) => ({
    id: entry.id,
    at: entry.at,
    kind: entry.kind,
    title: entry.title,
    ...(entry.model ? { model: entry.model } : {}),
    ...(entry.chatId ? { chatId: entry.chatId } : {}),
    amountMicro: entry.amountMicro,
  }));

/** Connected billing uses the server ledger; the visual prototype stays clearly labelled when no API exists. */
export function BillingDashboard() {
  const [ledger, setLedger] = useState<KuraiLedger | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!kuraiApi) return;
    let active = true;
    void kuraiApi.ledger()
      .then((next) => active && setLedger(next))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  const connected = Boolean(kuraiApi);
  const balance = ledger?.availableMicro ?? MOCK_BALANCE.micro;
  const rows = ledger ? toLedgerRows(ledger.entries) : connected ? [] : MOCK_LEDGER;

  return (
    <div className="kurai-ledger-dashboard mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 md:px-6">
      {(!connected || ledger) ? (
        <TopUp initialMicro={balance} grantMicro={MOCK_BALANCE.monthlyGrantMicro} />
      ) : (
        <section aria-busy="true" className="grid min-h-52 gap-4 bg-s1 p-4 md:grid-cols-2 md:p-5">
          <div className="bg-s2" />
          <div className="bg-s2" />
        </section>
      )}
      {connected && !ledger && !failed && <p role="status" className="font-mono text-[12px] text-ink3">Загружаем журнал операций…</p>}
      {failed && <p role="status" className="bg-err-soft px-3 py-2 text-[13px] text-err">Не удалось загрузить баланс. Обновите страницу или попробуйте позже.</p>}
      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        {connected ? (
          <div className="flex min-h-40 items-center bg-g1 p-5 text-[13px] text-ink3">
            Аналитика расходов появится, когда накопится история операций. Журнал справа — источник текущих данных.
          </div>
        ) : (
          <SpendChart days={MOCK_SPEND} />
        )}
        <Ledger entries={rows} />
      </section>
      {!connected && <p className="text-[12px] text-ink3">Офлайн-прототип · суммы и история ниже служат только для демонстрации интерфейса.</p>}
      {connected ? (
        <section className="bg-s1 p-5">
          <h2 className="text-[15px] font-semibold">Тарифы и пополнения</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-ink3">Цены, подписки и пополнения появятся только после подключения платёжного провайдера, правил расчёта и выдачи чеков. До этого KURAI показывает фактический серверный баланс и историю кредитов выше.</p>
        </section>
      ) : (
        <>
          <section aria-labelledby="plans-title" className="flex flex-col gap-4">
            <div><h2 id="plans-title" className="text-[15px] font-semibold">Тарифы</h2><p className="mt-1 text-[13px] text-ink3">Демонстрационные варианты интерфейса.</p></div>
            <Plans current="free" cta="switch" />
          </section>
          <section aria-labelledby="calc-title" className="flex flex-col gap-4">
            <div><h2 id="calc-title" className="text-[15px] font-semibold">Сколько нужно в месяц</h2><p className="mt-1 text-[13px] text-ink3">Демонстрационный калькулятор будущей тарифной политики.</p></div>
            <Calculator />
          </section>
        </>
      )}
    </div>
  );
}
