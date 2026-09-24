"use client";

import { lazy, Suspense, useEffect } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { tocOf } from "@/lib/quiet";
import { Label } from "@/components/fx/primitives";

const LazyMarkdown = lazy(() => import("./markdown").then((m) => ({ default: m.Markdown })));

/** Режим чтения длинного ответа: широкая колонка, крупный текст, оглавление по заголовкам. Esc — закрыть. */
export function Reader({ text, model, onClose }: { text: string; model: string | null; onClose: () => void }) {
  const toc = tocOf(text);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Режим чтения"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col bg-bg"
    >
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <Label className="text-acc">Режим чтения · {model ?? "ответ"}</Label>
        <button type="button" onClick={onClose} autoFocus aria-label="Закрыть режим чтения" className="grid size-10 cursor-pointer place-items-center text-ink2 hover:text-ink">
          <X size={18} strokeWidth={1.5} />
        </button>
      </header>
      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-10 overflow-y-auto px-4 py-10 sm:px-8">
        {toc.length > 0 && (
          <nav aria-label="Оглавление" className="sticky top-0 hidden w-48 shrink-0 self-start lg:block">
            <Label>Оглавление</Label>
            <ol className="mt-3 flex flex-col gap-2 border-l border-line pl-3 text-[13px] text-ink2">
              {toc.map((h) => (
                <li key={h.text} className={h.level === 3 ? "pl-3" : undefined}>
                  {h.text}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <article className="max-w-[68ch] flex-1 text-[18px] leading-[1.75] [&_div]:text-[18px]">
          <Suspense fallback={<p className="whitespace-pre-wrap">{text}</p>}>
            <LazyMarkdown text={text} />
          </Suspense>
        </article>
      </div>
    </motion.div>
  );
}
