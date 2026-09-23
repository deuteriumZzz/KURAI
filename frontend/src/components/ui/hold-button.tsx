"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

/** Опасное действие: удерживайте кнопку (мышь, палец, пробел или Enter), пока не заполнится шкала. */
export function HoldButton({ label, doneLabel, onConfirm, duration = 1200 }: { label: string; doneLabel: string; onConfirm: () => void; duration?: number }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const raf = useRef(0);
  const start = useRef(0);

  function tick(now: number) {
    const k = Math.min(1, (now - start.current) / duration);
    setProgress(k);
    if (k >= 1) {
      setDone(true);
      onConfirm();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  }
  function begin() {
    if (done) return;
    start.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  }
  function end() {
    cancelAnimationFrame(raf.current);
    if (!done) setProgress(0);
  }
  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (down && !e.repeat) begin();
    if (!down) end();
  };

  return (
    <button
      type="button"
      disabled={done}
      onPointerDown={begin}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onKeyDown={(e) => onKey(e, true)}
      onKeyUp={(e) => onKey(e, false)}
      aria-describedby={undefined}
      className={cn(
        "relative h-11 cursor-pointer touch-none overflow-hidden border px-4 text-[13.5px] select-none",
        done ? "border-line text-ink3" : "border-err text-err",
      )}
    >
      <span aria-hidden="true" className="absolute inset-0 origin-left bg-err-soft" style={{ transform: `scaleX(${progress})` }} />
      <span className="relative">{done ? doneLabel : label}</span>
    </button>
  );
}
