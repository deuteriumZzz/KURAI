"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { kuraiApi, type KuraiMember, type KuraiServiceStatus } from "@/lib/kurai-api";

type SignalState = {
  member: KuraiMember | null;
  service: KuraiServiceStatus | null;
  failed: boolean;
};

const INITIAL_SIGNAL: SignalState = { member: null, service: null, failed: false };

/**
 * Compact, truthful readiness signal for the workspace home.
 * It never invents a region, latency, model count, or fallback route when no API is connected.
 */
export function WorkspaceSignal() {
  const [signal, setSignal] = useState<SignalState>(INITIAL_SIGNAL);

  useEffect(() => {
    if (!kuraiApi) return;

    let active = true;
    void Promise.all([kuraiApi.me(), kuraiApi.serviceStatus()])
      .then(([member, service]) => {
        if (active) setSignal({ member, service, failed: false });
      })
      .catch(() => {
        if (active) setSignal({ ...INITIAL_SIGNAL, failed: true });
      });

    return () => {
      active = false;
    };
  }, []);

  if (!kuraiApi) {
    return null;
  }

  const ready = signal.service?.status === "ok";
  const statusText = signal.failed
    ? "не удалось получить статус"
    : !signal.service
      ? "проверяем рабочее пространство"
      : ready
        ? "система готова"
        : "часть режимов ограничена";

  return (
    <div className="mt-4">
      <div role="status" aria-live="polite" className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] tracking-[0.055em] text-ink3">
        <span className={cn("inline-flex items-center gap-1.5", signal.failed ? "text-err" : ready ? "text-ok" : "text-warn")}>
          <i aria-hidden="true" className="size-1.5 bg-current" /> {statusText}
        </span>
        {signal.service && <span>{signal.service.modelsOnline} {pluralModels(signal.service.modelsOnline)} доступны</span>}
      </div>
    </div>
  );
}

function pluralModels(value: number): string {
  const rest = value % 100;
  if (rest >= 11 && rest <= 19) return "моделей";
  const last = value % 10;
  if (last === 1) return "модель";
  if (last >= 2 && last <= 4) return "модели";
  return "моделей";
}
