"use client";

import type { Message } from "@/types/api";
import type { RunState } from "@/lib/stream";
import { formatBytes } from "@/lib/format";
import { openLightbox } from "@/lib/app-state";
import { Label } from "@/components/fx/primitives";

/** Правая колонка контекста чата (как в десктопном Kimi): файлы, источники и медиа этой ветки. */
export function ContextPanel({ branch, runs, onJump }: { branch: Message[]; runs: Record<string, RunState>; onJump: (id: string) => void }) {
  const files = branch.flatMap((m) => m.parts.filter((p) => p.type === "file").map((p) => ({ m, p })));
  const sources = branch.flatMap((m) => runs[m.id]?.sources ?? []);
  const images = branch.flatMap((m) => m.parts.flatMap((p, i) => (p.type === "image" ? [{ id: `${m.id}-${i}`, src: p.url, alt: p.alt, kind: "image" as const }] : [])));
  const videos = branch.flatMap((m) => m.parts.filter((p) => p.type === "video").map((p) => ({ m, p })));

  return (
    <aside aria-label="Контекст чата" className="hidden w-64 shrink-0 flex-col gap-5 overflow-y-auto border-l border-line bg-g1 p-4 xl:flex">
      <section className="flex flex-col gap-2">
        <Label className="text-acc">Медиа · {images.length + videos.length}</Label>
        {images.length + videos.length === 0 ? (
          <p className="text-[12.5px] text-ink3">Картинки и видео из этого чата появятся здесь.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {images.map((img, i) => (
              <button key={img.id} type="button" onClick={() => openLightbox(images, i)} aria-label={`Открыть: ${img.alt}`} className="aspect-square cursor-zoom-in overflow-hidden border border-line hover:border-acc-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- локальные превью */}
                <img src={img.src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            {videos.map(({ m, p }) =>
              p.type === "video" ? (
                <button key={m.id} type="button" onClick={() => onJump(m.id)} aria-label="Перейти к видео" className="relative aspect-square overflow-hidden border border-line hover:border-acc-line">
                  {/* eslint-disable-next-line @next/next/no-img-element -- постер */}
                  <img src={p.poster} alt="" className="h-full w-full object-cover" />
                  <span className="absolute right-1 bottom-1 bg-bg/80 px-1 font-mono text-[9px]">{p.durationSec}с</span>
                </button>
              ) : null,
            )}
          </div>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <Label className="text-acc">Источники · {sources.length}</Label>
        {sources.length === 0 ? (
          <p className="text-[12.5px] text-ink3">Когда модель ищет в интернете, ссылки собираются здесь.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {sources.map((s, i) => (
              <li key={`${s.url}-${i}`}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="block truncate text-[12.5px] text-ink2 hover:text-acc">
                  <span className="mr-1.5 font-mono text-[10px] text-acc">{i + 1}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <Label className="text-acc">Файлы · {files.length}</Label>
        {files.length === 0 ? (
          <p className="text-[12.5px] text-ink3">Прикреплённые документы и фото.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {files.map(({ m, p }) =>
              p.type === "file" ? (
                <li key={`${m.id}-${p.name}`}>
                  <button type="button" onClick={() => onJump(m.id)} className="w-full cursor-pointer truncate text-left text-[12.5px] text-ink2 hover:text-acc">
                    {p.name} <span className="font-mono text-[10.5px] text-ink3">· {formatBytes(p.sizeBytes)}</span>
                  </button>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </section>
    </aside>
  );
}
