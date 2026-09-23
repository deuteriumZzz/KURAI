"use client";

import { cn } from "@/lib/cn";
import { useFx } from "@/components/fx/primitives";

/** Переключатель-строка с квадратным «диодом»: состояние читается с одного взгляда. */
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
      <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-ink3">
        {checked ? "ВКЛ" : "ВЫКЛ"}
        <span ref={ledRef} aria-hidden="true" className={cn("size-2.5", checked ? "bg-acc shadow-[0_0_6px_var(--color-acc)]" : "bg-line2")} />
      </span>
    </button>
  );
}
