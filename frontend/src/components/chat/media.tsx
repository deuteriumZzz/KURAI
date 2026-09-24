"use client";

import { Clapperboard, Layers, Maximize2, Play } from "lucide-react";
import { motion } from "motion/react";
import { openLightbox } from "@/lib/app-state";
import { PixelReveal } from "@/components/fx/pixel-reveal";
import type { MessagePart } from "@/types/api";
import { cn } from "@/lib/cn";
import { Label, Scanline, Segments, SysLine } from "@/components/fx/primitives";

type Job = Extract<MessagePart, { type: "job" }>;

const KIND = { image: "Изображение", video: "Видео", audio: "Аудио", research: "Исследование", slides: "Слайды" } as const;

/** Карточка задачи генерации: очередь, реальный прогресс, для видео — монтажная лента кадров. */
export function JobCard({ job, queuePosition, tip }: { job: Job; queuePosition?: number; tip?: string }) {
  const pct = Math.round(job.progress * 100);
  const status =
    job.status === "queued"
      ? `в очереди${queuePosition ? ` · позиция ${queuePosition}` : ""}`
      : job.status === "running"
        ? `генерация · ${pct}%`
        : job.status === "failed"
          ? "ошибка · кредиты возвращены"
          : "готово";

  return (
    <div className="flex max-w-lg flex-col gap-2.5 border border-line bg-g1 p-3">
      {job.kind === "image" && (
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="relative aspect-square overflow-hidden border border-line bg-g2">
              <Scanline active={job.status !== "failed"} />
            </div>
          ))}
        </div>
      )}
      {job.kind === "video" && (
        <div aria-hidden="true" className="grid grid-cols-8 gap-1">
          {Array.from({ length: 8 }, (_, i) => (
            <i
              key={i}
              className={cn(
                "aspect-[16/10] border transition-colors duration-(--dur-base)",
                i < Math.round(job.progress * 8) ? "border-acc-line bg-acc-soft" : "border-line bg-g2",
              )}
            />
          ))}
        </div>
      )}
      <Segments value={job.progress} count={16} label={`${KIND[job.kind]}: прогресс`} />
      <SysLine tone={job.status === "failed" ? "err" : "default"}>{`${KIND[job.kind]} · ${status}`}</SysLine>
      {tip && <p className="text-[12.5px] text-ink3">{tip}</p>}
      {job.kind === "video" && job.status !== "done" && (
        <p className="text-[12.5px] text-ink3">Можно продолжать писать — пришлём уведомление, когда видео будет готово.</p>
      )}
    </div>
  );
}

export type ImageAction = "upscale" | "variants" | "animate";

export function ImageGrid({ images, id, caption, onAction, fresh = false }: { images: Extract<MessagePart, { type: "image" }>[]; id: string; caption?: string; onAction?: (a: ImageAction, index: number) => void; fresh?: boolean }) {
  const items = images.map((img, i) => ({ id: `${id}-${i}`, src: img.url, alt: img.alt, caption, kind: "image" as const }));
  return (
    <div className={cn("fx-flicker-border grid max-w-lg gap-1.5 border border-line p-1.5", images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
      {images.map((img, i) => (
        <div key={i} className="group relative overflow-hidden border border-line">
          <PixelReveal src={img.url} active={fresh}>
          <button
            type="button"
            onClick={() => openLightbox(items, i)}
            onDragStart={(e) => e.dataTransfer.setData("application/x-kurai-image", img.url)}
            aria-label={`Открыть: ${img.alt}. Можно перетащить в поле ввода как референс`}
            className="block w-full cursor-zoom-in"
          >
            <motion.img
              draggable
              layoutId={`media-${id}-${i}`}
              src={img.url}
              alt={img.alt}
              width={img.width}
              height={img.height}
              className="aspect-square w-full object-cover transition-transform duration-(--dur-slow) ease-(--ease-out) group-hover:scale-[1.03]"
            />
          </button>
          </PixelReveal>
          {onAction && (
            <div className="absolute inset-x-1 bottom-1 flex gap-1 opacity-0 transition-opacity duration-(--dur-fast) group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
              {([
                ["upscale", "Увеличить", Maximize2],
                ["variants", "Варианты", Layers],
                ["animate", "Оживить", Clapperboard],
              ] as const).map(([a, label, Icon]) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onAction(a, i)}
                  title={label}
                  className="flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 border border-line2 bg-bg/85 text-[11px] text-ink2 hover:border-acc-line hover:text-acc pointer-coarse:h-9"
                >
                  <Icon size={12} strokeWidth={1.5} aria-hidden="true" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function VideoCard({ video, id, caption }: { video: Extract<MessagePart, { type: "video" }>; id: string; caption?: string }) {
  return (
    <button
      type="button"
      onClick={() => openLightbox([{ id, src: video.poster ?? "", alt: caption ?? "Видео", caption, kind: "video", durationSec: video.durationSec }], 0)}
      aria-label="Открыть видео"
      className="fx-reveal fx-flicker-border relative block w-full max-w-lg cursor-zoom-in border border-line p-1.5 text-left"
    >
      <motion.img layoutId={`media-${id}`} src={video.poster} alt="Кадр видео" className="aspect-video w-full object-cover" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-12 place-items-center border border-acc bg-bg/60 text-acc">
          <Play size={20} strokeWidth={1.5} />
        </span>
      </span>
      <Label className="absolute bottom-3 left-3 bg-bg/80 px-1.5">{`0:0${video.durationSec} · превью`}</Label>
    </button>
  );
}
