"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import type { Plan } from "@/types/api";
import { ANNUAL_DISCOUNT, PLANS, planPrice } from "@/lib/pricing";
import { cn } from "@/lib/cn";
import { Label } from "@/components/fx/primitives";

/** Тарифы с переключателем «месяц / год (−15%)». current — текущий тариф пользователя в кабинете. */
export function Plans({ current, cta = "register" }: { current?: Plan; cta?: "register" | "switch" }) {
  const [annual, setAnnual] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Период оплаты" className="flex w-max border border-line">
        {[false, true].map((a) => (
          <button
            key={String(a)}
            type="button"
            role="radio"
            aria-checked={annual === a}
            onClick={() => setAnnual(a)}
            className={cn("cursor-pointer px-3.5 py-2 text-[13px] first:border-r first:border-line", annual === a ? "bg-acc-soft text-acc" : "text-ink2 hover:text-ink")}
          >
            {a ? `Год · −${ANNUAL_DISCOUNT * 100}%` : "Месяц"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = current === p.id;
          const featured = current ? isCurrent : p.id === "pro";
          return (
            <div key={p.id} data-selected={featured} className="fx-brackets flex flex-col gap-4 border border-line bg-g1 p-5 data-[selected=true]:border-acc-line">
              <Label className={featured ? "text-acc" : undefined}>
                {p.name}
                {isCurrent && " · текущий"}
              </Label>
              <p className="font-display text-3xl font-light tabular-nums">
                <span className="inline-block overflow-hidden align-bottom">
                  <motion.span key={`${p.id}-${annual}`} initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }} className="inline-block">
                    {planPrice(p.priceRub, annual).toLocaleString("ru-RU")} ₽
                  </motion.span>
                </span>
                <span className="ml-1 font-sans text-[13px] text-ink3">/ мес</span>
              </p>
              <ul className="flex flex-1 flex-col gap-1.5 text-[13.5px] text-ink2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 before:text-acc before:content-['›']">
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="border border-line px-3 py-2 text-center text-[13px] text-ink3">Ваш тариф</span>
              ) : (
                <Link
                  href={cta === "register" ? "/register" : "/app/billing#top-up"}
                  className={cn(
                    "px-3 py-2 text-center text-[13px]",
                    featured ? "fx-chamfer bg-acc font-semibold text-acc-ink [--ch:var(--chamfer-sm)]" : "border border-line2 bg-g2 hover:bg-g3",
                  )}
                >
                  {cta === "register" ? (p.id === "free" ? "Начать бесплатно" : `Выбрать ${p.name}`) : `Перейти на ${p.name}`}
                </Link>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[12.5px] text-ink3">Кредиты не сгорают и копятся при продлении · 1 кредит = 1 ₽ · отмена автопродления в один клик</p>
    </div>
  );
}
