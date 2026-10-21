"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { ModeIcon } from "@/components/brand/mode-icons";
import { useCalm } from "@/lib/use-calm";
import { SPRING } from "@/lib/motion";
import type { Mode } from "@/types/api";

/** Пример для режимов, которые работают на любом сервере: запрос и то, как выглядит ответ. Иллюстрация интерфейса, не результат модели. */
const STORY: { id: Mode; label: string; hint: string; prompt: string; reply: string[] }[] = [
  {
    id: "text",
    label: "Текст",
    hint: "Спросите что угодно — модель помнит всё, что было выше.",
    prompt: "Сравни три тарифа хостинга для небольшого магазина",
    reply: ["Сначала соберу цены и лимиты каждого тарифа,", "затем сведу их в таблицу и отмечу, где переплата."],
  },
  {
    id: "research",
    label: "Deep Research",
    hint: "Модель ищет и читает источники, план обновляется по ходу.",
    prompt: "Собери источники о спросе на кофе навынос",
    reply: ["читаю источники · отраслевой обзор", "читаю источники · городская статистика", "сверяю выводы со сносками"],
  },
  {
    id: "slides",
    label: "Слайды",
    hint: "Презентация из того, что уже обсудили в чате.",
    prompt: "Презентация на 8 слайдов о запуске продукта",
    reply: ["01 проблема · 02 решение · 03 рынок", "04 продукт · 05 деньги · 06 план"],
  },
];

/**
 * 43/44 — закреплённая секция: пока посетитель листает, поле стоит на месте,
 * запрос печатается со скоростью прокрутки, ниже идёт ответ, режимы сменяются по очереди.
 */
export function ScrollStory() {
  const calm = useCalm();
  const root = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setP(Math.round(v * 400) / 400));

  const seg = calm ? 0 : Math.min(STORY.length - 1, Math.floor(p * STORY.length));
  const local = calm ? 1 : p * STORY.length - seg;
  const step = STORY[seg]!;
  const typed = Math.round(Math.min(1, local / 0.45) * step.prompt.length);
  const answer = Math.max(0, Math.min(1, (local - 0.45) / 0.4));

  return (
    <section ref={root} aria-labelledby="story-title" className={calm ? "relative" : "relative h-[340vh]"}>
      <div className={calm ? "py-20" : "sticky top-0 flex h-dvh items-start pt-[max(4rem,10vh)]"}>
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <p className="k-index">K/02 · Как это работает</p>
          <h2 id="story-title" className="mt-3 font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-tight font-medium">
            Один чат для всей задачи
          </h2>
          {/* 44 — метка режима переезжает к текущему режиму */}
          <div role="tablist" aria-label="Режимы" className="mt-6 flex flex-wrap gap-1">
            {STORY.map((m, i) => (
              <span key={m.id} role="tab" aria-selected={i === seg} className="relative inline-flex h-9 items-center gap-2 px-3 text-[13px] text-ink2">
                {i === seg && <motion.i layoutId="k-story-mode" className="absolute inset-0 rounded-(--radius-sm) bg-acc-soft" transition={SPRING.snappy} />}
                <ModeIcon mode={m.id} size={15} className={i === seg ? "relative text-ink" : "relative text-ink3"} />
                <span className={i === seg ? "relative text-ink" : "relative"}>{m.label}</span>
              </span>
            ))}
          </div>
          <div className="k-composer mt-4 p-5">
            <p className="min-h-[3.4rem] text-[clamp(1.05rem,2.2vw,1.35rem)] leading-snug text-ink">
              {step.prompt.slice(0, typed)}
              {typed < step.prompt.length && <span className="fx-caret text-acc">▍</span>}
              {typed === 0 && (
                <AnimatePresence mode="wait">
                  <motion.span key={step.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-ink3">
                    {step.hint}
                  </motion.span>
                </AnimatePresence>
              )}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[12px] text-ink3">
              <span className="k-code">{step.label} · цена до отправки</span>
              <span className={typed === step.prompt.length ? "k-code text-acc" : "k-code"}>↵ отправить</span>
            </div>
          </div>
          <ul className="mt-6 flex min-h-40 flex-col gap-2 text-[15px] leading-relaxed text-ink2">
            {step.reply.map((line, i) => {
              const share = Math.min(1, Math.max(0, answer * step.reply.length - i));
              return share > 0 ? (
                <li key={line} className={step.id === "research" ? "k-code text-[12.5px] text-ink3" : undefined}>
                  {line.slice(0, Math.round(share * line.length))}
                </li>
              ) : null;
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
