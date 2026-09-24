"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ModeIcon } from "@/components/brand/mode-icons";
import { Art } from "@/components/app/inspiration";
import { Label, Segments, SysLine } from "@/components/fx/primitives";
import { cn } from "@/lib/cn";
import type { Mode } from "@/types/api";

const TABS: { id: Mode; label: string; prompt: string }[] = [
  { id: "text", label: "Текст", prompt: "Объясни, как устроена себестоимость ответа нейросети" },
  { id: "image", label: "Изображение", prompt: "Обложка подкаста: неон, минимализм, 1:1" },
  { id: "video", label: "Видео", prompt: "Оживи обложку: медленный наезд, 8 с" },
  { id: "slides", label: "Слайды", prompt: "Питч-дек кофейни на 5 слайдов" },
];

/** Вкладки режимов на лендинге: один промпт → результат режима. Примеры, не пользовательские данные. */
export function ModeTabs() {
  const [tab, setTab] = useState<Mode>("text");
  const cur = TABS.find((t) => t.id === tab) ?? TABS[0]!;
  return (
    <section aria-labelledby="modes-title" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <Label className="text-acc">Режимы</Label>
      <h2 id="modes-title" className="mt-2 mb-6 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-extralight">
        Один чат — шесть режимов
      </h2>
      <div role="tablist" aria-label="Режимы" className="isolate flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="mode-panel"
            onClick={() => setTab(t.id)}
            className={cn("relative inline-flex cursor-pointer items-center gap-2 border px-3.5 py-2 text-[13.5px]", tab === t.id ? "border-acc-line text-acc" : "border-line text-ink2 hover:text-ink")}
          >
            {tab === t.id && <motion.span layoutId="landing-tab" aria-hidden="true" className="absolute inset-0 -z-10 bg-acc-soft" />}
            <ModeIcon mode={t.id} size={14} />
            {t.label}
          </button>
        ))}
      </div>
      <div id="mode-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-4 border border-line bg-g1">
        <div className="border-b border-line px-4 py-3 text-[14px]">
          <span className="mr-2 font-mono text-acc">›</span>
          {cur.prompt}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="min-h-72 p-4 sm:p-5">
            {tab === "text" && (
              <div className="flex max-w-2xl flex-col gap-3 text-[14.5px] leading-relaxed">
                <SysLine>Claude Sonnet 5 · EU-01 · 240 мс</SysLine>
                <p>
                  Цена ответа складывается из <b className="text-ink">токенов на входе</b> (ваш вопрос и история чата) и <b className="text-ink">токенов на выходе</b> (сам ответ).
                  Длинная переписка дорожает — поэтому KURAI показывает шкалу контекста и предлагает сжать историю.
                </p>
                <Label>2 кр · 3,1 с</Label>
              </div>
            )}
            {tab === "image" && (
              <div className="grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
                {(["sun", "rings", "grid", "city"] as const).map((a, i) => (
                  <div key={a} className="aspect-square overflow-hidden border border-line">
                    <Art kind={a} seed={40 + i} />
                  </div>
                ))}
              </div>
            )}
            {tab === "video" && (
              <div className="flex max-w-xl flex-col gap-3">
                <div className="aspect-video overflow-hidden border border-line">
                  <Art kind="wave" seed={60} />
                </div>
                <Segments value={1} count={16} label="Видео готово" />
                <SysLine tone="acc">Veo 3 · 8 с · 16:9 · готово</SysLine>
              </div>
            )}
            {tab === "slides" && (
              <div className="grid gap-2 sm:grid-cols-3">
                {["Кофейня «Нейрон»", "Рынок и спрос", "Экономика точки"].map((t, i) => (
                  <div key={t} className="relative flex aspect-video flex-col justify-between border border-line bg-bg p-3">
                    <Label className="text-acc">0{i + 1}</Label>
                    <p className="font-display text-base font-light">{t}</p>
                    <span aria-hidden="true" className="absolute right-3 bottom-3 h-px w-10 bg-acc" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
