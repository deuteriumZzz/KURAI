"use client";

import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** «Соединение потеряно» — помехи только на самой плашке, черновик не теряется. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="alert" className="fx-flicker fx-scanlines flex flex-wrap items-center justify-between gap-2 border-b border-warn/45 bg-g1 px-4 py-2 text-[13px] text-warn">
      <span>Соединение потеряно · черновик сохранён</span>
      <span className="font-mono text-[12px]">переподключимся автоматически</span>
    </div>
  );
}
