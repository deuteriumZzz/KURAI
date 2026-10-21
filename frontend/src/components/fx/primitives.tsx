"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { retrigger } from "@/lib/motion";
import { Decode } from "./decode";

type Tone = "default" | "acc" | "warn" | "err" | "ok";

const TONE_TEXT: Record<Tone, string> = {
  default: "text-ink3",
  acc: "text-acc",
  warn: "text-warn",
  err: "text-err",
  ok: "text-ok",
};

/** Системная строка `› …` — голос системы: маршрут, статусы, итоги. */
export function SysLine({
  children,
  tone = "default",
  decode = false,
  prefix = "›",
  className,
}: {
  children: string;
  tone?: Tone;
  decode?: boolean;
  prefix?: string | null;
  className?: string;
}) {
  const text = prefix ? `${prefix} ${children}` : children;
  return (
    <div className={cn("font-mono text-xs leading-relaxed", TONE_TEXT[tone], className)}>
      {decode ? <Decode text={text} /> : text}
    </div>
  );
}

/** Тихая подпись: метаданные, группы, пояснения. Моно — только для модели, цены и кода. */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-[12.5px] text-ink3", className)}>{children}</span>
  );
}

/** Сегментная шкала: баланс, контекст, загрузка, очередь. */
export function Segments({
  value,
  count = 10,
  tone = "acc",
  label,
  className,
}: {
  /** 0..1 */
  value: number;
  count?: number;
  tone?: "acc" | "warn" | "err";
  label: string;
  className?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  const on = Math.round(v * count);
  const fill = tone === "acc" ? "bg-acc" : tone === "warn" ? "bg-warn" : "bg-err";
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn("flex gap-0.5", className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={cn("h-2 flex-1", i < on ? fill : "bg-line")} />
      ))}
    </div>
  );
}

/** Подсказка клавиши в рамке: [Enter], [/], [Alt]. */
export function KeyHint({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center rounded-(--radius-xs) border border-line2 bg-g2 px-1.5 font-mono text-[11px] leading-5 text-ink2",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Штриховка: заблокированное и опасное. */
export function Hatch({
  children,
  tone = "warn",
  className,
}: {
  children: ReactNode;
  tone?: "warn" | "err";
  className?: string;
}) {
  return (
    <div role="status" data-tone={tone} className={cn("fx-hatch px-3 py-2.5 text-sm", className)}>
      {children}
    </div>
  );
}

/** Скан-линия поверх родителя с `relative`. */
export function Scanline({ active }: { active: boolean }) {
  return <span aria-hidden="true" className="fx-scanline" data-active={active} />;
}

/** Мерцание/глитч по событию: const [ref, fire] = useFx<HTMLDivElement>("fx-flicker"). */
export function useFx<T extends Element>(className: "fx-flicker" | "fx-flicker-border" | "fx-glitch") {
  const ref = useRef<T>(null);
  const fire = useCallback(() => retrigger(ref.current, className), [className]);
  return [ref, fire] as const;
}
