"use client";

import { useRef, type ReactNode } from "react";
import { isCalm } from "@/lib/motion";

/** Магнитная кнопка: слегка тянется к курсору (до 6px) и возвращается. Только мышь, не в спокойном режиме. */
export function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      className={`inline-block transition-transform duration-(--dur-base) ease-(--ease-out) ${className ?? ""}`}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || isCalm() || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const dx = ((e.clientX - r.left) / r.width - 0.5) * 12;
        const dy = ((e.clientY - r.top) / r.height - 0.5) * 12;
        ref.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }}
      onPointerLeave={() => ref.current && (ref.current.style.transform = "")}
    >
      {children}
    </span>
  );
}
