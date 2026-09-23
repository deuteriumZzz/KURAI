"use client";

import { AudioLines, FileImage, FileSpreadsheet, FileText, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { fileKind } from "@/lib/files";
import { formatBytes } from "@/lib/format";
import { Segments } from "@/components/fx/primitives";

export type Attachment = { id: string; name: string; size: number; type: string; progress: number; previewUrl?: string };

const ICON = { image: FileImage, pdf: FileText, doc: FileText, sheet: FileSpreadsheet, audio: AudioLines, text: FileText } as const;

/** «Осколки данных» — вложения у поля ввода: тип, размер, загрузка шкалой, удаление. */
export function AttachmentChips({ items, onRemove }: { items: Attachment[]; onRemove: (id: string) => void }) {
  return (
    <ul aria-label="Вложения" className={items.length ? "mb-2 flex flex-wrap gap-1.5" : "hidden"}>
      <AnimatePresence initial={false}>
      {items.map((a) => {
        const Icon = ICON[fileKind(a.type)];
        const done = a.progress >= 1;
        return (
          <motion.li key={a.id} layout initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }} transition={{ duration: 0.2 }} className="fx-chamfer flex max-w-60 items-center gap-2 border border-line2 bg-g2 py-1.5 pr-1 pl-2 [--ch:var(--chamfer-sm)]">
            {a.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- локальное превью blob:
              <img src={a.previewUrl} alt="" className="size-7 shrink-0 border border-line object-cover" />
            ) : (
              <Icon size={16} strokeWidth={1.5} className="shrink-0 text-acc" aria-hidden="true" />
            )}
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[12.5px]">{a.name}</span>
              {done ? (
                <span className="font-mono text-[10.5px] text-ink3">{formatBytes(a.size)} · ✓</span>
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
