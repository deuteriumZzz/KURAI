"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { kuraiApi } from "@/lib/kurai-api";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Нет сети — простая формулировка ограничения без обещаний, которых интерфейс не выполняет. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-warn-soft px-4 py-2 text-[13px] text-warn">
      <span className="inline-flex items-center gap-2"><WifiOff size={14} strokeWidth={1.5} aria-hidden="true" /> Нет соединения</span>
      <span className="text-[12px]">Отправка недоступна, пока сеть не вернётся</span>
    </div>
  );
}

/** Честная граница локального просмотра: показывается в подвале рейки на каждом экране кабинета. */
export function LocalPreviewBanner() {
  if (kuraiApi) return null;
  return (
    <div role="status" className="flex items-start gap-2 px-2 py-1.5 text-[11.5px] leading-snug text-ink3">
      <i aria-hidden="true" className="mt-[5px] size-1.5 shrink-0 bg-warn" />
      <span>
        <span className="text-ink2">Локальный просмотр</span>
        <span className="block">Сервер аккаунтов не подключён — данные демонстрационные</span>
      </span>
    </div>
  );
}
