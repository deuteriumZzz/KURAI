"use client";

import { useEffect, useRef } from "react";
import { isCalm } from "@/lib/motion";

/**
 * Лёгкое «нейро-поле» за hero: перспективная сетка и узлы, чуть реагирует на курсор.
 * Canvas 2D, без библиотек. Пауза вне экрана и во вкладке в фоне; в спокойном режиме — один статичный кадр.
 */
export function NeuralField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const styles = getComputedStyle(document.documentElement);
    const line = styles.getPropertyValue("--color-line").trim() || "#243040";
    const acc = styles.getPropertyValue("--color-acc").trim() || "#00e8f0";

    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    let mx = 0.5;
    const nodes = Array.from({ length: 26 }, (_, i) => ({ x: ((i * 37) % 100) / 100, z: ((i * 61) % 100) / 100, p: i }));

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const horizon = h * 0.38;
      const vx = w * (0.5 + (mx - 0.5) * 0.08);
      const drift = (t / 9000) % 1;
      ctx.lineWidth = 1;
      ctx.strokeStyle = line;
      // горизонтальные линии уходят к горизонту
      for (let i = 0; i < 18; i++) {
        const k = ((i + drift) / 18) ** 2;
        const y = horizon + (h - horizon) * k;
        ctx.globalAlpha = 0.15 + k * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      // лучи из точки схода
      for (let i = -14; i <= 14; i++) {
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(vx, horizon);
        ctx.lineTo(vx + i * w * 0.09, h);
        ctx.stroke();
      }
      // узлы-сигналы
      ctx.fillStyle = acc;
      for (const n of nodes) {
        const k = ((n.z + drift * 0.5) % 1) ** 2;
        const y = horizon + (h - horizon) * k;
        const x = vx + (n.x - 0.5) * w * 2.4 * k;
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t / 900 + n.p));
        ctx.globalAlpha = k * pulse;
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      draw(t);
      if (visible && !isCalm()) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (isCalm()) draw(0);
      else raf = requestAnimationFrame(loop);
    };

    resize();
    start();
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting && !document.hidden;
      if (visible) start();
    });
    io.observe(canvas);
    const onMove = (e: PointerEvent) => (mx = e.clientX / window.innerWidth);
    const onVis = () => {
      visible = !document.hidden;
      if (visible) start();
    };
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
