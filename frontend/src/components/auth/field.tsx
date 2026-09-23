import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string | null; hint?: ReactNode };

/** Поле формы: подпись над полем, ошибка под ним (aria-describedby), фокус — скобки. */
export function Field({ id, label, error, hint, className, ...rest }: Props) {
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] text-ink2">
        {label}
      </label>
      <div className="fx-brackets">
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            "h-11 w-full border bg-g1 px-3 text-[15px] text-ink outline-none placeholder:text-ink3 focus:border-acc-line focus:shadow-[0_0_0_3px_var(--color-acc-soft)]",
            error ? "border-err" : "border-line",
            className,
          )}
          {...rest}
        />
      </div>
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
