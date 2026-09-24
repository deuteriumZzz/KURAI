"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";
import type { Artifact } from "@/lib/stream";
import { Label } from "@/components/fx/primitives";

/** Боковая панель результата: слайды (дальше — документы, код, превью сайта). */
export function SidePanel({ artifact, onClose }: { artifact: Artifact; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState(520);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.aside
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
      aria-label={`Слайды: ${artifact.title}`}
      className="fixed inset-y-0 right-0 z-30 flex w-full flex-col border-l border-line bg-g1 sm:w-[min(560px,48vw)] lg:relative lg:z-auto lg:w-(--panel-w)"
      style={{ ["--panel-w" as string]: `${width}px` }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Ширина панели"
        aria-valuenow={width}
        aria-valuemin={360}
        aria-valuemax={900}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setWidth((w) => Math.min(900, w + 40));
          if (e.key === "ArrowRight") setWidth((w) => Math.max(360, w - 40));
        }}
        onPointerDown={(e) => {
          const startX = e.clientX;
          const startW = width;
          const move = (ev: PointerEvent) => setWidth(Math.max(360, Math.min(Math.round(window.innerWidth * 0.7), startW + (startX - ev.clientX))));
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
        className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize after:absolute after:inset-y-0 after:left-1 after:w-px after:bg-line hover:after:bg-acc focus-visible:after:bg-acc lg:block"
      />
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="min-w-0">
          <p className="truncate text-[14px]">{artifact.title}</p>
          <Label>{artifact.slides.length} слайдов · стиль KURAI</Label>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Закрыть панель" className="grid size-9 cursor-pointer place-items-center text-ink2 hover:text-ink">
          <X size={16} strokeWidth={1.5} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <ol className="flex flex-col gap-3">
          {artifact.slides.map((s, i) => (
            <motion.li
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.05, duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
              key={`${s.title}-${i}`}
              className="relative flex aspect-video flex-col justify-between border border-line bg-bg p-5">
              <Label className="text-acc">{String(i + 1).padStart(2, "0")}</Label>
              <div>
                <p className="font-display text-xl font-light">{s.title}</p>
                <ul className="mt-2 flex flex-col gap-1 text-[12.5px] text-ink2">
                  {s.bullets.map((b) => (
                    <li key={b} className="before:mr-2 before:text-acc before:content-['›']">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <span aria-hidden="true" className="absolute right-3 bottom-3 h-px w-16 bg-acc" />
            </motion.li>
          ))}
        </ol>
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-line p-3">
        <Label>.pptx появится после подключения бэкенда</Label>
        <button type="button" disabled className="border border-line2 px-3 py-1.5 text-[13px] text-ink3">
          Скачать .pptx
        </button>
      </footer>
    </motion.aside>
  );
}
