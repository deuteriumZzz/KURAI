/** Сноска-источник [n] в тексте ответа: при наведении или фокусе — карточка источника. */
export function Citation({ n, source }: { n: number; source?: { url: string; title: string } }) {
  if (!source) return <sup className="font-mono text-[10px] text-ink3">[{n}]</sup>;
  const host = new URL(source.url).hostname.replace(/^www\./, "");
  return (
    <span className="group/cite relative inline-block align-super">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Источник ${n}: ${source.title}, ${host}`}
        className="mx-0.5 inline-grid h-4 min-w-4 place-items-center border border-acc-line bg-acc-soft px-1 font-mono text-[10px] leading-none text-acc no-underline hover:bg-acc hover:text-acc-ink"
      >
        {n}
      </a>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 bg-g2 p-3 text-left opacity-0 shadow-(--shadow-float) transition-opacity duration-(--dur-fast) group-focus-within/cite:visible group-focus-within/cite:opacity-100 group-hover/cite:visible group-hover/cite:opacity-100"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="grid size-5 place-items-center border border-line2 font-mono text-[10px] text-acc uppercase">
            {host[0]}
          </span>
          <span className="font-mono text-[11px] text-ink3">{host}</span>
        </span>
        <span className="mt-1.5 block text-[13px] leading-snug text-ink">{source.title}</span>
      </span>
    </span>
  );
}
