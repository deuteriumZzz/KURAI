import Link from "next/link";
import { AudioLines, Play } from "lucide-react";
import type { MediaItem } from "@/types/api";
import { formatBytes, formatCredits } from "@/lib/format";
import { Label } from "@/components/fx/primitives";

const KIND = { image: "Изображение", video: "Видео", audio: "Аудио" } as const;
const MODE = { image: "image", video: "video", audio: "audio" } as const;

/** Детерминированная «волна» для аудио-заглушки (настоящая форма сигнала придёт с бэкендом). */
function wave(seed: number): number[] {
  return Array.from({ length: 32 }, (_, i) => 20 + Math.round(Math.abs(Math.sin((i + seed) * 1.7) * 55 + Math.sin(i * 0.5) * 20)));
}

/** Карточка медиатеки как «файл записи»: превью, а при наведении — модель, промпт, цена и действия. */
export function MediaCard({ item }: { item: MediaItem }) {
  const repeat = `/app?mode=${MODE[item.kind]}&prompt=${encodeURIComponent(item.prompt)}`;
  const date = new Date(item.createdAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

  return (
    <article className="group relative flex flex-col border border-line bg-g1 transition-colors duration-(--dur-fast) focus-within:border-acc-line hover:border-line2">
      <div className="relative aspect-square overflow-hidden bg-g2">
        {item.kind === "audio" ? (
          <div className="flex h-full flex-col justify-center gap-3 p-4">
            <AudioLines size={20} strokeWidth={1.5} className="text-acc" aria-hidden="true" />
            <div aria-hidden="true" className="flex h-16 items-center gap-0.5">
              {wave(item.prompt.length).map((h, i) => (
                <i key={i} className="flex-1 bg-line2" style={{ height: `${Math.min(100, h)}%` }} />
              ))}
            </div>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- data: URI заглушек; настоящие файлы пойдут через next/image
          <img src={item.kind === "video" ? item.poster : item.url} alt={item.prompt} className="h-full w-full object-cover" loading="lazy" />
        )}
        {item.kind === "video" && (
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
            <span className="grid size-10 place-items-center border border-acc bg-bg/60 text-acc">
              <Play size={16} strokeWidth={1.5} />
            </span>
          </span>
        )}
        {item.durationSec && (
          <Label className="absolute right-2 bottom-2 bg-bg/80 px-1.5 text-ink">{`0:${String(item.durationSec).padStart(2, "0")}`}</Label>
        )}

        {/* метаданные записи: наведение или фокус с клавиатуры */}
        <div className="absolute inset-0 flex flex-col justify-end gap-2 bg-bg/88 p-3 opacity-0 transition-opacity duration-(--dur-fast) group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:hidden">
          <Label className="text-acc">{item.model}</Label>
          <p className="line-clamp-4 text-[13px] leading-snug">{item.prompt}</p>
          <Label className="tracking-[0.04em] normal-case">
            {formatCredits(item.costMicro)} · {formatBytes(item.sizeBytes)} · {date}
          </Label>
          <Link href={repeat} className="border border-acc-line bg-acc-soft px-2 py-1.5 text-center text-[12.5px] text-acc hover:bg-acc hover:text-acc-ink">
            Повторить с этими настройками
          </Link>
        </div>
      </div>
      <Link
        href={`/app/c/${item.chatId}#msg-${item.messageId}`}
        className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-[12.5px] text-ink2 hover:text-ink pointer-coarse:py-3"
      >
        <span className="truncate">{KIND[item.kind]}</span>
        <Label className="shrink-0">#{item.chatId.toUpperCase()} →</Label>
      </Link>
    </article>
  );
}
