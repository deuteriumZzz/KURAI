"use client";

import { Button } from "@/components/ui/button";
import { Label, Segments } from "@/components/fx/primitives";
import { formatCredits } from "@/lib/format";
import type { Micro } from "@/types/api";

/**
 * Balance is live when the API is connected. Purchasing is deliberately inert
 * until a verified payment provider, receipts and entitlement policy exist.
 */
export function TopUp({ initialMicro, grantMicro }: { initialMicro: Micro; grantMicro: Micro }) {
  return (
    <section id="top-up" aria-labelledby="top-up-title" className="kurai-balance-overview grid gap-4 bg-s1 p-4 md:grid-cols-2 md:p-5 rounded-(--radius-md)">
      <div className="kurai-balance-overview__value flex flex-col gap-3 bg-s2 p-4 md:p-5 rounded-(--radius-sm)">
        <Label>Доступный баланс</Label>
        <p className="font-display text-5xl font-medium tabular-nums">
          {formatCredits(initialMicro, { unit: false })} <span className="text-lg text-ink3">кредитов</span>
        </p>
        <Segments value={grantMicro > 0 ? Math.min(1, initialMicro / grantMicro) : 0} count={20} label="Баланс относительно стартового начисления" />
        <p className="text-[13px] text-ink3">Баланс считается по журналу операций ниже.</p>
      </div>
      <div className="flex flex-col justify-center gap-3 p-1 md:p-2">
        <h2 id="top-up-title" className="text-[15px] font-semibold">Пополнение</h2>
        <p className="max-w-md text-[13px] leading-6 text-ink2">Оплата картой и через СБП ещё не подключена. Как только подключим, пополнить баланс можно будет здесь.</p>
        <Button variant="secondary" size="lg" disabled className="w-full sm:w-max">Пополнение скоро</Button>
      </div>
    </section>
  );
}
