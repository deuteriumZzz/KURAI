import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  // главная: акцент + срез угла; hover — внутреннее свечение, без сдвигов
  primary: "fx-chamfer fx-sheen bg-acc text-acc-ink font-semibold border border-acc hover:shadow-[inset_0_0_0_1px_var(--color-acc-ink)]",
  secondary: "bg-g2 text-ink border border-line2 hover:bg-g3",
  ghost: "bg-transparent text-ink2 border border-transparent hover:text-ink hover:bg-g2",
  danger: "bg-transparent text-err border border-err hover:bg-err-soft",
};

// 32 / 40 / 48px; на тач-устройствах зона нажатия ≥ 44px
const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] [--ch:var(--chamfer-sm)] pointer-coarse:min-h-11",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[15px] [--ch:var(--chamfer-lg)]",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant = "secondary", size = "md", className, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-(--radius-sm) whitespace-nowrap transition-colors duration-(--dur-fast) disabled:cursor-not-allowed disabled:opacity-40",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  );
}
