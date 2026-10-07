"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button, type ButtonProps } from "./button";

/** 67 — галочка не появляется, а прорисовывается линией. */
export function DrawnCheck({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <motion.path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }} />
    </svg>
  );
}

/**
 * 66 — действие подтверждается там же, где нажали: «Сохранить» → ожидание → «✓ Сохранено» → обратно.
 * Ошибка честно остаётся на кнопке, пока её не нажмут снова.
 */
export function ActionButton({ onAction, done = "Сохранено", busy = "Сохраняю…", children, disabled, ...rest }: Omit<ButtonProps, "onClick"> & { onAction: () => Promise<unknown>; done?: string; busy?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  return (
    <Button
      {...rest}
      disabled={disabled || state === "busy"}
      aria-live="polite"
      onClick={async () => {
        setState("busy");
        try {
          await onAction();
          setState("done");
          setTimeout(() => setState("idle"), 1400);
        } catch {
          setState("error");
        }
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={state} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }} className="inline-flex items-center gap-1.5">
          {state === "done" ? (
            <>
              <DrawnCheck /> {done}
            </>
          ) : state === "busy" ? (
            busy
          ) : state === "error" ? (
            "Не удалось — ещё раз"
          ) : (
            children
          )}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
