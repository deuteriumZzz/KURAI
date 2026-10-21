"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { retrigger } from "@/lib/motion";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string | null; hint?: ReactNode };

/** Поле формы: подпись над полем, ошибка под ним (aria-describedby), фокус — скобки. */
export function Field({ id, label, error, hint, className, type, ...rest }: Props) {
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const isPassword = type === "password";
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => isPassword && setCaps(e.getModifierState("CapsLock"));
  // 65 — новая ошибка: поле коротко качается, рамка краснеет, причина — под полем
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) retrigger(box.current, "k-shake");
  }, [error]);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] text-ink2">
        {label}
      </label>
      <div ref={box} className="fx-brackets">
        <input
          id={id}
          type={isPassword && shown ? "text" : type}
          onKeyUp={onKey}
          onKeyDown={onKey}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            cn(isPassword && "pr-11"), "h-11 w-full rounded-(--radius-sm) border bg-g1 px-3 text-[15px] text-ink outline-none placeholder:text-ink3 focus:border-ink3 focus:shadow-[0_0_0_3px_var(--color-s2)]",
            error ? "border-err" : "border-line",
            className,
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? "Скрыть пароль" : "Показать пароль"}
            aria-pressed={shown}
            className="absolute top-0 right-0 grid h-11 w-11 cursor-pointer place-items-center text-ink3 hover:text-ink"
          >
            {shown ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
          </button>
        )}
      </div>
      {caps && !error && <p className="text-[12.5px] text-warn">Включён Caps Lock</p>}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-[12.5px] text-err">
          {error}
        </p>
      ) : (
        hint && (
          <div id={`${id}-hint`} className="text-[12.5px] text-ink3">
            {hint}
          </div>
        )
      )}
    </div>
  );
}
