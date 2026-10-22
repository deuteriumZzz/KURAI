"use client";

import { useRef, type ComponentProps, type CSSProperties } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { useCalm } from "@/lib/use-calm";

/** Слой экрана: x, y, w, h в % кадра; разлёт по x, y, z в px; скругление; подпись. */
const LAYERS: [number, number, number, number, number, number, number, string, string][] = [
  [0, 0, 18.85, 100, -60, 20, 20, "11px 0 0 11px", "01 · Чаты и проекты"],
  [18.85, 35.5, 81.15, 50.9, 40, 0, 75, "0", "02 · Ответ, модель и цена"],
  [18.85, 6.4, 81.15, 29.1, 20, -30, 110, "0", "03 · Вопрос"],
  [18.85, 86.4, 81.15, 13.6, 10, 70, 140, "0 0 11px 0", "04 · Поле ввода"],
  [18.85, 0, 81.15, 6.4, 0, -40, 165, "0 11px 0 0", "05 · Шапка"],
];

/** Подписи на собранном экране: точка у элемента (% кадра), подпись — в пустое поле. */
const PINS: { x: number; y: number; side?: "left"; text: string }[] = [
  { x: 37.2, y: 39.2, side: "left", text: "Кто ответил" },
  { x: 39.6, y: 63.2, side: "left", text: "Сколько стоил ответ" },
  { x: 16, y: 73, text: "Все чаты сохраняются" },
  { x: 40, y: 90.4, text: "Пишите как обычно" },
];

/**
 * Скриншот кабинета, разобранный на слои, как чертёж. По мере прокрутки слои съезжаются
 * и защёлкиваются в настоящий экран — всё соединяется в одно. Один CSS-параметр --k ведёт
 * всю сборку; в спокойном режиме и при «уменьшить движение» экран сразу собран.
 */
export function ProductStage({ img }: { img: ComponentProps<"img"> }) {
  const calm = useCalm();
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start 0.9", "start 0.15"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (calm || !stage.current || !frame.current) return;
    const k = (1 - v) ** 2;
    frame.current.style.setProperty("--k", k.toFixed(4));
    stage.current.toggleAttribute("data-flat", k < 0.015);
  });

  return (
    <div ref={stage} className="k-stage" data-flat={calm || undefined}>
      <div ref={frame} className="k-frame">
        <div className="k-frame-plate" aria-hidden="true" />
        <div className="k-slices" aria-hidden="true">
          {LAYERS.map(([x, y, w, h, ex, ey, ez, radius, tag]) => (
            <div
              key={tag}
              className="k-slice"
              style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, borderRadius: radius, "--ex": `${ex}px`, "--ey": `${ey}px`, "--ez": `${ez}px` } as CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- тот же оптимизированный кадр, что и основной, кусками */}
              <img src={img.src} srcSet={img.srcSet} sizes={img.sizes} alt="" decoding="async" style={{ width: `${10000 / w}%`, left: `${(-100 * x) / w}%`, top: `${(-100 * y) / h}%` }} />
              <b>{tag}</b>
            </div>
          ))}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- свойства и alt приходят из getImageProps */}
        <img {...img} className="k-frame-base" />
        {PINS.map((p) => (
          <span key={p.text} aria-hidden="true" className="k-pin" data-side={p.side} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <i />
            <b>{p.text}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
