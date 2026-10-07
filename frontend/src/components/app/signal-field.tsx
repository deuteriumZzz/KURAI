"use client";

import { useEffect, useRef } from "react";
import { useCalm } from "@/lib/use-calm";

const STEP = 30;
const RADIUS = 180;

/**
 * Command Deck signal field: редкая сетка точек за пустой главной. Реагирует на близость
 * курсора и фокус поля ввода, почти исчезает, пока человек печатает. Кадры рисуются только
 * пока есть что анимировать; в спокойном режиме и при «уменьшить движение» поля нет.
 */
export function SignalField() {
  const calm = useCalm();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (calm || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let dot = 2;
    const pointer = { x: -9999, y: -9999 };
    let level = 1; // текущая интенсивность
    let target = 1; // 1 — покой, 1.35 — фокус поля, 0.12 — идёт набор текста
    // 41 — отправка: точки на миг стягиваются к полю ввода и отпускают
    const gather = { x: 0, y: 0, at: 0 };
    const GATHER_MS = 700;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      // на обычном экране точка 2px, на ретине 1.5px — чтобы не размывалась в полупиксель
      dot = dpr >= 2 ? 1.5 : 2;
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      schedule();
    };

    const draw = () => {
      raf = 0;
      level += (target - level) * 0.12;
      const t = gather.at ? (performance.now() - gather.at) / GATHER_MS : 1;
      // 0 → 1 → 0: быстро стянулись, мягко отпустили
      const g = t < 1 ? Math.sin(Math.PI * Math.min(1, t)) ** 2 : 0;
      const css = getComputedStyle(canvas);
      const ink = css.getPropertyValue("--color-ink").trim() || "#f2f2f2";
      const acc = css.getPropertyValue("--color-acc").trim() || "#d9ef7a";
      ctx.clearRect(0, 0, w, h);
      for (let y = STEP / 2; y < h; y += STEP) {
        // поле растворяется к низу, чтобы не спорить со списками под полем ввода
        const fade = Math.max(0, 1 - y / (h * 0.95));
        for (let x = STEP / 2; x < w; x += STEP) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.hypot(dx, dy) || 1;
          const near = Math.max(0, 1 - dist / RADIUS);
          const alpha = (0.13 + near * 0.5) * fade * level;
          if (alpha < 0.01) continue;
          const pull = near * near * 5;
          const gx = (gather.x - x) * g * 0.22;
          const gy = (gather.y - y) * g * 0.22;
          ctx.globalAlpha = Math.min(1, alpha + g * 0.35 * fade);
          ctx.fillStyle = (near > 0.55 && level > 0.6) || g > 0.5 ? acc : ink;
          ctx.fillRect(Math.round(x - (dx / dist) * pull + gx), Math.round(y - (dy / dist) * pull + gy), dot, dot);
        }
      }
      ctx.globalAlpha = 1;
      if (Math.abs(target - level) > 0.01 || t < 1) schedule();
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      schedule();
    };
    const onLeave = () => {
      pointer.x = -9999;
      schedule();
    };
    const sync = () => {
      const input = document.getElementById("composer-input") as HTMLTextAreaElement | null;
      const typing = !!input && input.value.trim().length > 0;
      target = typing ? 0.12 : document.activeElement === input ? 1.35 : 1;
      schedule();
    };

    const onSent = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      const r = canvas.getBoundingClientRect();
      Object.assign(gather, { x: x - r.left, y: y - r.top, at: performance.now() });
      schedule();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("kurai:sent", onSent);
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("input", sync, true);
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", sync);
    resize();
    sync();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("kurai:sent", onSent);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("input", sync, true);
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", sync);
    };
  }, [calm]);

  if (calm) return null;
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[min(46rem,100%)] w-full" />;
}
