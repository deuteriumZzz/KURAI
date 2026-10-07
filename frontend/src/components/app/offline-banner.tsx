"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Wifi, WifiOff, X } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { memberStore } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "motion/react";
import { kuraiApi } from "@/lib/kurai-api";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/**
 * 74 — нет сети: плашка выезжает сверху и честно говорит, что будет с отправкой;
 * связь вернулась — плашка становится галочкой и уезжает.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const [back, setBack] = useState(false);
  const was = useRef(online);
  useEffect(() => {
    const restored = online && !was.current;
    was.current = online;
    if (!restored) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- реакция на внешнее событие сети
    setBack(true);
    const t = setTimeout(() => setBack(false), 2000);
    return () => clearTimeout(t);
  }, [online]);
  return (
    <AnimatePresence initial={false}>
      {(!online || back) && (
        <motion.div
          key="net"
          role={online ? "status" : "alert"}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className={online ? "flex items-center gap-2 border-b border-line bg-acc-soft px-4 py-2 text-[13px] text-ink" : "flex flex-wrap items-center justify-between gap-2 border-b border-line bg-warn-soft px-4 py-2 text-[13px] text-warn"}>
            {online ? (
              <span className="inline-flex items-center gap-2"><Wifi size={14} strokeWidth={1.5} aria-hidden="true" className="text-acc" /> Сеть вернулась — можно отправлять</span>
            ) : (
              <>
                <span className="inline-flex items-center gap-2"><WifiOff size={14} strokeWidth={1.5} aria-hidden="true" /> Нет соединения</span>
                <span className="text-[12px]">Отправка недоступна, пока сеть не вернётся</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Адрес не подтверждён: одна тихая строка над рабочей областью. Вход от этого не зависит —
 * подтверждение нужно, чтобы на почту можно было восстановить пароль. Скрытие — до конца сеанса.
 */
export function VerifyBanner() {
  const member = useStore(memberStore);
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem("kurai:verify-hidden") === "1";
    } catch {
      return false;
    }
  });
  if (!kuraiApi || member.emailVerified !== false || hidden) return null;
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line bg-g1 px-4 py-2 text-[13px] text-ink2">
      <span>
        Подтвердите адрес <span className="text-ink">{member.email}</span> — ссылка в письме.
      </span>
      <span className="flex items-center gap-1">
        <ActionButton size="sm" variant="ghost" done="Отправлено" busy="Отправляем…" onAction={() => kuraiApi!.resendVerification()}>
          Отправить ещё раз
        </ActionButton>
        <button
          type="button"
          aria-label="Скрыть до конца сеанса"
          onClick={() => {
            try {
              sessionStorage.setItem("kurai:verify-hidden", "1");
            } catch {}
            setHidden(true);
          }}
          className="k-act size-8"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </span>
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
