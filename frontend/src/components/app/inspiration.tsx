"use client";

import type { Inspiration } from "@/mocks/inspiration";

/** Процедурная обложка: сетка/солнце/волна/столбцы/кольца/город — линии акцентом на графите. */
export function Art({ kind, seed, tone = "lime" }: { kind: Inspiration["art"]; seed: number; tone?: "lime" | "magenta" | "violet" }) {
  const acc = tone === "magenta" ? "rgb(var(--kurai-magenta-rgb))" : tone === "violet" ? "rgb(var(--kurai-violet-rgb))" : "var(--color-acc)";
  const line = "var(--color-line2)";
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`g${seed}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-g1)" />
          <stop offset="1" stopColor="var(--color-g2)" />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#g${seed})`} />
      {kind === "grid" && Array.from({ length: 9 }, (_, i) => <line key={i} x1={80} y1={40} x2={-40 + i * 30} y2={100} stroke={line} />)}
      {kind === "grid" && [55, 66, 80, 98].map((y) => <line key={y} x1={0} x2={160} y1={y} y2={y} stroke={line} />)}
      {kind === "sun" && [0, 1, 2, 3, 4].map((i) => <line key={i} x1={40} x2={120} y1={58 + i * 5} y2={58 + i * 5} stroke={i < 2 ? acc : line} />)}
      {kind === "sun" && <circle cx={80} cy={50} r={22} fill="none" stroke={acc} />}
      {kind === "wave" && [0, 1, 2].map((k) => <path key={k} d={`M0 ${55 + k * 10} ${Array.from({ length: 8 }, (_, i) => `Q ${i * 20 + 10} ${45 + k * 10 + (i % 2 ? 12 : -12)} ${i * 20 + 20} ${55 + k * 10}`).join(" ")}`} fill="none" stroke={k === 1 ? acc : line} />)}
      {kind === "bars" && Array.from({ length: 10 }, (_, i) => <rect key={i} x={18 + i * 13} y={80 - ((i * 37) % 50)} width={7} height={(i * 37) % 50} fill={i === 6 ? acc : line} />)}
      {kind === "rings" && [12, 22, 32, 42].map((r) => <circle key={r} cx={80} cy={50} r={r} fill="none" stroke={r === 22 ? acc : line} />)}
      {kind === "rings" && <rect x={77} y={47} width={6} height={6} fill={acc} />}
      {kind === "city" && Array.from({ length: 9 }, (_, i) => <rect key={i} x={10 + i * 16} y={40 + ((i * 29) % 35)} width={12} height={60} fill="none" stroke={i === 4 ? acc : line} />)}
      {kind === "city" && <line x1={0} x2={160} y1={82} y2={78} stroke={acc} />}
    </svg>
  );
}
