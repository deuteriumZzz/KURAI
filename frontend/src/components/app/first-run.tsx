"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Decode } from "@/components/fx/decode";
import { Label, SysLine } from "@/components/fx/primitives";
import { readPrefs, writePrefs } from "@/lib/prefs";
import { cn } from "@/lib/cn";

const USE_CASES = [
  { id: "work", label: "Работа", setup: "Claude Sonnet 5 · поиск в интернете · шаблоны: письма, отчёты, таблицы", model: "claude-sonnet-5" },
  { id: "content", label: "Контент", setup: "GPT-5 + Nano Banana · режимы: изображение, видео · шаблоны: посты, Reels, обложки", model: "gpt-5" },
  { id: "study", label: "Учёба", setup: "Gemini 2.5 Flash · поиск · шаблоны: конспект, объяснить тему, тест", model: "gemini-flash" },
  { id: "code", label: "Код", setup: "Claude Sonnet 5 · шаблоны: ревью, рефакторинг, тесты", model: "claude-sonnet-5" },
];

const TIPS = ["Режимы — здесь: текст, картинка, видео, аудио, Research, слайды", "Цена запроса видна до отправки", "⌘K — поиск и команды, Alt — горячие клавиши"];

/** Первый вход: «Для чего вам KURAI?» → три HUD-подсказки. Показывается один раз. */
export function FirstRun() {
  const [step, setStep] = useState<"hidden" | "pick" | "tips">("hidden");
  const [pick, setPick] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- флаг из localStorage доступен только в браузере
  useEffect(() => setStep(readPrefs().onboarded ? "hidden" : "pick"), []);

  if (step === "hidden") return null;
  const chosen = USE_CASES.find((u) => u.id === pick);

  return (
    <section aria-label="Знакомство с KURAI" className="fx-flicker-border w-full max-w-3xl border border-acc-line bg-g1 p-4">
      {step === "pick" ? (
        <div className="flex flex-col gap-3">
          <Label className="text-acc">Шаг 1 из 2 · настроим под вас</Label>
          <p className="text-[15px]">Для чего вам KURAI?</p>
          <div role="radiogroup" aria-label="Задача" className="flex flex-wrap gap-2">
            {USE_CASES.map((u) => (
              <button
                key={u.id}
                type="button"
                role="radio"
                aria-checked={pick === u.id}
                onClick={() => setPick(u.id)}
                className={cn("cursor-pointer border px-3 py-1.5 text-[13px]", pick === u.id ? "border-acc-line bg-acc-soft text-acc" : "border-line text-ink2 hover:text-ink")}
              >
                {u.label}
              </button>
            ))}
          </div>
          {chosen ? <SysLine tone="acc" decode key={chosen.id}>{`настроится: ${chosen.setup}`}</SysLine> : <SysLine>выберите вариант — покажем, что настроится</SysLine>}
          <div className="flex gap-2">
            <Button variant="primary" size="sm" disabled={!chosen} onClick={() => { if (chosen) writePrefs({ useCase: chosen.id, model: chosen.model }); setStep("tips"); }}>
              Дальше
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { writePrefs({ onboarded: true }); setStep("hidden"); }}>
              Пропустить
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Label className="text-acc">Шаг 2 из 2 · три вещи, которые стоит знать</Label>
          <ol className="flex flex-col gap-2">
            {TIPS.map((t, i) => (
              <li key={t} className="flex gap-3 text-[14px]">
                <span className="font-mono text-[12px] text-acc">{String(i + 1).padStart(2, "0")}</span>
                <Decode text={t} duration={300 + i * 120} />
              </li>
            ))}
          </ol>
          <Button variant="primary" size="sm" className="w-max" onClick={() => { writePrefs({ onboarded: true }); setStep("hidden"); }}>
            Понятно, начнём
          </Button>
        </div>
      )}
    </section>
  );
}
