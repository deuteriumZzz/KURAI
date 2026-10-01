import { hostOf, webHref } from "@/lib/format";

/** Сноска-источник [n] в тексте ответа. Наведение/фокус связывает её с источником в инспекторе (фиолетовый). */
export function Citation({ n, source }: { n: number; source?: { url: string; title: string } }) {
  if (!source) return <sup className="font-mono text-[10px] text-ink3">[{n}]</sup>;
  const host = hostOf(source.url);
  return (
    <span className="group/cite relative">
      <a
        href={webHref(source.url)}
        target="_blank"
        rel="noopener noreferrer"
        data-n={n}
        aria-label={`Источник ${n}: ${source.title}, ${host}`}
        className="k-cite ml-0.5 rounded-(--radius-sm) px-[5px] py-px align-[0.12em] font-mono text-[10.5px] leading-none no-underline"
      >
        {n}
      </a>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-(--z-bay) mb-2 w-64 -translate-x-1/2 rounded-(--radius-md) border border-line2 bg-g1 p-3 text-left opacity-0 shadow-(--shadow-float) transition-opacity duration-(--dur-fast) group-focus-within/cite:visible group-focus-within/cite:opacity-100 group-hover/cite:visible group-hover/cite:opacity-100"
      >
        <span className="k-index text-violet">Источник {n} · {host}</span>
        <span className="mt-1.5 block text-[13px] leading-snug text-ink">{source.title}</span>
      </span>
    </span>
  );
}
