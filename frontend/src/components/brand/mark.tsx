import { cn } from "@/lib/cn";
import { HoverDecode } from "@/components/fx/hover-decode";

/** Знак KURAI — монограмма K: прямой штрих + cyan-стрелка и угловые скобки захвата. */
export function KuraiMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("shrink-0", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect width="64" height="64" className="fill-g1" />
      <path d="M8 18V8h10M56 46v10H46" fill="none" className="stroke-acc" strokeWidth="3" />
      <path d="M22 14v36" className="stroke-ink" strokeWidth="6" />
      <path d="M44 14 28 32l16 18" fill="none" className="stroke-acc" strokeWidth="6" strokeLinejoin="miter" />
    </svg>
  );
}

/** Знак + надпись. */
export function KuraiLogo({ className, markClass }: { className?: string; markClass?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <KuraiMark className={cn("size-6", markClass)} />
      <HoverDecode text="KURAI" className="font-brand text-[15px] font-medium tracking-[0.36em]" />
    </span>
  );
}
