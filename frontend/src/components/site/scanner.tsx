"use client";

import { useEffect, useRef, useState } from "react";
import { isCalm } from "@/lib/motion";

/** Мини-сканер для 404: прицел следует за курсором, уровень сигнала «ищет» и не находит страницу. */
export function Scanner() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [sig, setSig] = useState(0);

  useEffect(() => {
    if (isCalm()) return;
    const t = setInterval(() => setSig(Math.round(Math.random() * 18)), 220);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      className="relative h-40 w-full max-w-md overflow-hidden border border-line bg-g1"
      style={{
        backgroundImage: "linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <span className="absolute inset-y-0 w-px bg-acc-line" style={{ left: `${pos.x}%` }} />
      <span className="absolute inset-x-0 h-px bg-acc-line" style={{ top: `${pos.y}%` }} />
      <span className="absolute size-6 -translate-x-1/2 -translate-y-1/2 border border-acc" style={{ left: `${pos.x}%`, top: `${pos.y}%` }} />
      <span className="absolute bottom-2 left-2 font-mono text-[10.5px] text-ink3">
        X {Math.round(pos.x)} · Y {Math.round(pos.y)} · сигнал {sig}% · страница не найдена
      </span>
    </div>
  );
}
