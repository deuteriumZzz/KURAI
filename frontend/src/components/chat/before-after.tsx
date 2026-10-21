"use client";

import { useId, useState } from "react";
import { Label } from "@/components/fx/primitives";

/** Сравнение «до / после» ползунком (апскейл, правка). Ползунок — нативный range: клавиатура и скринридер из коробки. */
export function BeforeAfter({ before, after, alt }: { before: string; after: string; alt: string }) {
  const [pos, setPos] = useState(50);
  const id = useId();
  return (
    <figure className="flex max-w-lg flex-col gap-2">
      <div className="relative aspect-square overflow-hidden border border-line select-none rounded-(--radius-md)">
        {/* eslint-disable-next-line @next/next/no-img-element -- локальные превью */}
        <img src={after} alt={`После: ${alt}`} className="absolute inset-0 h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element -- локальные превью */}
        <img
          src={before}
          alt={`До: ${alt}`}
          className="absolute inset-0 h-full w-full object-cover [image-rendering:pixelated]"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)`, filter: "blur(1.2px) saturate(0.8)" }}
        />
        <span aria-hidden="true" className="absolute inset-y-0 w-px bg-acc shadow-[0_0_10px_var(--color-acc)]" style={{ left: `${pos}%` }} />
        <Label className="absolute top-2 left-2 bg-bg/80 px-1.5">до</Label>
        <Label className="absolute top-2 right-2 bg-bg/80 px-1.5 text-acc">после · 4K</Label>
      </div>
      <label htmlFor={id} className="fx-sr">
        Положение сравнения
      </label>
      <input id={id} type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="h-6 w-full cursor-ew-resize accent-(--color-acc)" />
    </figure>
  );
}
