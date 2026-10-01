"use client";

import Link from "next/link";
import { AudioLines, Clapperboard, Play, Star } from "lucide-react";
import type { MediaItem } from "@/types/api";
import { formatBytes, formatCredits } from "@/lib/format";
import { Label } from "@/components/fx/primitives";
import { motion } from "motion/react";
import { openLightbox, type LightboxItem } from "@/lib/app-state";

const KIND = { image: "Изображение", video: "Видео", audio: "Аудио" } as const;
const MODE = { image: "image", video: "video", audio: "audio" } as const;

/** Карточка медиатеки как «файл записи»: превью, а при наведении — модель, промпт, цена и действия. */
export function MediaCard({ item, all = [], index = 0, fav = false, onFav, onDetails }: { item: MediaItem; all?: LightboxItem[]; index?: number; fav?: boolean; onFav?: () => void; onDetails?: () => void }) {
  const repeat = `/app?mode=${MODE[item.kind]}&prompt=${encodeURIComponent(item.prompt)}`;
  const date = new Date(item.createdAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

  return (
    <article data-kind={item.kind} className="kurai-asset-card group relative flex flex-col bg-g1">
      <div className="relative aspect-square overflow-hidden bg-g2">
        {item.kind === "audio" ? (
          <div className="grid h-full place-items-center">
            <AudioLines size={28} strokeWidth={1.5} className="text-signal" aria-hidden="true" />
          </div>
        ) : !(item.kind === "video" ? item.poster : item.url) ? (
          // у видео нет кадра-превью — честная плашка вместо битого изображения
          <div className="grid h-full place-items-center">
            <Clapperboard size={28} strokeWidth={1.5} className="text-signal" aria-hidden="true" />
          </div>
        ) : (
          <button type="button" onClick={() => openLightbox(all, index)} aria-label={`Открыть: ${item.prompt}`} className="block h-full w-full cursor-zoom-in">
            <motion.img
              layoutId={`media-${item.id}`}
              src={item.kind === "video" ? item.poster : item.url}
              alt={item.prompt}
              className="h-full w-full object-cover transition-transform duration-(--dur-slow) ease-(--ease-out) group-hover:scale-[1.04]"
              loading="lazy"
            />
          </button>
        )}
        {item.kind === "video" && (
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
            <span className="grid size-10 place-items-center rounded-(--radius-sm) border border-line2 bg-bg/80 text-ink">
              <Play size={16} strokeWidth={1.5} />
            </span>
          </span>
        )}
        {onFav && (
          <button
            type="button"
            onClick={onFav}
            aria-pressed={fav}
            aria-label={fav ? "Убрать из избранного" : "В избранное"}
            className={`absolute top-2 right-2 z-10 grid size-8 cursor-pointer place-items-center bg-g2/90 pointer-coarse:size-11 ${fav ? "text-acc" : "text-ink3 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"}`}
          >
            <Star size={14} strokeWidth={1.5} fill={fav ? "currentColor" : "none"} />
          </button>
        )}
        {item.durationSec && (
          <Label className="absolute right-2 bottom-2 bg-bg/80 px-1.5 text-ink">{`${Math.floor(item.durationSec / 60)}:${String(item.durationSec % 60).padStart(2, "0")}`}</Label>
        )}

        {/* метаданные записи: наведение или фокус с клавиатуры */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end gap-2 bg-gradient-to-t from-g1 via-g1/90 to-transparent p-3 pt-10 opacity-0 transition-opacity duration-(--dur-fast) group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:hidden">
          <Label className="text-ink2">{item.model}</Label>
          <p className="line-clamp-4 text-[13px] leading-snug">{item.prompt}</p>
          <Label className="tracking-[0.04em] normal-case">
            {formatCredits(item.costMicro)} · {formatBytes(item.sizeBytes)} · {date}
          </Label>
          <Link href={repeat} className="pointer-events-auto rounded-(--radius-sm) border border-line2 bg-g1/90 px-2 py-1.5 text-center text-[12.5px] text-ink hover:bg-g3">
            Повторить запрос
          </Link>
        </div>
      </div>
      <Link
        href={repeat}
        className="hidden flex-col gap-1.5 bg-s2 p-3 text-[12.5px] pointer-coarse:flex"
      >
        <span className="line-clamp-2 leading-snug text-ink2">{item.prompt}</span>
        <span className="text-ink2">Повторить запрос →</span>
      </Link>
      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-1.5 text-[12.5px]">
        <span className="min-w-0 truncate text-ink2">{KIND[item.kind]} · <span className="text-ink3">{item.model}</span></span>
        {onDetails && (
          <button type="button" onClick={onDetails} aria-label={`Детали: ${item.prompt}`} className="k-tool h-8 shrink-0 px-2 text-[12.5px]">
            Детали
          </button>
        )}
      </div>
    </article>
  );
}
