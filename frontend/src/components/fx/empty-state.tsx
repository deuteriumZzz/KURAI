"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Label, Scanline } from "./primitives";
import { Decode } from "./decode";

const key = (title: string) => `kurai:drawn:${title}`;
const seen = (title: string) => {
  try {
    return sessionStorage.getItem(key(title)) === "1";
  } catch {
    return true;
  }
};

/** Пустое состояние: HUD-иллюстрация (рамка, прицел, делениe) с медленной скан-линией. */
export function EmptyState({ title, hint, action, compact = false }: { title: string; hint?: string; action?: ReactNode; compact?: boolean }) {
  // 85 — один раз за сеанс иллюстрация прорисовывается линией, затем появляются подсказка и действие
  // решение «рисовать или нет» принимается один раз на показ (ref переживает двойной запуск эффектов)
  const [draw, setDraw] = useState(true);
  const decided = useRef<boolean | null>(null);
  useLayoutEffect(() => {
    decided.current ??= !seen(title);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- до первой отрисовки: уже видели — без анимации
    if (!decided.current) setDraw(false);
    try {
      sessionStorage.setItem(key(title), "1");
    } catch {}
  }, [title]);
  return (
    <div className={`flex flex-col items-center gap-3 px-6 py-10 text-center ${draw ? "k-draw" : ""}`}>
      <div aria-hidden="true" className={`relative overflow-hidden rounded-(--radius-md) border border-line bg-g1 ${compact ? "h-20 w-28" : "h-28 w-40"}`}>
        <Scanline active />
        <svg viewBox="0 0 160 112" className="h-full w-full">
          <path pathLength={1} d="M8 22V8h14M152 90v14h-14" className="stroke-acc" fill="none" strokeWidth="1.5" />
          <circle pathLength={1} cx="80" cy="56" r="20" className="stroke-line2" fill="none" />
          <path pathLength={1} d="M80 28v12M80 72v12M52 56h12M96 56h12" className="stroke-line2" />
          <rect x="77" y="53" width="6" height="6" className="fill-acc" />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={20 + i * 10} y={100} width={6} height={3} className={i < 4 ? "fill-acc" : "fill-line"} />
          ))}
        </svg>
      </div>
      <Label className="k-draw-after text-acc">Пусто</Label>
      {/* К10 — заголовок пустого экрана собирается из кодов при первом показе */}
      <Decode as="p" text={title} duration={draw ? 520 : 0} className={compact ? "text-[14px]" : "font-display text-xl font-medium"} />
      {hint && <p className="k-draw-after max-w-md text-[13.5px] text-ink2">{hint}</p>}
      {action && <div className="k-draw-after">{action}</div>}
    </div>
  );
}
