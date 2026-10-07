import { hostOf, webHref } from "@/lib/format";

/** Сноска-источник [n] в тексте ответа. Наведение/фокус связывает её с источником в инспекторе (фиолетовый). */
export function Citation({ n, source }: { n: number; source?: { url: string; title: string; quote?: string; readAt?: string } }) {
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
        // 25 — карточка всплывает над фразой: номер, сайт, заголовок и адрес — то, что реально известно об источнике
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-(--z-bay) mb-2 w-72 -translate-x-1/2 translate-y-1 rounded-(--radius-md) border border-violet-line bg-g1 p-3 text-left opacity-0 shadow-(--shadow-float) transition-[opacity,translate,visibility] duration-(--dur-base) ease-(--ease-out) group-focus-within/cite:visible group-focus-within/cite:translate-y-0 group-focus-within/cite:opacity-100 group-hover/cite:visible group-hover/cite:translate-y-0 group-hover/cite:opacity-100"
      >
        <span className="k-index text-violet">Источник {n} · {host}</span>
        <span className="mt-1.5 block text-[13px] leading-snug text-ink">{source.title}</span>
        {/* 25 — цитата, на которую опирается фраза, и когда источник прочитан (данные провайдера, как текст) */}
        {source.quote && <span className="mt-2 block border-l border-violet-line pl-2 text-[12px] leading-snug text-ink2 italic">«{source.quote}»</span>}
        <span className="mt-1.5 flex justify-between gap-2 font-mono text-[11px] text-ink3">
          <span className="truncate">{source.url.replace(/^https?:\/\//, "")}</span>
          {source.readAt && <span className="shrink-0">{new Date(source.readAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span>}
        </span>
      </span>
    </span>
  );
}
