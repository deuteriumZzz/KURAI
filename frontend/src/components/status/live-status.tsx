"use client";

import { useEffect, useState } from "react";
import { kuraiApi, type KuraiServiceStatus } from "@/lib/kurai-api";
import { Label } from "@/components/fx/primitives";
import { cn } from "@/lib/cn";

const LABELS: Record<string, string> = {
  text: "Чат и текстовые модели",
  research: "Исследование",
  slides: "Слайды",
  image: "Изображения",
  video: "Видео",
  audio: "Озвучка",
};

const REASONS: Record<string, string> = {
  catalog_empty: "каталог моделей ещё не синхронизирован",
  catalog_stale: "каталог моделей требует обновления",
  provider_not_configured: "ключ провайдера не настроен",
  mail_unconfigured: "почта не настроена: сброс пароля и подтверждение адреса не работают",
};

/** Status surface backed only by the deployment's live capability contract. */
export function LiveStatus() {
  const [status, setStatus] = useState<KuraiServiceStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!kuraiApi) return;
    void kuraiApi.serviceStatus().then(setStatus).catch(() => setError(true));
  }, []);

  if (!kuraiApi) {
    return <p className="text-[14px] text-ink2">Статус появится после подключения API.</p>;
  }
  if (error) {
    return <p role="alert" className="text-[14px] text-err">Не удалось получить актуальный статус сервиса.</p>;
  }
  if (!status) {
    return <div aria-label="Загружаю статус" className="h-36 animate-pulse bg-s1" />;
  }

  return (
    <section aria-label="Состояние сервисов" className="flex flex-col gap-px border border-line bg-line rounded-(--radius-md) overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-g1 px-4 py-3">
        <span className="text-[14px]">KURAI API</span>
        <span className={cn("font-mono text-[12px]", status.status === "ok" ? "text-ok" : "text-warn")}>● {status.status === "ok" ? "работает" : "ограниченно"}</span>
        <Label className="basis-full tracking-[0.04em] normal-case sm:basis-auto">активных моделей: {status.modelsOnline}</Label>
      </div>
      {status.reasons.length > 0 && (
        <p className="bg-warn-soft px-4 py-3 text-[13px] text-warn">{status.reasons.map((reason) => REASONS[reason] ?? reason).join(" · ")}</p>
      )}
      {status.capabilities.map((capability) => (
        <div key={capability.id} className="flex flex-wrap items-baseline justify-between gap-2 bg-g1 px-4 py-3">
          <span className="text-[14px]">{LABELS[capability.id] ?? capability.id}</span>
          <span className={cn("font-mono text-[12px]", capability.available ? "text-ok" : "text-ink3")}>
            ● {capability.available ? "подключено" : "не подключено"}
          </span>
          {capability.modelCount > 0 && <Label className="basis-full tracking-[0.04em] normal-case sm:basis-auto">моделей: {capability.modelCount}</Label>}
        </div>
      ))}
    </section>
  );
}
