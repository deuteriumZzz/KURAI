"use client";

import { useEffect, useRef, useState } from "react";
import { isCalm } from "@/lib/motion";

/**
 * «Дешифровка изображения»: свежий результат проявляется из крупных пикселей в резкость (~0,5 с).
 * Поверх картинки — canvas, который рисует её в низком разрешении без сглаживания и затем исчезает.
 */
export function PixelReveal({ src, active, children }: { src: string; active: boolean; children: React.ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(!active);

  useEffect(() => {
    if (!active || isCalm()) {
      const t = setTimeout(() => setDone(true), 0);
      return () => clearTimeout(t);
    }
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const img = new Image();
    let timers: ReturnType<typeof setTimeout>[] = [];
    img.onload = () => {
      const w = (c.width = c.clientWidth || 256);
      const h = (c.height = c.clientHeight || 256);
      const steps = [6, 12, 24, 48, 96];
      timers = steps.map((n, i) =>
        setTimeout(() => {
          const small = document.createElement("canvas");
          small.width = n;
          small.height = Math.max(1, Math.round((n * h) / w));
          small.getContext("2d")?.drawImage(img, 0, 0, small.width, small.height);
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(small, 0, 0, w, h);
        }, i * 90),
      );
      timers.push(setTimeout(() => setDone(true), steps.length * 90 + 40));
    };
    img.src = src;
    return () => timers.forEach(clearTimeout);
  }, [active, src]);

  return (
    <div className="relative">
      {children}
      {!done && <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />}
    </div>
  );
}
