"use client";

import { useEffect, useRef, useState } from "react";
import { isCalm } from "@/lib/motion";

/** Число досчитывается до значения, когда блок появляется на экране (один раз). */
export function CountUp({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      if (isCalm()) return;
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / 900);
        setV(Math.round(to * (1 - (1 - k) ** 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      setV(0);
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {v.toLocaleString("ru-RU")}
      {suffix}
    </span>
  );
}
