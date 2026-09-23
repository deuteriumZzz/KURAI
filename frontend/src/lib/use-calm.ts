"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => {
    mo.disconnect();
    mq.removeEventListener("change", cb);
  };
}

/** Спокойный режим или системное «уменьшить движение» — реактивно. */
export function useCalm(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("calm") || window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
