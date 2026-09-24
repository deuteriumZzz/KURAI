import type { SystemStatus } from "@/types/api";
import { cn } from "@/lib/cn";
import { Tip } from "./tip";

const STATE = {
  ok: { text: "все системы в норме", cls: "text-ok" },
  degraded: { text: "часть моделей работает медленно", cls: "text-warn" },
  down: { text: "сбой — запросы идут на резервные модели", cls: "text-err" },
} as const;

function bars(latencyMs: number): number {
  return latencyMs < 150 ? 4 : latencyMs < 300 ? 3 : latencyMs < 600 ? 2 : 1;
}

/** HUD-строка статуса: узел, задержка, сигнал, модели онлайн. Только реальные данные. */
export function StatusBar({ status, className }: { status: SystemStatus; className?: string }) {
  const on = bars(status.latencyMs);
  const state = STATE[status.state];
  return (
    <div
      role="status"
      className={cn("flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-[11px] tracking-[0.06em] text-ink3", className)}
    >
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="inline-flex h-2.5 items-end gap-0.5">
          {[3, 5, 7, 10].map((h, i) => (
            <i key={h} className={cn("w-[3px]", i < on ? "bg-acc" : "bg-line2")} style={{ height: h }} />
          ))}
        </span>
        {status.node} · {status.latencyMs} мс
      </span>
      <span>Моделей онлайн {status.modelsOnline}</span>
      <span className={state.cls}>● {state.text}</span>
      <span className="hidden md:inline">
        <Tip />
      </span>
    </div>
  );
}
