import { cn } from "@/lib/cn";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

type Kind = "auto" | "media" | "text";

/**
 * Абстрактный знак модели KURAI — лучи из центра, число и длина которых выводятся из id.
 * Это идентификатор маршрута, а не логотип провайдера. Авто — лаймовый центр,
 * медиа-модели — один пурпурный луч (генерация).
 */
export function ModelGlyph({ id, kind = "text", size = 24, className }: { id: string; kind?: Kind; size?: number; className?: string }) {
  const h = hash(id || "kurai");
  const n = [6, 8, 10, 12][h % 4] ?? 8;
  const offset = ((h >>> 3) % 12) * 7.5;
  const rays = Array.from({ length: n }, (_, i) => {
    const a = ((offset + (360 / n) * i) * Math.PI) / 180;
    const long = ((h >>> (i % 24)) & 1) === 1 || i === 0;
    const r1 = long ? 11 : 7.5;
    // округление: сервер и браузер расходятся в последних знаках cos/sin, что ломает гидрацию
    const at = (r: number, f: (x: number) => number) => Math.round((12 + f(a) * r) * 100) / 100;
    return { x1: at(2.6, Math.cos), y1: at(2.6, Math.sin), x2: at(r1, Math.cos), y2: at(r1, Math.sin), i };
  });
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={cn("shrink-0 text-ink", className)}>
      {rays.map((r) => (
        <line
          key={r.i}
          x1={r.x1}
          y1={r.y1}
          x2={r.x2}
          y2={r.y2}
          strokeWidth={1.35}
          strokeLinecap="square"
          stroke={kind === "media" && r.i === 0 ? "var(--color-signal)" : "currentColor"}
        />
      ))}
      {kind === "auto" && <rect x={10.4} y={10.4} width={3.2} height={3.2} fill="var(--color-acc)" />}
    </svg>
  );
}

/** Вид знака по группе модели. */
export function glyphKind(group: string | undefined): Kind {
  if (group === "auto") return "auto";
  if (group === "image" || group === "video" || group === "audio") return "media";
  return "text";
}
