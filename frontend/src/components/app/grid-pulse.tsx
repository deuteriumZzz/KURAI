"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { isCalm } from "@/lib/motion";

/** Импульс по сетке фона: одна волна света от поля ввода при отправке (~0,7 с). */
export function GridPulse() {
  const [pulses, setPulses] = useState<{ id: number; x: number; y: number }[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      if (isCalm()) return;
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      const id = n++;
      setPulses((p) => [...p, { id, x, y }]);
      setTimeout(() => setPulses((p) => p.filter((q) => q.id !== id)), 900);
    };
    window.addEventListener("kurai:pulse", on);
    return () => window.removeEventListener("kurai:pulse", on);
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <AnimatePresence>
        {pulses.map((p) => (
          <motion.span
            key={p.id}
            initial={{ scale: 0.1, opacity: 0.55 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute size-[1400px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: p.x,
              top: p.y,
              background: "radial-gradient(circle, transparent 55%, rgb(0 232 240 / 0.14) 62%, transparent 68%)",
              maskImage:
                "linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)",
              maskSize: "56px 56px",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
