"use client";

import Link from "next/link";
import { useState } from "react";
import type { LedgerEntry, LedgerKind } from "@/types/api";
import { formatCredits } from "@/lib/format";
import { cn } from "@/lib/cn";

const FILTERS: { id: "all" | LedgerKind; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "charge", label: "Списания" },
  { id: "topup", label: "Пополнения" },
  { id: "refund", label: "Возвраты" },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

/** Журнал операций: только чтение; возвраты за сбои отдельной строкой. */
export function Ledger({ entries }: { entries: LedgerEntry[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const rows = entries.filter((e) => filter === "all" || e.kind === filter || (filter === "topup" && (e.kind === "grant" || e.kind === "bonus")));

  return (
    <section aria-labelledby="ledger-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ledger-title" className="text-[15px] font-semibold">
          Операции
        </h2>
        <div role="radiogroup" aria-label="Фильтр операций" className="flex border border-line">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn("cursor-pointer border-r border-line px-3 py-1.5 text-[12.5px] last:border-r-0", filter === f.id ? "bg-acc-soft text-acc" : "text-ink2 hover:text-ink")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line bg-g1 text-left font-mono text-[11px] tracking-[0.1em] text-ink3 uppercase">
              <th className="px-3 py-2 font-medium">Время</th>
              <th className="px-3 py-2 font-medium">Операция</th>
              <th className="px-3 py-2 font-medium">Модель</th>
              <th className="px-3 py-2 text-right font-medium">Кредиты</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2.5 font-mono text-[12px] text-ink3 tabular-nums">{when(e.at)}</td>
                <td className="px-3 py-2.5">
                  {e.chatId ? (
                    <Link href={`/app/c/${e.chatId}`} className="hover:text-acc">
                      {e.title}
                    </Link>
                  ) : (
                    e.title
                  )}
                </td>
                <td className="px-3 py-2.5 text-ink2">{e.model ?? "—"}</td>
                <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", e.amountMicro > 0 ? "text-ok" : "text-ink")}>
                  {e.amountMicro > 0 ? "+" : "−"}
                  {formatCredits(Math.abs(e.amountMicro), { unit: false })}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-ink3">
                  Операций такого типа пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
