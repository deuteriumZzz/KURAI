"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Label } from "@/components/fx/primitives";
import { LANDING_MODES } from "@/lib/landing-content";
import { useCalm } from "@/lib/use-calm";
import { SPRING } from "@/lib/motion";

/** Пример для каждого готового режима: запрос и то, как выглядит ответ. Иллюстрация интерфейса, не результат модели. */
const SCRIPT: Record<string, { prompt: string; reply: string[] }> = {
  text: { prompt: "Сравни три тарифа хостинга для небольшого магазина", reply: ["Сначала соберу цены и лимиты каждого тарифа,", "затем сведу их в таблицу и отмечу, где переплата."] },
  research: { prompt: "Собери источники о спросе на кофе навынос", reply: ["читаю источники · отраслевой обзор", "читаю источники · городская статистика", "сверяю выводы со сносками"] },
  image: { prompt: "Обложка: тёмный графит и одна лаймовая линия", reply: [] },
  slides: { prompt: "Презентация на 8 слайдов о запуске продукта", reply: ["01 проблема · 02 решение · 03 рынок", "04 продукт · 05 деньги · 06 план"] },
};

/**
 * 43/44 — закреплённая секция: пока посетитель листает, поле стоит на месте,
 * запрос печатается со скоростью прокрутки, ниже идёт ответ, режимы сменяются по очереди.
 */
export function ScrollStory() {
  const calm = useCalm();
  const root = useRef<HTMLElement>(null);
  const modes = LANDING_MODES.slice(0, 3);
  const [p, setP] = useState(0);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setP(Math.round(v * 400) / 400));

  const seg = calm ? 0 : Math.min(modes.length - 1, Math.floor(p * modes.length));
  const local = calm ? 1 : p * modes.length - seg;
  const mode = modes[seg];
  const script = SCRIPT[mode?.id ?? "text"] ?? SCRIPT.text!;
  const typed = Math.round(Math.min(1, local / 0.45) * script.prompt.length);
  const answer = Math.max(0, Math.min(1, (local - 0.45) / 0.4));

  return (
    <section ref={root} aria-label="Как KURAI работает с запросом" className={calm ? "relative" : "relative h-[340vh]"}>
      <div className={calm ? "py-20" : "sticky top-0 flex h-dvh items-center"}>
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <Label className="text-acc">Прокрутите — запрос печатается сам</Label>
          {/* 44 — метка режима переезжает к текущему режиму */}
          <div role="tablist" aria-label="Режимы" className="mt-5 flex gap-1">
            {modes.map((m, i) => (
              <span key={m.id} role="tab" aria-selected={i === seg} className="relative px-3 py-1.5 font-mono text-[12px] tracking-[0.06em] text-ink2">
                {i === seg && <motion.i layoutId="k-story-mode" className="absolute inset-0 -z-0 rounded-(--radius-sm) bg-acc-soft" transition={SPRING.snappy} />}
                <span className={i === seg ? "relative text-ink" : "relative"}>{m.label}</span>
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-(--radius-lg) border border-line2 bg-g1 p-5">
            <p className="min-h-[3.4rem] text-[clamp(1.05rem,2.2vw,1.35rem)] leading-snug text-ink">
              {script.prompt.slice(0, typed)}
              {typed < script.prompt.length && <span className="fx-caret text-acc">▍</span>}
              {typed === 0 && (
                <AnimatePresence mode="wait">
                  <motion.span key={mode?.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-ink3">
                    {mode?.description}
                  </motion.span>
                </AnimatePresence>
              )}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 font-mono text-[11.5px] text-ink3">
              <span>{mode?.label} · оценка до запуска</span>
              <span className={typed === script.prompt.length ? "text-acc" : undefined}>↵ отправить</span>
            </div>
          </div>
          <div className="mt-6 min-h-40">
            {mode?.id === "image" ? (
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <motion.i
                    key={i}
                    aria-hidden="true"
                    className="aspect-square rounded-(--radius-sm) border border-line"
                    style={{ background: "linear-gradient(135deg, var(--color-g2), var(--color-g1) 60%, var(--color-acc-soft))", clipPath: `inset(${(1 - Math.min(1, Math.max(0, answer * 4 - i))) * 100}% 0 0 0)` }}
                  />
                ))}
              </div>
            ) : (
              <ul className="flex flex-col gap-2 text-[15px] leading-relaxed text-ink2">
                {script.reply.map((line, i) => {
                  const share = Math.min(1, Math.max(0, answer * script.reply.length - i));
                  return share > 0 ? (
                    <li key={line} className={mode?.id === "research" ? "font-mono text-[12.5px] text-ink3" : undefined}>
                      {line.slice(0, Math.round(share * line.length))}
                    </li>
                  ) : null;
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
