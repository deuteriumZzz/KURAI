import { Play } from "lucide-react";
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
                i < Math.round(job.progress * 8) ? "border-acc-line bg-[linear-gradient(135deg,#123036,#0d1218_70%)]" : "border-line bg-g2",
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

export function ImageGrid({ images }: { images: Extract<MessagePart, { type: "image" }>[] }) {
  return (
    <div className="fx-reveal fx-flicker-border grid max-w-lg grid-cols-2 gap-1.5 border border-line p-1.5">
      {images.map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- data: URI заглушек; настоящие результаты пойдут через next/image
        <img key={i} src={img.url} alt={img.alt} width={img.width} height={img.height} className="aspect-square w-full border border-line object-cover" />
      ))}
    </div>
  );
}

export function VideoCard({ video }: { video: Extract<MessagePart, { type: "video" }> }) {
  return (
    <div className="fx-reveal fx-flicker-border relative max-w-lg border border-line p-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- постер-заглушка */}
      <img src={video.poster} alt="Кадр видео" className="aspect-video w-full object-cover" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-12 place-items-center border border-acc bg-bg/60 text-acc">
          <Play size={20} strokeWidth={1.5} />
        </span>
      </span>
      <Label className="absolute bottom-3 left-3 bg-bg/80 px-1.5">{`0:0${video.durationSec} · превью`}</Label>
    </div>
  );
}
