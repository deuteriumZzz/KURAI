"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { useCalm } from "@/lib/use-calm";

const ROWS = 11;
const GAP = 38;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

/**
 * Финал: строки с провайдерами каталога сходятся к одной лаймовой линии и гаснут, не налезая
 * друг на друга; линия сжимается, из неё появляется вход. Тот же мотив, что на первом экране.
 * В спокойном режиме — сразу итог: заголовок, короткая линия, кнопки.
 */
export function FinalCall({ names }: { names: string[] }) {
  const calm = useCalm();
  const track = useRef<HTMLDivElement>(null);
  const rowsBox = useRef<HTMLDivElement>(null);
  const bus = useRef<HTMLElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const tail = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const motion = !calm && names.length > 0;

  const rows = Array.from({ length: ROWS }, (_, i) => {
    const shift = names.length ? i % names.length : 0;
    const line = [...names.slice(shift), ...names.slice(0, shift)].join("   ·   ");
    return [line, line, line].join("   ·   ");
  });

  const draw = (f: number) => {
    const box = rowsBox.current;
    const line = bus.current;
    if (!box || !line || !head.current || !tail.current) return;
    const W = box.clientWidth;
    const cy = line.getBoundingClientRect().top - box.getBoundingClientRect().top;
    const els = [...box.children] as HTMLElement[];
    const size = els.map((el) => [el.offsetWidth, el.offsetHeight] as const);
    // строки сходятся к линии и гаснут раньше, чем начнут налезать друг на друга
    const conv = smooth(clamp01(f / 0.5));
    const fade = 1 - clamp01((conv - 0.45) / 0.3);
    els.forEach((el, i) => {
      const [w, h] = size[i]!;
      const x = (W - w) / 2 + (i % 2 ? 1 : -1) * (1 - f) * 240;
      const y = cy + (i - (ROWS - 1) / 2) * GAP * (1 - conv) - h / 2;
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      el.style.opacity = ((0.3 + 0.4 * conv) * fade).toFixed(3);
      el.toggleAttribute("data-hot", conv > 0.4);
    });
    const grow = smooth(clamp01((f - 0.32) / 0.2));
    const shrink = smooth(clamp01((f - 0.6) / 0.14));
    line.style.setProperty("--bo", grow.toFixed(3));
    line.style.setProperty("--bx", (grow * (1 - (1 - 220 / W) * shrink)).toFixed(4));
    const co = smooth(clamp01((f - 0.68) / 0.16));
    for (const el of [head.current, tail.current]) {
      el.style.opacity = co.toFixed(3);
      el.style.transform = `translateY(${((1 - co) * 16).toFixed(1)}px)`;
      el.style.visibility = co > 0.01 ? "visible" : "hidden";
    }
  };

  useMotionValueEvent(scrollYProgress, "change", (f) => motion && draw(f));
  useEffect(() => {
    if (!motion) {
      // итоговое состояние, если движение выключили, пока страница открыта
      for (const el of [head.current, tail.current, bus.current]) el?.removeAttribute("style");
      return;
    }
    const redraw = () => draw(scrollYProgress.get());
    redraw();
    addEventListener("resize", redraw);
    return () => removeEventListener("resize", redraw);
  }, [motion, scrollYProgress]);

  return (
    <section aria-labelledby="fin-title">
      <div ref={track} className={motion ? "h-[240vh]" : undefined}>
        <div className={motion ? "sticky top-0 grid h-dvh place-items-center overflow-hidden" : "py-28"}>
          {motion && (
            <div ref={rowsBox} aria-hidden="true" className="pointer-events-none absolute inset-0">
              {rows.map((r, i) => (
                <div key={i} className="k-fin-row">
                  {r}
                </div>
              ))}
            </div>
          )}
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 text-center sm:px-6">
            <div ref={head}>
              <p className="k-index">K/04 · Начать</p>
              <h2 id="fin-title" className="mt-4 text-[clamp(2.1rem,5vw,4rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
                Сотни нейросетей — один чат
              </h2>
            </div>
            <span aria-hidden="true" className="relative my-8 block h-px w-full">
              <i ref={bus} className="k-bus" />
            </span>
            <div ref={tail} className="flex flex-col items-center">
              <p className="max-w-[34rem] text-[16px] leading-relaxed text-ink2">Регистрация по email, 10 кредитов на баланс сразу. Подписка не нужна.</p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
                <Link href="/register" className="fx-chamfer fx-sheen inline-flex h-12 items-center rounded-(--radius-sm) bg-acc px-5 text-[15px] font-semibold text-acc-ink [--ch:var(--chamfer-sm)]">
                  Создать аккаунт
                </Link>
                <Link href="/login" className="inline-flex min-h-11 items-center text-[14px] text-ink2 hover:text-ink">
                  Войти
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
