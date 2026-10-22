"use client";

import { useEffect, useRef } from "react";
import { useCalm } from "@/lib/use-calm";

const WORD = "нейросетей";
/** Почерки перебора: каждый шрифт — как отдельная модель; классы описаны в globals.css (.k-cycle). */
const FACES = ["serif", "mono", "cond", "pixel", "thin", "wide"] as const;
const NOISE = "▓▒░/<>_#|=+";

/**
 * Заголовок первого экрана: «нейросетей» перебирает шрифты, ловит глитч и встаёт в один,
 * строка раздаётся вширь, буквы «в одном чате» съезжаются. Один раз, около 3 секунд.
 * Когда закончил — событие «kurai:hero-ready», после него модели слетаются в «Авто».
 * В спокойном режиме сразу итог. Скринридер читает только aria-label.
 */
export function HeroTitle() {
  const calm = useCalm();
  const root = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const title = root.current;
    const final = title?.querySelector<HTMLElement>("[data-final]");
    if (!title || !final) return;
    const faces = [...title.querySelectorAll<HTMLElement>("[data-face]"), final];
    const cycle = final.parentElement!;
    const show = (i: number) => faces.forEach((face, j) => face.toggleAttribute("data-on", j === i));
    const ready = () => window.dispatchEvent(new Event("kurai:hero-ready"));
    const settle = () => {
      final.textContent = WORD;
      final.removeAttribute("data-glitch");
      cycle.setAttribute("data-settled", "");
      title.setAttribute("data-wide", "");
    };
    if (calm) {
      show(faces.length - 1);
      settle();
      ready();
      return;
    }

    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const scramble = (kept: number) => [...WORD].map((ch, i) => (i < kept ? ch : NOISE[Math.floor(Math.random() * NOISE.length)])).join("");
    let live = true;

    void document.fonts.ready.then(() => {
      if (!live) return;
      // перебор ускоряется к середине и замедляется перед остановкой
      const steps = 14;
      let at = 300;
      for (let n = 0; n < steps; n++) {
        later(() => show(n % (faces.length - 1)), at);
        at += 70 + Math.abs(n - steps / 2) * 14;
      }
      // глитч: финальный шрифт, срезы и пара кадров служебных символов
      later(() => {
        show(faces.length - 1);
        cycle.setAttribute("data-settled", "");
        final.textContent = scramble(0);
        final.setAttribute("data-glitch", "");
      }, at);
      later(() => (final.textContent = scramble(4)), at + 120);
      later(() => (final.textContent = scramble(8)), at + 240);
      later(() => (final.textContent = WORD), at + 360);
      later(settle, at + 500);
      later(ready, at + 1900);
    });

    return () => {
      live = false;
      timers.forEach(clearTimeout);
      final.textContent = WORD;
    };
  }, [calm]);

  return (
    <h1 ref={root} aria-label="Сотни нейросетей в одном чате" className="k-hero-title">
      <span aria-hidden="true" className="k-hero-big">
        Сотни{" "}
        <span className="k-cycle">
          {FACES.map((face) => (
            <i key={face} data-face={face}>
              {WORD}
            </i>
          ))}
          <i data-final data-on data-text={WORD}>
            {WORD}
          </i>
        </span>
      </span>
      <span aria-hidden="true" className="k-hero-line">
        в одном чате
        <i className="k-hero-caret" />
      </span>
    </h1>
  );
}
