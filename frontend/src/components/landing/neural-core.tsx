"use client";

import { useEffect, useRef } from "react";
import { isCalm } from "@/lib/motion";

// икосаэдр: 12 вершин, 30 рёбер; лёгкая проволочная 3D-модель без библиотек
const T = (1 + Math.sqrt(5)) / 2;
const V: [number, number, number][] = [
  [-1, T, 0], [1, T, 0], [-1, -T, 0], [1, -T, 0],
  [0, -1, T], [0, 1, T], [0, -1, -T], [0, 1, -T],
  [T, 0, -1], [T, 0, 1], [-T, 0, -1], [-T, 0, 1],
];
const E: [number, number][] = [];
for (let i = 0; i < V.length; i++)
  for (let j = i + 1; j < V.length; j++) {
    const [a, b] = [V[i]!, V[j]!];
    if (Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) - 2) < 0.01) E.push([i, j]);
  }

/** «Нейро-ядро» на лендинге: вращается медленно, поворачивается к курсору, внутри — вторая, меньшая оболочка. */
export function NeuralCore() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const css = getComputedStyle(document.documentElement);
    const acc = css.getPropertyValue("--color-acc").trim() || "#00e8f0";
    const line = css.getPropertyValue("--color-line2").trim() || "#34445a";
    let raf = 0;
    let visible = true;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      const w = c.clientWidth;
      const h = c.clientHeight;
      ctx.clearRect(0, 0, w, h);
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;
      const ay = t / 9000 + cx * 0.6;
      const ax = 0.35 + cy * 0.4;
      const project = (p: [number, number, number], scale: number) => {
        let [x, y, z] = p;
        [x, z] = [x * Math.cos(ay) - z * Math.sin(ay), x * Math.sin(ay) + z * Math.cos(ay)];
        [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
        const f = 4 / (4 + z);
        return { x: w / 2 + x * scale * f, y: h / 2 + y * scale * f, z };
      };
      for (const [scale, color, alpha] of [
        [Math.min(w, h) * 0.22, line, 0.9],
        [Math.min(w, h) * 0.1, acc, 0.8],
      ] as const) {
        const P = V.map((v) => project(v, scale));
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        for (const [i, j] of E) {
          const a = P[i]!;
          const b = P[j]!;
          ctx.globalAlpha = alpha * (0.35 + 0.65 * (1 - (a.z + b.z + 4) / 8));
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.fillStyle = acc;
        for (const p of P) {
          ctx.globalAlpha = 0.4 + 0.6 * (1 - (p.z + 2) / 4);
          ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      draw(t);
      if (visible && !isCalm()) raf = requestAnimationFrame(loop);
    };
    size();
    if (isCalm()) draw(0);
    else raf = requestAnimationFrame(loop);

    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !isCalm()) raf = requestAnimationFrame(loop);
    });
    io.observe(c);
    const move = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("resize", size);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("resize", size);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="h-full w-full" />;
}
