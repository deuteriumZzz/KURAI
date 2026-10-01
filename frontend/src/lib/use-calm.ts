"use client";

import { useSyncExternalStore } from "react";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  mq?.addEventListener("change", cb);
  return () => {
    mo.disconnect();
    mq?.removeEventListener("change", cb);
  };
}

/** Спокойный режим или системное «уменьшить движение» — реактивно. */
export function useCalm(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("calm") || prefersReducedMotion(),
    () => false,
  );
}
