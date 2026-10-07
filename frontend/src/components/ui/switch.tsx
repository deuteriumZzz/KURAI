"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useFx } from "@/components/fx/primitives";
import { SPRING } from "@/lib/motion";
import { DrawnCheck } from "./action-button";

/** Переключатель-строка: бегунок доезжает с пружинным перебором, во включённом — прорисованная галочка (67). */
export function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const [ledRef, flick] = useFx<HTMLSpanElement>("fx-flicker");
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        onChange(!checked);
        flick();
      }}
      className="flex w-full cursor-pointer items-center justify-between gap-4 border border-line bg-g1 px-4 py-3 text-left hover:border-line2"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-[14px]">{label}</span>
        {hint && <span className="text-[12.5px] text-ink3">{hint}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2.5 font-mono text-[11px] text-ink3">
        {checked ? "ВКЛ" : "ВЫКЛ"}
        <span ref={ledRef} aria-hidden="true" className={cn("relative h-[18px] w-8 rounded-full border transition-colors duration-(--dur-base)", checked ? "border-acc bg-acc-soft" : "border-line2 bg-g2")}>
          <motion.span
            initial={false}
            animate={{ x: checked ? 14 : 0 }}
            transition={SPRING.bouncy}
            className={cn("absolute top-[2px] left-[2px] grid size-3 place-items-center rounded-full", checked ? "bg-acc text-acc-ink" : "bg-ink3")}
          >
            {checked && <DrawnCheck size={9} />}
          </motion.span>
        </span>
      </span>
    </button>
  );
}
