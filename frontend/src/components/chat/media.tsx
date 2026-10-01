"use client";

import { Clapperboard, Layers, Maximize2, Volume2 } from "lucide-react";
import { motion } from "motion/react";
import { openLightbox } from "@/lib/app-state";
import { PixelReveal } from "@/components/fx/pixel-reveal";
import type { MessagePart } from "@/types/api";
import { cn } from "@/lib/cn";
import { Label } from "@/components/fx/primitives";

type Job = Extract<MessagePart, { type: "job" }>;

const KIND = { image: "Изображение", video: "Видео", audio: "Аудио", research: "Исследование", slides: "Слайды" } as const;

/** Карточка задачи генерации: очередь, реальный прогресс, для видео — монтажная лента кадров. */
export function JobCard({ job, queuePosition, tip }: { job: Job; queuePosition?: number; tip?: string }) {
  const pct = Math.round(job.progress * 100);
  // пурпурный локальный сигнал — только пока генерация реально идёт; на финальном состоянии гаснет
  const live = job.status === "queued" || job.status === "running";
  const status =
    job.status === "queued"
      ? `в очереди${queuePosition ? ` · позиция ${queuePosition}` : ""}`
      : job.status === "running"
        ? `генерация · ${pct}%`
        : job.status === "failed"
          ? "ошибка"
          : job.status === "canceled"
            ? "остановлено"
          : "готово";

  return (
    <div className="flex max-w-lg flex-col gap-2.5 rounded-(--radius-md) border border-line bg-g1 p-3">
      {job.kind === "image" && (
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn("aspect-square rounded-(--radius-sm) border bg-g2", live ? "k-live border-signal-line" : "border-line")} />
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
                i < Math.round(job.progress * 8) ? "border-signal-line bg-signal-soft" : "border-line bg-g2",
              )}
            />
          ))}
        </div>
      )}
      <div role="progressbar" aria-label={`${KIND[job.kind]}: прогресс`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-1 overflow-hidden rounded-full bg-s3">
        <div className="h-full bg-signal transition-[width] duration-(--dur-base)" style={{ width: `${pct}%` }} />
      </div>
      <p className={cn("flex items-center gap-2 text-[13px]", job.status === "failed" ? "text-err" : job.status === "canceled" ? "text-warn" : "text-ink2")}>
        {live && <i aria-hidden="true" className="k-live size-1.5 bg-signal" />}
        {KIND[job.kind]} · {status}
      </p>
      {tip && <p className="text-[12.5px] text-ink3">{tip}</p>}
      {job.kind === "video" && job.status !== "done" && (
        <p className="text-[12.5px] text-ink3">Можно продолжать работу — видео появится в этом ответе, когда будет готово.</p>
      )}
    </div>
  );
}

export type ImageAction = "upscale" | "variants" | "animate";

export function ImageGrid({ images, id, caption, onAction, fresh = false }: { images: Extract<MessagePart, { type: "image" }>[]; id: string; caption?: string; onAction?: (a: ImageAction, index: number) => void; fresh?: boolean }) {
  const items = images.map((img, i) => ({ id: `${id}-${i}`, src: img.url, alt: img.alt, caption, kind: "image" as const }));
  return (
    <div className={cn("grid max-w-lg gap-1.5 rounded-(--radius-md) border border-line p-1.5", images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
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
                  className="flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded-(--radius-sm) border border-line2 bg-bg/85 text-[11.5px] text-ink2 hover:text-ink pointer-coarse:h-9"
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

export function VideoCard({ video, caption }: { video: Extract<MessagePart, { type: "video" }>; caption?: string }) {
  return (
    <figure className="fx-reveal relative w-full max-w-lg rounded-(--radius-md) border border-line p-1.5">
      {video.url ? (
        <video controls preload="metadata" src={video.url} poster={video.poster} className="aspect-video w-full bg-bg object-cover" aria-label={caption ?? "Сгенерированное видео"} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- кадр-превью, пока файл не загружен
        <img src={video.poster} alt={caption ?? "Кадр сгенерированного видео"} className="aspect-video w-full bg-bg object-cover" />
      )}
      <figcaption className="mt-2 flex items-center justify-between gap-3 px-1"><Label>{video.url ? "Видео готово" : "Видео готово · файл появится после загрузки в хранилище"}</Label><Label className="text-signal">{video.durationSec} с</Label></figcaption>
    </figure>
  );
}

/** Приватный TTS-результат: браузер запрашивает только owner-scoped URL KURAI. */
export function AudioCard({ audio }: { audio: Extract<MessagePart, { type: "audio" }> }) {
  return (
    <div className="flex max-w-lg items-center gap-3 rounded-(--radius-md) border border-line bg-g1 p-3">
      <span aria-hidden="true" className="grid size-8 place-items-center border border-signal-line text-signal"><Volume2 size={15} strokeWidth={1.5} /></span>
      <audio controls preload="metadata" src={audio.url} className="min-w-0 flex-1" aria-label="Сгенерированное аудио" />
    </div>
  );
}
