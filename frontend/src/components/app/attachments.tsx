"use client";

import { AudioLines, Check, FileImage, FileSpreadsheet, FileText, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { fileKind } from "@/lib/files";
import { formatBytes } from "@/lib/format";
import { Segments } from "@/components/fx/primitives";
import { cn } from "@/lib/cn";
import { SPRING } from "@/lib/motion";

export type Attachment = { id: string; name: string; size: number; type: string; progress: number; previewUrl?: string; assetId?: string; /** загрузка не удалась: чип показывает ошибку и уходит сам */ failed?: boolean };

const ICON = { image: FileImage, pdf: FileText, doc: FileText, sheet: FileSpreadsheet, audio: AudioLines, text: FileText } as const;

/** 16 — вложения у поля ввода: въезжают, показывают реальный прогресс загрузки, затем «готов» или ошибку. */
export function AttachmentChips({ items, onRemove }: { items: Attachment[]; onRemove: (id: string) => void }) {
  return (
    <ul aria-label="Вложения" className={items.length ? "mb-2 flex flex-wrap gap-1.5" : "hidden"}>
      <AnimatePresence initial={false}>
      {items.map((a) => {
        const Icon = ICON[fileKind(a.type)];
        const done = a.progress >= 1;
        return (
          <motion.li
            key={a.id}
            layout="position"
            initial={{ opacity: 0, x: -10, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.14 } }}
            transition={SPRING.snappy}
            className={cn("flex max-w-64 items-center gap-2.5 rounded-(--radius-sm) border bg-g2 py-1.5 pr-1 pl-2 transition-colors duration-(--dur-base)", a.failed ? "fx-glitch border-err/60" : done ? "border-line2" : "border-line")}
          >
            {a.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- локальное превью blob:
              <img src={a.previewUrl} alt="" className="size-7 shrink-0 border border-line object-cover" />
            ) : (
              <Icon size={16} strokeWidth={1.5} className="shrink-0 text-ink2" aria-hidden="true" />
            )}
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[12.5px]">{a.name}</span>
              {a.failed ? (
                <span className="font-mono text-[10.5px] text-err">ошибка загрузки</span>
              ) : done ? (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 font-mono text-[10.5px] text-ink3">
                  {formatBytes(a.size)} · <Check size={11} strokeWidth={2} className="text-(--color-acc-text)" /> готов
                </motion.span>
              ) : (
                <Segments value={a.progress} count={8} label={`Загрузка ${a.name}`} className="mt-1 w-20" />
              )}
            </span>
            <button type="button" onClick={() => onRemove(a.id)} aria-label={`Убрать ${a.name}`} className="grid size-6 shrink-0 cursor-pointer place-items-center text-ink3 hover:text-ink pointer-coarse:size-9">
              <X size={12} strokeWidth={1.5} />
            </button>
          </motion.li>
        );
      })}
      </AnimatePresence>
    </ul>
  );
}
