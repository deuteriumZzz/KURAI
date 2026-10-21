"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ModeIcon } from "@/components/brand/mode-icons";
import { Art } from "@/components/app/inspiration";
import { Label, SysLine } from "@/components/fx/primitives";
import { cn } from "@/lib/cn";
import { LANDING_MODES } from "@/lib/landing-content";
import type { Mode } from "@/types/api";

const TAB_PROMPTS: Record<Mode, string> = {
  text: "Объясни, как устроена себестоимость ответа нейросети",
  image: "Обложка подкаста: ночной город, минимализм, квадрат",
  video: "",
  audio: "",
  research: "Собери опорные источники и тезисы для решения команды",
  slides: "Собери структуру короткого питча для новой идеи",
};

const TABS = LANDING_MODES.map((mode) => ({ id: mode.id, label: mode.label, prompt: TAB_PROMPTS[mode.id] }));

/** Вкладки режимов на лендинге: один промпт → результат режима. Примеры, не пользовательские данные. */
export function ModeTabs() {
  const [tab, setTab] = useState<Mode>("text");
  const cur = TABS.find((t) => t.id === tab) ?? TABS[0]!;
  return (
    <section aria-labelledby="modes-title" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <Label className="text-acc">Режимы</Label>
      <h2 id="modes-title" className="mt-2 mb-6 font-display text-[clamp(2.1rem,4vw,3.1rem)] font-medium">
        Один контекст — четыре готовых режима
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
            className={cn("relative inline-flex cursor-pointer items-center gap-2 border px-3.5 py-2 text-[13.5px] rounded-(--radius-sm)", tab === t.id ? "border-acc-line text-acc" : "border-line text-ink2 hover:text-ink")}
          >
            {tab === t.id && <motion.span layoutId="landing-tab" aria-hidden="true" className="absolute inset-0 -z-10 bg-acc-soft rounded-(--radius-sm)" />}
            <ModeIcon mode={t.id} size={14} />
            {t.label}
          </button>
        ))}
      </div>
      <div id="mode-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-4 border border-line bg-g1 rounded-(--radius-md)">
        <div className="border-b border-line px-4 py-3 text-[14px]">
          <span className="mr-2 font-mono text-acc">›</span>
          {cur.prompt}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="min-h-72 p-4 sm:p-5">
            {tab === "text" && (
              <div className="flex max-w-2xl flex-col gap-3 text-[14.5px] leading-relaxed">
                <SysLine>Режим: текст · модель выбираете вы</SysLine>
                <p>
                  Соберите задачу в одном месте, выберите модель под неё и продолжайте разговор без потери контекста. Перед запуском KURAI показывает оценку работы.
                </p>
                <Label>ответ · ветка · следующий шаг</Label>
              </div>
            )}
            {tab === "research" && (
              <div className="grid max-w-2xl gap-px border border-line bg-line sm:grid-cols-[0.9fr_1.1fr] rounded-(--radius-md) overflow-hidden">
                <div className="bg-g1 p-4">
                  <Label className="text-acc">контур вопроса</Label>
                  <p className="mt-5 text-[14px] leading-relaxed text-ink2">Границы темы, допущения и нужный формат результата остаются видимыми рядом с ходом работы.</p>
                </div>
                <div className="bg-bg p-4">
                  <Label>опоры</Label>
                  <ol className="mt-4 flex flex-col gap-3 text-[13px] text-ink2">
                    <li><span className="mr-2 text-acc">01</span>Источники и заметки</li>
                    <li><span className="mr-2 text-acc">02</span>Собранные тезисы</li>
                    <li><span className="mr-2 text-acc">03</span>Проверяемый вывод</li>
                  </ol>
                </div>
              </div>
            )}
            {tab === "image" && (
              <div className="grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
                {(["sun", "rings", "grid", "city"] as const).map((a, i) => (
                  <div key={a} className="aspect-square overflow-hidden border border-line rounded-(--radius-md)">
                    <Art kind={a} seed={40 + i} />
                  </div>
                ))}
              </div>
            )}
            {tab === "slides" && (
              <div className="grid gap-2 sm:grid-cols-3">
                {["Кофейня «Нейрон»", "Рынок и спрос", "Экономика точки"].map((t, i) => (
                  <div key={t} className="relative flex aspect-video flex-col justify-between border border-line bg-bg p-3 rounded-(--radius-md)">
                    <Label className="text-acc">0{i + 1}</Label>
                    <p className="text-[15px] font-medium">{t}</p>
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
