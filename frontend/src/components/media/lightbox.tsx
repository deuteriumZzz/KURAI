"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Download, X } from "lucide-react";
import { lightboxStore } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { Label } from "@/components/fx/primitives";
import { useFocusTrap } from "@/lib/use-focus-trap";

/**
 * Полноэкранный просмотр. Картинка «перелетает» из ленты (общий layoutId), ←/→ листают, Esc закрывает.
 * Видео — только кадр-превью: воспроизведение без файла не имитируется.
 */
export function Lightbox() {
  const state = useStore(lightboxStore);
  const dialogRef = useRef<HTMLDivElement>(null);
  const item = state?.items[state.index];

  useFocusTrap(!!state && !!item, dialogRef);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") lightboxStore.set(null);
      if (e.key === "ArrowRight") lightboxStore.set((s) => (s ? { ...s, index: Math.min(s.items.length - 1, s.index + 1) } : s));
      if (e.key === "ArrowLeft") lightboxStore.set((s) => (s ? { ...s, index: Math.max(0, s.index - 1) } : s));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  const go = (d: number) => lightboxStore.set((s) => (s ? { ...s, index: Math.max(0, Math.min(s.items.length - 1, s.index + d)) } : s));

  return (
    <AnimatePresence>
      {state && item && (
        <motion.div
          key="lb"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={item.alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex flex-col bg-bg/96"
          onClick={(e) => e.target === e.currentTarget && lightboxStore.set(null)}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Label>
              {state.index + 1} / {state.items.length} · ← → листать · Esc закрыть
            </Label>
            <div className="flex items-center gap-1">
              <a href={item.src} download aria-label="Скачать" className="grid size-10 place-items-center text-ink2 hover:text-ink">
                <Download size={18} strokeWidth={1.5} />
              </a>
              <button type="button" onClick={() => lightboxStore.set(null)} aria-label="Закрыть" autoFocus className="grid size-10 cursor-pointer place-items-center text-ink2 hover:text-ink">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16" onClick={(e) => e.target === e.currentTarget && lightboxStore.set(null)}>
            <motion.img
              key={item.id}
              layoutId={`media-${item.id}`}
              src={item.src}
              alt={item.alt}
              className="max-h-full max-w-full rounded-(--radius-sm) border border-line2 object-contain"
              transition={{ type: "tween", duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            />
            {state.index > 0 && (
              <button type="button" onClick={() => go(-1)} aria-label="Предыдущее" className="absolute left-2 grid size-11 cursor-pointer place-items-center border border-line bg-g1/80 text-ink2 hover:text-ink sm:left-4">
                <ArrowLeft size={18} strokeWidth={1.5} />
              </button>
            )}
            {state.index < state.items.length - 1 && (
              <button type="button" onClick={() => go(1)} aria-label="Следующее" className="absolute right-2 grid size-11 cursor-pointer place-items-center border border-line bg-g1/80 text-ink2 hover:text-ink sm:right-4">
                <ArrowRight size={18} strokeWidth={1.5} />
              </button>
            )}
          </div>
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-4">
            {item.kind === "video" && <p className="text-center text-[12.5px] text-ink3">Кадр-превью. Видео воспроизводится в карточке ответа, когда файл загружен в хранилище.</p>}
            {item.caption && <p className="text-center text-[13.5px] text-ink2">{item.caption}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
