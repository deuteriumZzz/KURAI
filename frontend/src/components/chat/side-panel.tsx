"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Artifact } from "@/lib/stream";
import { Label } from "@/components/fx/primitives";

/** Боковая панель результата: слайды (дальше — документы, код, превью сайта). */
export function SidePanel({ artifact, onClose }: { artifact: Artifact; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside aria-label={`Слайды: ${artifact.title}`} className="fixed inset-y-0 right-0 z-30 flex w-full flex-col border-l border-line bg-g1 sm:w-[min(560px,48vw)] lg:static lg:z-auto">
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
            <li key={`${s.title}-${i}`} className="relative flex aspect-video flex-col justify-between border border-line bg-bg p-5">
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
            </li>
          ))}
        </ol>
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-line p-3">
        <Label>.pptx появится после подключения бэкенда</Label>
        <button type="button" disabled className="border border-line2 px-3 py-1.5 text-[13px] text-ink3">
          Скачать .pptx
        </button>
      </footer>
    </aside>
  );
}
