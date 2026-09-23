"use client";

import { useEffect } from "react";
import { SignalLost } from "@/components/site/signal-lost";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // сюда подключится Sentry
    console.error(error);
  }, [error]);

  return (
    <SignalLost
      code={error.digest ? `500 · ${error.digest}` : "500"}
      text="Что-то сломалось на нашей стороне. Черновики сохранены, кредиты за незавершённые запросы вернутся автоматически."
      action={
        <button type="button" onClick={retry} className="fx-chamfer cursor-pointer bg-acc px-4 py-2.5 text-[14px] font-semibold text-acc-ink [--ch:var(--chamfer-sm)]">
          Попробовать снова
        </button>
      }
    />
  );
}
