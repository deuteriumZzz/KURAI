"use client";

import { Button } from "@/components/ui/button";
import { Label, SysLine, useFx } from "@/components/fx/primitives";
import { useState } from "react";

/** Карточка для соцсетей (фоторежим): статистика в рамке со знаком KURAI. */
export function ShareCard({ lines }: { lines: string[] }) {
  const [ref, flick] = useFx<HTMLDivElement>("fx-flicker-border");
  const [ready, setReady] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div ref={ref} className="fx-halftone relative flex aspect-[4/5] max-w-xs flex-col justify-between border border-line2 bg-g1 p-5">
        <Label className="text-acc">Мой месяц в KURAI</Label>
        <div className="flex flex-col gap-1.5">
          {lines.map((l) => (
            <p key={l} className="font-mono text-[13px] text-ink">
              {l}
            </p>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-brand text-[13px] font-medium tracking-[0.42em]">
            KUR<span className="text-acc">A</span>I
          </span>
          <Label>kurai.ai</Label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            flick();
            setReady(true);
          }}
        >
          Собрать карточку
        </Button>
        {ready && <SysLine tone="acc" decode>карточка 1080×1350 готова к публикации</SysLine>}
      </div>
    </div>
  );
}
