"use client";

import { useEffect, useRef, useState } from "react";
import { plural } from "@/lib/format";
import { X } from "lucide-react";
import { motion } from "motion/react";
import type { Artifact } from "@/lib/stream";
import { Label } from "@/components/fx/primitives";
import { useCalm } from "@/lib/use-calm";

/** Боковая панель результата: слайды (дальше — документы, код, превью сайта). */
export function SidePanel({ artifact, onClose }: { artifact: Artifact; onClose: () => void }) {
  const calm = useCalm();
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
      initial={calm ? { opacity: 0 } : { transform: "translateX(40px)", opacity: 0 }}
      animate={{ transform: "translateX(0)", opacity: 1 }}
      exit={calm ? { opacity: 0, transition: { duration: 0.15 } } : { transform: "translateX(20px)", opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
      aria-label={`Слайды: ${artifact.title}`}
      className="kurai-artifact-workspace fixed inset-y-0 right-0 z-30 flex w-full flex-col border-l border-line bg-g1 sm:w-[min(560px,48vw)] lg:relative lg:z-auto lg:w-(--panel-w)"
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
      <header className="kurai-artifact-workspace__header flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="min-w-0">
          <p className="truncate text-[14px]">{artifact.title}</p>
          <Label>{plural(artifact.slides.length, ["слайд", "слайда", "слайдов"])} · создано из ответа в этой задаче</Label>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Закрыть панель" className="k-act size-9">
          <X size={16} strokeWidth={1.5} />
        </button>
      </header>
      {/* 79 — слайды листаются с примагничиванием: останавливаются ровно по карточке */}
      <div className="kurai-artifact-workspace__body flex-1 snap-y snap-mandatory overflow-y-auto scroll-p-4 p-4">
        <ol className="flex flex-col gap-3">
          {artifact.slides.map((s, i) => (
            <motion.li
              initial={calm ? { opacity: 0 } : { opacity: 0, transform: "translateY(12px)" }}
              animate={{ opacity: 1, transform: "translateY(0)" }}
              transition={{ delay: 0.12 + i * 0.05, duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
              key={`${s.title}-${i}`}
              className="kurai-artifact-slide k-snap-card relative flex aspect-video snap-start flex-col justify-between rounded-(--radius-md) border border-line bg-bg p-5"
            >
              <span className="k-index">{String(i + 1).padStart(2, "0")} / {String(artifact.slides.length).padStart(2, "0")}</span>
              <div>
                <p className="k-display text-[28px] text-ink">{s.title}</p>
                <ul className="mt-3 flex flex-col gap-1 text-[13px] text-ink2">
                  {s.bullets.map((b) => (
                    <li key={b} className="before:mr-2 before:text-ink3 before:content-['–']">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
      <footer className="kurai-artifact-workspace__footer flex flex-wrap items-center justify-between gap-3 border-t border-line p-3">
        <button
          type="button"
          onClick={() => {
            // handoff: артефакт возвращается в работу как продолжение, без потери контекста задачи
            window.dispatchEvent(new CustomEvent("kurai:prefill", { detail: `Про презентацию «${artifact.title}»: ` }));
            onClose();
          }}
          className="k-tool border border-line text-ink"
        >
          Доработать в чате
        </button>
        <span className="flex items-center gap-3">
          <Label>Экспорт .pptx — при подключённом API</Label>
          <button type="button" disabled className="k-tool border border-line" aria-disabled="true">
            Скачать .pptx
          </button>
        </span>
      </footer>
    </motion.aside>
  );
}
