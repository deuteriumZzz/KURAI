import type { ReactNode } from "react";
import { Label, Scanline } from "./primitives";

/** Пустое состояние: HUD-иллюстрация (рамка, прицел, делениe) с медленной скан-линией. */
export function EmptyState({ title, hint, action, compact = false }: { title: string; hint?: string; action?: ReactNode; compact?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div aria-hidden="true" className={`relative overflow-hidden border border-line bg-g1 ${compact ? "h-20 w-28" : "h-28 w-40"}`}>
        <Scanline active />
        <svg viewBox="0 0 160 112" className="h-full w-full">
          <path d="M8 22V8h14M152 90v14h-14" className="stroke-acc" fill="none" strokeWidth="1.5" />
          <circle cx="80" cy="56" r="20" className="stroke-line2" fill="none" />
          <path d="M80 28v12M80 72v12M52 56h12M96 56h12" className="stroke-line2" />
          <rect x="77" y="53" width="6" height="6" className="fill-acc" />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={20 + i * 10} y={100} width={6} height={3} className={i < 4 ? "fill-acc" : "fill-line"} />
          ))}
        </svg>
      </div>
      <Label className="text-acc">Пусто</Label>
      <p className={compact ? "text-[14px]" : "font-display text-xl font-light"}>{title}</p>
      {hint && <p className="max-w-md text-[13.5px] text-ink2">{hint}</p>}
      {action}
    </div>
  );
}
