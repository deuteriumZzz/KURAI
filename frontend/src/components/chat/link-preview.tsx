import type { ReactNode } from "react";

/** Ссылка в ответе с карточкой-превью при наведении/фокусе: домен, путь. Настоящие заголовки страниц подтянет бэкенд. */
export function LinkPreview({ href, children }: { href: string; children: ReactNode }) {
  let host = "";
  let path = "";
  try {
    const u = new URL(href);
    host = u.hostname.replace(/^www\./, "");
    path = u.pathname === "/" ? "" : u.pathname;
  } catch {
    return <span>{children}</span>;
  }
  return (
    <span className="group/link relative inline">
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-acc underline decoration-acc-line underline-offset-2 hover:decoration-acc">
        {children}
      </a>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-0 z-20 mb-2 flex w-64 items-start gap-2.5 rounded-(--radius-md) bg-g2 p-3 opacity-0 shadow-(--shadow-float) transition-opacity delay-200 duration-(--dur-fast) group-focus-within/link:visible group-focus-within/link:opacity-100 group-hover/link:visible group-hover/link:opacity-100"
      >
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center border border-line2 font-mono text-[12px] text-acc uppercase rounded-(--radius-xs)">
          {host[0]}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] text-ink">{host}</span>
          <span className="truncate font-mono text-[11px] text-ink3">{path || "главная страница"}</span>
          <span className="mt-1 text-[11px] text-ink3">откроется в новой вкладке ↗</span>
        </span>
      </span>
    </span>
  );
}
