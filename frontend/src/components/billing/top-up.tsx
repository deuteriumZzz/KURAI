"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Decode } from "@/components/fx/decode";
import { Label, Segments, SysLine } from "@/components/fx/primitives";
import { cn } from "@/lib/cn";
import { formatCredits, MICRO_PER_CREDIT } from "@/lib/format";
import { isCalm, retrigger } from "@/lib/motion";
import type { Micro } from "@/types/api";

const PRESETS = [500, 1000, 3000, 5000];
const STEPS = ["Создание платежа", "Подтверждение банка", "Зачисление кредитов"];

/** Пополнение: выбор суммы → реальные шаги ЮKassa → «награда» (баланс прокручивается к новому значению). */
export function TopUp({ initialMicro, grantMicro }: { initialMicro: Micro; grantMicro: Micro }) {
  const [balance, setBalance] = useState(initialMicro);
  const [amount, setAmount] = useState(1000);
  const [step, setStep] = useState(-1);
  const [shown, setShown] = useState(initialMicro);
  const balRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (shown === balance) return;
    if (isCalm()) {
      const t = setTimeout(() => setShown(balance), 0);
      return () => clearTimeout(t);
    }
    const from = shown;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 600);
      setShown(Math.round(from + (balance - from) * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
      else retrigger(balRef.current, "fx-flicker");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- анимация от текущего показанного значения к новому балансу
  }, [balance]);

  async function pay() {
    for (let i = 0; i < STEPS.length; i++) {
      setStep(i);
      await new Promise((r) => setTimeout(r, i === 1 ? 1400 : 700));
    }
    setStep(STEPS.length);
    setBalance((b) => b + amount * MICRO_PER_CREDIT);
  }

  const busy = step >= 0 && step < STEPS.length;

  return (
    <section id="top-up" aria-labelledby="top-up-title" className="grid gap-6 border border-line bg-g1 p-5 md:grid-cols-2 md:p-6">
      <div className="flex flex-col gap-3">
        <Label>Баланс</Label>
        <p ref={balRef} className="font-display text-5xl font-extralight tabular-nums">
          {formatCredits(shown, { unit: false })} <span className="text-lg text-ink3">кредитов</span>
        </p>
        <Segments value={balance / grantMicro} count={20} label="Баланс относительно месячного начисления" />
        <p className="text-[13px] text-ink3">1 кредит = 1 ₽ · кредиты не сгорают</p>
      </div>
      <div className="flex flex-col gap-4">
        <h2 id="top-up-title" className="text-[15px] font-semibold">
          Пополнить
        </h2>
        <div role="radiogroup" aria-label="Сумма пополнения" className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={amount === p}
              disabled={busy}
              onClick={() => setAmount(p)}
              className={cn(
                "h-11 cursor-pointer border font-mono text-[13px] tabular-nums disabled:cursor-not-allowed",
                amount === p ? "border-acc-line bg-acc-soft text-acc" : "border-line text-ink2 hover:text-ink",
              )}
            >
              {p.toLocaleString("ru-RU")} ₽
            </button>
          ))}
        </div>
        {step < 0 || step === STEPS.length ? (
          <>
            <Button variant="primary" size="lg" onClick={pay} className="w-full">
              Оплатить {amount.toLocaleString("ru-RU")} ₽ · карта или СБП
            </Button>
            {step === STEPS.length && (
              <SysLine tone="ok" decode>
                {`зачислено +${amount.toLocaleString("ru-RU")} кр · чек отправлен на почту`}
              </SysLine>
            )}
          </>
        ) : (
          <ol role="status" className="flex flex-col gap-2 border border-line bg-bg p-3 font-mono text-[12.5px]">
            {STEPS.map((s, i) => (
              <li key={s} className={i < step ? "text-acc" : i === step ? "text-ink" : "text-ink3"}>
                {i < step ? <Decode text={`› ${s} ✓`} /> : `› ${s}${i === step ? " ▶" : ""}`}
              </li>
            ))}
          </ol>
        )}
        <p className="text-[12px] text-ink3">Платёж через ЮKassa · чек по 54-ФЗ придёт на email</p>
      </div>
    </section>
  );
}
