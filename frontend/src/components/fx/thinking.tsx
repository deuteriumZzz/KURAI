"use client";

import { useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { isCalm } from "@/lib/motion";
import { cn } from "@/lib/cn";

const noop = () => () => {};

// порядок вспышки по часовой: левая-верхняя → правая-верхняя → правая-нижняя → левая-нижняя (сетка 2×2 идёт слева направо, сверху вниз)
const CLOCKWISE = [0, 1, 3, 2];

/** Знак «модель думает»: четыре точки 2×2, пульс идёт по кругу. В спокойном режиме точки неподвижны. */
export function ThinkingMark({ size = 14, className }: { size?: number; className?: string }) {
  // на сервере — спокойно (точки неподвижны), в браузере — по настройке; гидрация не расходится
  const still = useSyncExternalStore(noop, isCalm, () => true);
  return (
    <span aria-hidden="true" className={cn("inline-grid shrink-0 grid-cols-2 text-acc", className)} style={{ width: size, height: size, gap: "24%" }}>
      {CLOCKWISE.map((order, i) => (
        <motion.i
          key={i}
          className="rounded-full bg-current"
          animate={still ? undefined : { scale: [0.55, 1, 0.55], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: order * 0.15 }}
        />
      ))}
    </span>
  );
}
