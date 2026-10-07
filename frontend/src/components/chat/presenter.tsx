"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Markdown } from "./markdown";
import { SPRING } from "@/lib/motion";
import { useCalm } from "@/lib/use-calm";
import { useFocusTrap } from "@/lib/use-focus-trap";

export type Slide = { title: string; text: string };

/** Разделы ответа — слайды: каждый заголовок открывает новый, текст до первого заголовка — вступление. */
export function slidesOf(title: string, answers: string[]): Slide[] {
  const slides: Slide[] = [{ title, text: "" }];
  for (const answer of answers) {
    let current: Slide | null = null;
    for (const line of answer.split("\n")) {
      const h = /^#{1,3}\s+(.+?)\s*#*$/.exec(line);
      if (h?.[1]) {
        current = { title: h[1].replace(/[*_`]/g, ""), text: "" };
        slides.push(current);
      } else if (current) current.text += `${line}\n`;
      else if (line.trim()) {
        current = { title: "", text: `${line}\n` };
        slides.push(current);
      }
    }
  }
  return slides.filter((s, i) => i === 0 || s.text.trim() || s.title);
}

/** 93 — режим презентации: документ на весь экран крупным шрифтом, стрелки листают, Esc возвращает в чат. */
export function Presenter({ slides, onClose }: { slides: Slide[]; onClose: () => void }) {
  const [at, setAt] = useState({ i: 0, dir: 1 });
  const calm = useCalm();
  const root = useRef<HTMLDivElement>(null);
  useFocusTrap(true, root);
  const slide = slides[at.i];

  useEffect(() => {
    const go = (d: number) => setAt((cur) => ({ i: Math.max(0, Math.min(slides.length - 1, cur.i + d)), dir: d }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length, onClose]);

  return (
    <motion.div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label="Режим презентации"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-(--z-overlay) flex flex-col bg-bg"
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-6">
        <span className="k-meta tabular-nums">
          {String(at.i + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
        <button type="button" onClick={onClose} aria-label="Выйти из презентации (Esc)" className="k-act size-9">
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.section
            key={at.i}
            initial={calm ? { opacity: 0 } : { opacity: 0, x: at.dir * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={calm ? { opacity: 0 } : { opacity: 0, x: at.dir * -80 }}
            transition={SPRING.gentle}
            className="absolute inset-0 overflow-y-auto px-6 py-8 md:px-16"
          >
            <div className="mx-auto max-w-4xl">
              {at.i === 0 ? (
                <h1 className="mt-[18vh] text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.05] font-light tracking-[-0.03em] text-balance text-ink">{slide?.title}</h1>
              ) : (
                <>
                  {slide?.title && <h2 className="mb-8 text-[clamp(1.8rem,3.4vw,2.8rem)] leading-tight font-light tracking-[-0.02em] text-ink">{slide.title}</h2>}
                  <div className="[--read-size:21px]">
                    <Markdown text={slide?.text ?? ""} />
                  </div>
                </>
              )}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>
      <div className="flex h-16 shrink-0 items-center justify-center gap-3">
        <button type="button" onClick={() => setAt((c) => ({ i: Math.max(0, c.i - 1), dir: -1 }))} disabled={at.i === 0} aria-label="Предыдущий слайд" className="k-act size-10 disabled:opacity-30">
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>
        <span aria-hidden="true" className="flex gap-1">
          {slides.map((_, i) => (
            <i key={i} className={i === at.i ? "h-1 w-5 rounded-full bg-acc" : "h-1 w-1.5 rounded-full bg-line2"} />
          ))}
        </span>
        <button type="button" onClick={() => setAt((c) => ({ i: Math.min(slides.length - 1, c.i + 1), dir: 1 }))} disabled={at.i === slides.length - 1} aria-label="Следующий слайд" className="k-act size-10 disabled:opacity-30">
          <ChevronRight size={18} strokeWidth={1.5} />
        </button>
      </div>
    </motion.div>
  );
}
