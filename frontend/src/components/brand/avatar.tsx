import { identicon } from "@/lib/identicon";
import { cn } from "@/lib/cn";

/** Человек в рабочем пространстве — круг с инициалами; системные объекты остаются квадратными. */
export function Initials({ name, className }: { name: string; className?: string }) {
  const letters = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "·";
  return (
    <span aria-hidden="true" className={cn("grid size-8 shrink-0 place-items-center rounded-full border border-line bg-g3 text-[11.5px] font-medium tracking-[0.02em] text-ink2", className)}>
      {letters}
    </span>
  );
}

/** Генеративный HUD-аватар по email: узор из делений вместо инициалов. */
export function Avatar({ seed, className }: { seed: string; className?: string }) {
  const cells = identicon(seed);
  return (
    <span aria-hidden="true" className={cn("grid size-8 shrink-0 grid-cols-5 gap-px border border-line2 bg-g3 p-1", className)}>
      {cells.map((on, i) => (
        <i key={i} className={on ? (i % 7 === 0 ? "bg-acc" : "bg-ink2") : "bg-transparent"} />
      ))}
    </span>
  );
}
