"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { AgentTask } from "@/lib/stream";
import { hostOf } from "@/lib/format";
import { isCalm, SPRING } from "@/lib/motion";

type Node = { id: string; label: string; x: number; y: number; tone: string; pulse?: boolean };
type Point = { x: number; y: number };

const W = 300;
const H = 200;
const CX = W / 2;
const CY = H / 2;

/** Место узла по умолчанию: группа на своей дуге вокруг задачи. */
function arc<T>(items: T[], from: number, to: number, r: number, make: (item: T, x: number, y: number) => Node): Node[] {
  return items.map((item, i) => {
    const a = ((from + ((to - from) * (i + 0.5)) / items.length) * Math.PI) / 180;
    return make(item, CX + Math.cos(a) * r * 1.35, CY + Math.sin(a) * r);
  });
}

/**
 * 42 — живая карта задачи: шаги (сверху), источники (справа снизу), файлы (слева снизу) вокруг самой задачи.
 * Только реальные данные запуска; узлы мягко «дышат» и расталкиваются, их можно потянуть — отпустили, вернулись.
 */
export function TaskMap({ tasks, sources, files }: { tasks: AgentTask[]; sources: { url: string; title: string }[]; files: string[] }) {
  const nodes = [
    ...arc(tasks, -165, -15, 70, (t, x, y) => ({ id: `t:${t.title}`, label: t.title, x, y, tone: t.status === "todo" ? "var(--color-line2)" : "var(--color-acc)", pulse: t.status === "doing" })),
    ...arc(sources, 10, 80, 72, (s, x, y) => ({ id: `s:${s.url}`, label: `${s.title} · ${hostOf(s.url)}`, x, y, tone: "var(--color-violet)" })),
    ...arc(files, 100, 170, 72, (f, x, y) => ({ id: `f:${f}`, label: f, x, y, tone: "var(--color-ink3)" })),
  ];
  const [pos, setPos] = useState<Record<string, Point>>({});
  const [hover, setHover] = useState<Node | null>(null);
  const drag = useRef<{ id: string; at: Point } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const latest = useRef(nodes);
  useEffect(() => {
    latest.current = nodes;
  });

  // мягкая физика: тяга к своему месту, лёгкое дыхание, узлы не налезают друг на друга
  useEffect(() => {
    if (isCalm()) return;
    let raf = 0;
    let last = 0;
    const current: Record<string, Point> = {};
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 33) return;
      last = t;
      const list = latest.current;
      for (const [i, n] of list.entries()) {
        const p = (current[n.id] ??= { x: CX, y: CY });
        if (drag.current?.id === n.id) {
          p.x = drag.current.at.x;
          p.y = drag.current.at.y;
          continue;
        }
        const tx = n.x + Math.sin(t / 1400 + i * 1.7) * 2.2;
        const ty = n.y + Math.cos(t / 1700 + i * 2.3) * 2.2;
        p.x += (tx - p.x) * 0.12;
        p.y += (ty - p.y) * 0.12;
        for (const other of list) {
          const q = current[other.id];
          if (!q || other.id === n.id) continue;
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 16) {
            p.x += (dx / d) * (16 - d) * 0.25;
            p.y += (dy / d) * (16 - d) * 0.25;
          }
        }
      }
      setPos({ ...current });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const at = (n: Node) => pos[n.id] ?? n;
  const toSvg = (e: { clientX: number; clientY: number }): Point => {
    const r = svg.current?.getBoundingClientRect();
    return r ? { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H } : { x: CX, y: CY };
  };

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Карта задачи: шагов ${tasks.length}, источников ${sources.length}, файлов ${files.length}`}
      className="w-full touch-none select-none"
      onPointerMove={(e) => {
        if (drag.current) drag.current.at = toSvg(e);
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => {
        drag.current = null;
        setHover(null);
      }}
    >
      {nodes.map((n) => (
        <motion.line key={`l-${n.id}`} x1={CX} y1={CY} x2={at(n).x} y2={at(n).y} stroke="var(--color-line2)" strokeWidth={1} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
      ))}
      <rect x={CX - 5} y={CY - 5} width={10} height={10} fill="var(--color-ink)" />
      {nodes.map((n) => (
        <motion.g key={n.id} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING.bouncy} style={{ originX: `${at(n).x}px`, originY: `${at(n).y}px` }}>
          <circle
            cx={at(n).x}
            cy={at(n).y}
            r={hover?.id === n.id ? 7 : 5}
            fill={n.tone}
            className={n.pulse ? "k-live cursor-grab" : "cursor-grab"}
            onPointerEnter={() => setHover(n)}
            onPointerLeave={() => setHover((cur) => (cur?.id === n.id ? null : cur))}
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture?.(e.pointerId);
              drag.current = { id: n.id, at: toSvg(e) };
            }}
          />
        </motion.g>
      ))}
      {hover && (
        <text x={Math.min(W - 4, Math.max(4, at(hover).x))} y={at(hover).y - 10} textAnchor={at(hover).x > CX ? "end" : "start"} className="fill-ink text-[9px]">
          {hover.label.length > 46 ? `${hover.label.slice(0, 45)}…` : hover.label}
        </text>
      )}
    </svg>
  );
}
