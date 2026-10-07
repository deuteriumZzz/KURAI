"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clapperboard, Layers, Maximize2, Pause, Play, Volume2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { dominantColors } from "@/lib/palette";
import { SPRING } from "@/lib/motion";
import { openLightbox } from "@/lib/app-state";
import { PixelReveal } from "@/components/fx/pixel-reveal";
import type { MessagePart } from "@/types/api";
import { cn } from "@/lib/cn";
import { Label } from "@/components/fx/primitives";

type Job = Extract<MessagePart, { type: "job" }>;

const KIND = { image: "Изображение", video: "Видео", audio: "Аудио", research: "Исследование", slides: "Слайды" } as const;

/** Карточка задачи генерации: очередь, реальный прогресс, для видео — монтажная лента кадров. */
export function JobCard({ job, queuePosition, tip, since }: { job: Job; queuePosition?: number; tip?: string; since?: number }) {
  const pct = Math.round(job.progress * 100);
  // пурпурный локальный сигнал — только пока генерация реально идёт; на финальном состоянии гаснет
  const live = job.status === "queued" || job.status === "running";
  // 73 — сервер не всегда знает позицию: тогда честно считаем, сколько задача ждёт
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (job.status !== "queued" || queuePosition || !since) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [job.status, queuePosition, since]);
  const waited = since && now > since ? Math.round((now - since) / 1000) : 0;
  const status =
    job.status === "queued"
      ? queuePosition
        ? (
            <>
              в очереди · позиция{" "}
              <span className="relative inline-block overflow-hidden align-bottom">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={queuePosition} initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={SPRING.snappy} className="inline-block font-mono tabular-nums">
                    {queuePosition}
                  </motion.span>
                </AnimatePresence>
              </span>
            </>
          )
        : `в очереди${waited ? ` · ${waited} с` : ""}`
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
            // К7 — по заготовке идёт пурпурная скан-линия, пока картинка реально генерируется
            <div key={i} className={cn("relative aspect-square overflow-hidden rounded-(--radius-sm) border bg-g2", live ? "k-gen-scan border-signal-line" : "border-line")} style={{ animationDelay: `${i * 180}ms` }} />
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
  const [picked, setPicked] = useState(0);
  // 31 — выбрали вариант: он занимает место целиком, остальные уступают и встают рядком ниже
  const [chosen, setChosen] = useState<number | null>(null);
  return (
    <div className="flex max-w-lg flex-col gap-2">
    <div className={cn("grid gap-1.5 rounded-(--radius-md) border border-line p-1.5", images.length === 1 ? "grid-cols-1" : chosen !== null ? "grid-cols-3" : "grid-cols-2")}>
      {images.map((img, i) => (
        // 31 — новые варианты раскладываются в сетку лесенкой, сетка перестраивается плавно
        <motion.div
          key={i}
          layout
          initial={fresh ? { opacity: 0, scale: 0.92 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING.gentle, delay: fresh ? i * 0.07 : 0 }}
          onMouseEnter={() => setPicked(i)}
          onFocus={() => setPicked(i)}
          className={cn("group relative overflow-hidden rounded-(--radius-sm) border", chosen === i ? "order-first col-span-3 border-acc" : "border-line")}
        >
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
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => setChosen((c) => (c === i ? null : i))}
                  aria-pressed={chosen === i}
                  title={chosen === i ? "Снять выбор" : "Выбрать"}
                  className={cn("flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded-(--radius-sm) border border-line2 bg-bg/85 text-[11.5px] hover:text-ink pointer-coarse:h-9", chosen === i ? "text-acc" : "text-ink2")}
                >
                  <Check size={12} strokeWidth={1.5} aria-hidden="true" />
                  <span className="hidden sm:inline">{chosen === i ? "Выбран" : "Выбрать"}</span>
                </button>
              )}
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
        </motion.div>
      ))}
    </div>
    {images[picked] && <Palette src={images[picked].url} />}
    </div>
  );
}

/** 110 — пять основных цветов картинки из её пикселей; клик копирует код. Нет доступа к пикселям — палитры нет. */
function Palette({ src }: { src: string }) {
  const [colors, setColors] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 48;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 48, 48);
        if (alive) setColors(dominantColors(ctx.getImageData(0, 0, 48, 48).data, 5));
      } catch {
        // чужой источник без CORS: пиксели недоступны — не выдумываем цвета
        if (alive) setColors([]);
      }
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  if (colors.length === 0) return null;
  return (
    <ul aria-label="Палитра изображения" className="k-stagger flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <li key={c}>
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(c).then(() => {
              setCopied(c);
              setTimeout(() => setCopied(null), 1200);
            }, () => undefined)}
            aria-label={`Скопировать цвет ${c}`}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-(--radius-sm) border border-line px-1.5 font-mono text-[11px] text-ink2 hover:border-line2 hover:text-ink"
          >
            <i aria-hidden="true" className="size-3.5 rounded-[3px] border border-line2" style={{ background: c }} />
            {copied === c ? <Check size={12} strokeWidth={2} className="text-acc" /> : c}
          </button>
        </li>
      ))}
    </ul>
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
  const el = useRef<HTMLAudioElement>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [state, setState] = useState({ t: 0, dur: 0, playing: false, rate: 1 });

  // 33 — волна из самого файла: пики по реальным отсчётам; не удалось декодировать — обычный плеер
  useEffect(() => {
    let alive = true;
    const AC = typeof window !== "undefined" ? window.AudioContext : undefined;
    if (!AC) return;
    const ctx = new AC();
    void fetch(audio.url, { credentials: "include" })
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => {
        const data = decoded.getChannelData(0);
        const step = Math.max(1, Math.floor(data.length / 56));
        const out = Array.from({ length: 56 }, (_, i) => {
          let max = 0;
          for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 16) max = Math.max(max, Math.abs(data[j] ?? 0));
          return max;
        });
        const top = Math.max(0.01, ...out);
        if (alive) setPeaks(out.map((v) => v / top));
      })
      .catch(() => undefined)
      .finally(() => void ctx.close());
    return () => {
      alive = false;
    };
  }, [audio.url]);

  // указатель бежит плавно, пока идёт воспроизведение
  useEffect(() => {
    if (!state.playing) return;
    let raf = 0;
    const loop = () => {
      const a = el.current;
      if (a) setState((s) => ({ ...s, t: a.currentTime, dur: a.duration || s.dur }));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state.playing]);

  if (!peaks) {
    return (
      <div className="flex max-w-lg items-center gap-3 rounded-(--radius-md) border border-line bg-g1 p-3">
        <span aria-hidden="true" className="grid size-8 place-items-center border border-signal-line text-signal"><Volume2 size={15} strokeWidth={1.5} /></span>
        <audio controls preload="metadata" src={audio.url} className="min-w-0 flex-1" aria-label="Сгенерированное аудио" />
      </div>
    );
  }
  const ratio = state.dur ? state.t / state.dur : 0;
  const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
  return (
    <div className="flex max-w-lg items-center gap-3 rounded-(--radius-md) border border-line bg-g1 p-3">
      <audio
        ref={el}
        preload="metadata"
        src={audio.url}
        onLoadedMetadata={(e) => {
          // значение читаем сразу: к моменту обновления состояния React уже обнулит currentTarget
          const dur = e.currentTarget.duration;
          setState((s) => ({ ...s, dur }));
        }}
        onPlay={() => setState((s) => ({ ...s, playing: true }))}
        onPause={() => setState((s) => ({ ...s, playing: false }))}
        onEnded={() => setState((s) => ({ ...s, playing: false, t: 0 }))}
      />
      <button
        type="button"
        onClick={() => (state.playing ? el.current?.pause() : void el.current?.play())}
        aria-label={state.playing ? "Пауза" : "Слушать"}
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-signal-line text-signal hover:bg-signal-soft"
      >
        {state.playing ? <Pause size={15} strokeWidth={1.5} /> : <Play size={15} strokeWidth={1.5} />}
      </button>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Позиция воспроизведения"
        aria-valuemin={0}
        aria-valuemax={Math.round(state.dur)}
        aria-valuenow={Math.round(state.t)}
        onKeyDown={(e) => {
          const a = el.current;
          if (!a) return;
          if (e.key === "ArrowRight") a.currentTime = Math.min(a.duration, a.currentTime + 5);
          if (e.key === "ArrowLeft") a.currentTime = Math.max(0, a.currentTime - 5);
          setState((s) => ({ ...s, t: a.currentTime }));
        }}
        onClick={(e) => {
          const a = el.current;
          if (!a || !state.dur) return;
          const r = e.currentTarget.getBoundingClientRect();
          a.currentTime = ((e.clientX - r.left) / r.width) * state.dur;
          setState((s) => ({ ...s, t: a.currentTime }));
        }}
        className="relative flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-[2px]"
      >
        {peaks.map((p, i) => (
          <i key={i} aria-hidden="true" className={cn("flex-1 rounded-full", i / peaks.length < ratio ? "bg-signal" : "bg-line2")} style={{ height: `${Math.max(10, p * 100)}%` }} />
        ))}
        <i aria-hidden="true" className="absolute inset-y-0 w-px bg-ink" style={{ left: `${ratio * 100}%` }} />
      </div>
      <span className="font-mono text-[11px] text-ink3 tabular-nums">{clock(state.t)} / {clock(state.dur)}</span>
      <button
        type="button"
        onClick={() => {
          const rate = state.rate === 1 ? 1.5 : state.rate === 1.5 ? 2 : 1;
          if (el.current) el.current.playbackRate = rate;
          setState((s) => ({ ...s, rate }));
        }}
        aria-label={`Скорость ${state.rate}×`}
        className="k-tool h-7 px-1.5 font-mono text-[11px]"
      >
        {state.rate}×
      </button>
    </div>
  );
}
