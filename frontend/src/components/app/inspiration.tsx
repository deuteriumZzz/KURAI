"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { INSPIRATION, type Inspiration } from "@/mocks/inspiration";
import { Label } from "@/components/fx/primitives";

/** Процедурная обложка: сетка/солнце/волна/столбцы/кольца/город — линии акцентом на графите. */
function Art({ kind, seed }: { kind: Inspiration["art"]; seed: number }) {
  const acc = "var(--color-acc)";
  const line = "var(--color-line2)";
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`g${seed}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0d1218" />
          <stop offset="1" stopColor="#12303a" />
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

/** «Вдохновение» под полем ввода: готовые задачи с промптом, клик — поле заполнится и переключит режим. */
export function InspirationStrip() {
  return (
    <section aria-labelledby="insp-title" className="w-full max-w-5xl">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 id="insp-title" className="font-mono text-[11px] tracking-[0.14em] text-ink3 uppercase">
          › С чего начать
        </h2>
        <Label>нажмите — поле заполнится</Label>
      </div>
      <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6">
        {INSPIRATION.map((it, i) => (
          <motion.li
            key={it.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 + i * 0.05, duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Link
              href={`/app?mode=${it.mode}&prompt=${encodeURIComponent(it.prompt)}`}
              scroll={false}
              className="fx-hover group flex h-full flex-col border border-line bg-g1 hover:border-line2"
            >
              <span className="relative block aspect-[16/10] overflow-hidden border-b border-line">
                <span className="block h-full w-full transition-transform duration-(--dur-slow) ease-(--ease-out) group-hover:scale-[1.04]">
                  <Art kind={it.art} seed={i} />
                </span>
                <Label className="absolute top-2 left-2 bg-bg/80 px-1.5 text-acc">{it.tag}</Label>
              </span>
              <span className="p-2.5 text-[13px] leading-snug">{it.title}</span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
