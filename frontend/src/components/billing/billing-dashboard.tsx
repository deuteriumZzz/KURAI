"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Calculator } from "@/components/billing/calculator";
import { Ledger } from "@/components/billing/ledger";
import { Plans } from "@/components/billing/plans";
import { TopUp } from "@/components/billing/top-up";
import { SpendChart } from "@/components/billing/spend-chart";
import { kuraiApi, type KuraiLedger } from "@/lib/kurai-api";
import { ledgerStore, projectsStore, toLedgerRows } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { MOCK_BALANCE, MOCK_LEDGER, MOCK_SPEND } from "@/mocks/data";
import type { LedgerEntry } from "@/types/api";
import { monthReceipt, spendDays } from "@/lib/spend";
import { formatCredits } from "@/lib/format";
import { routeLabel } from "@/lib/models";

const SEEN = "kurai:ledger-seen";
const nowMs = () => Date.now();

/** 113 — квитанция месяца: модели по убыванию трат, строки лесенкой, полосы растут от нуля. */
function MonthReceipt({ entries }: { entries: LedgerEntry[] }) {
  const [now] = useState(nowMs);
  const rows = useMemo(() => monthReceipt(entries, now), [entries, now]);
  const projects = useStore(projectsStore);
  // разбивка по проектам: списания чатов, лежащих в проекте; остальное — «без проекта»
  const byProject = useMemo(() => {
    const month = new Date(now).toISOString().slice(0, 7);
    const sums = new Map<string, number>();
    for (const e of entries) {
      if (e.at.slice(0, 7) !== month || (e.kind !== "charge" && e.kind !== "refund")) continue;
      const name = projects.find((p) => e.chatId && p.chatIds.includes(e.chatId))?.name ?? "без проекта";
      sums.set(name, (sums.get(name) ?? 0) - e.amountMicro);
    }
    return [...sums].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }, [entries, now, projects]);
  if (rows.length === 0) return null;
  const total = rows.reduce((n, r) => n + r.micro, 0);
  const month = new Date(now).toLocaleDateString("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <section aria-labelledby="receipt-title" className="rounded-(--radius-md) border border-line bg-g1 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-dashed border-line2 pb-3">
        <h2 id="receipt-title" className="text-[15px] font-semibold">Квитанция · {month}</h2>
        <span className="k-code text-[12px] text-ink3">KURAI·{new Date(now).toISOString().slice(0, 7).replace("-", "")}</span>
      </div>
      <ol className="mt-3 flex flex-col gap-2.5">
        {rows.map((r, i) => (
          <motion.li key={r.model} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.22 }} className="flex flex-col gap-1">
            <span className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-ink2">{routeLabel(r.model)} <span className="k-meta">· {r.runs} запуск.</span></span>
              <span className="font-mono tabular-nums text-ink">{formatCredits(r.micro)}</span>
            </span>
            <span aria-hidden="true" className="h-1 rounded-full bg-s2">
              <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.05, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }} style={{ width: `${(r.micro / total) * 100}%`, originX: 0 }} className="block h-full rounded-full bg-acc" />
            </span>
          </motion.li>
        ))}
      </ol>
      {byProject.length > 0 && (
        <div className="mt-4 border-t border-dashed border-line2 pt-3">
          <p className="k-index mb-2">По проектам</p>
          <ol className="flex flex-col gap-1.5">
            {byProject.map(([name, micro], i) => (
              <motion.li key={name} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.22 }} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="truncate text-ink2">{name}</span>
                <span className="font-mono tabular-nums text-ink">{formatCredits(micro)}</span>
              </motion.li>
            ))}
          </ol>
        </div>
      )}
      <p className="mt-4 flex justify-between border-t border-dashed border-line2 pt-3 text-[13.5px]">
        <span className="text-ink2">Итого за месяц</span>
        <span className="font-mono tabular-nums text-ink">{formatCredits(total)}</span>
      </p>
    </section>
  );
}

/** Connected billing uses the server ledger; the visual prototype stays clearly labelled when no API exists. */
export function BillingDashboard() {
  const [ledger, setLedger] = useState<KuraiLedger | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!kuraiApi) return;
    let active = true;
    void kuraiApi.ledger()
      .then((next) => {
        if (!active) return;
        setLedger(next);
        ledgerStore.set(() => toLedgerRows(next.entries));
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  const connected = Boolean(kuraiApi);
  const balance = ledger?.availableMicro ?? MOCK_BALANCE.micro;
  const rows = useMemo(() => (ledger ? toLedgerRows(ledger.entries) : connected ? [] : MOCK_LEDGER), [ledger, connected]);
  const [now] = useState(nowMs);
  const days = useMemo(() => spendDays(rows, now), [rows, now]);
  const hasSpend = days.some((d) => d.micro > 0);
  // 48 — строки, появившиеся с прошлого визита, въезжают с подсветкой
  const [seen, setSeen] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!ledger) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- прошлый визит читается из браузера после загрузки журнала
      setSeen(localStorage.getItem(SEEN));
      if (ledger.entries[0]) localStorage.setItem(SEEN, ledger.entries[0].id);
    } catch {}
  }, [ledger]);
  const freshIds = useMemo(() => {
    if (!seen) return new Set<string>();
    const cut = rows.findIndex((r) => r.id === seen);
    return new Set(cut > 0 ? rows.slice(0, cut).map((r) => r.id) : []);
  }, [rows, seen]);

  return (
    <div className="kurai-ledger-dashboard mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 md:px-6">
      {(!connected || ledger) ? (
        <TopUp initialMicro={balance} grantMicro={MOCK_BALANCE.monthlyGrantMicro} />
      ) : (
        <section aria-busy="true" className="grid min-h-52 gap-4 bg-s1 p-4 md:grid-cols-2 md:p-5 rounded-(--radius-md)">
          <div className="bg-s2" />
          <div className="bg-s2" />
        </section>
      )}
      {connected && !ledger && !failed && <p role="status" className="font-mono text-[12px] text-ink3">Загружаем журнал операций…</p>}
      {failed && <p role="status" className="bg-err-soft px-3 py-2 text-[13px] text-err rounded-(--radius-md)">Не удалось загрузить баланс. Обновите страницу или попробуйте позже.</p>}
      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start [&>*]:min-w-0">
        {connected ? (
          hasSpend ? (
            <SpendChart days={days} />
          ) : (
            <div className="flex min-h-40 items-center bg-g1 p-5 text-[13px] text-ink3 rounded-(--radius-md)">
              График появится, когда накопится история списаний.
            </div>
          )
        ) : (
          <SpendChart days={MOCK_SPEND} />
        )}
        <Ledger entries={rows} fresh={freshIds} />
      </section>
      <MonthReceipt entries={rows} />
      {!connected && <p className="text-[12px] text-ink3">Офлайн-прототип · суммы и история ниже служат только для демонстрации интерфейса.</p>}
      {connected ? (
        <section className="bg-s1 p-5 rounded-(--radius-md)">
          <h2 className="text-[15px] font-semibold">Тарифы и пополнения</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-ink3">Тарифы и пополнение появятся вместе с оплатой. Баланс и журнал выше — настоящие данные вашего аккаунта.</p>
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
