"use client";

import { useEffect, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";

type Sel = { text: string; x: number; y: number };
export type SelectionAction = "ask" | "explain" | "translate" | "quote";

const ACTIONS: [SelectionAction, string][] = [
  ["ask", "Спросить про это"],
  ["explain", "Объяснить"],
  ["translate", "Перевести"],
  ["quote", "Цитировать"],
];

/** Выделил текст в ответе — появляется меню действий над фрагментом (как у Kimi). */
export function SelectionMenu({ root, onAction }: { root: RefObject<HTMLElement | null>; onAction: (a: SelectionAction, text: string) => void }) {
  const [sel, setSel] = useState<Sel | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const check = () => {
      const s = window.getSelection();
      const text = s?.toString().trim() ?? "";
      if (!s || s.rangeCount === 0 || text.length < 3 || text.length > 800) return setSel(null);
      const node = s.anchorNode instanceof Element ? s.anchorNode : s.anchorNode?.parentElement;
      if (!node || !el.contains(node) || !node.closest("article")) return setSel(null);
      const r = s.getRangeAt(0).getBoundingClientRect();
      setSel({ text, x: r.left + r.width / 2, y: r.top });
    };
    const hide = () => setSel(null);
    el.addEventListener("mouseup", check);
    el.addEventListener("keyup", check);
    el.addEventListener("scroll", hide);
    return () => {
      el.removeEventListener("mouseup", check);
      el.removeEventListener("keyup", check);
      el.removeEventListener("scroll", hide);
    };
  }, [root]);

  return (
    <AnimatePresence>
      {sel && (
        <motion.div
          role="toolbar"
          aria-label="Действия с выделенным текстом"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.14 }}
          className="fixed z-40 flex -translate-x-1/2 -translate-y-full bg-g2 shadow-(--shadow-float)"
          style={{ left: Math.max(120, Math.min(sel.x, window.innerWidth - 120)), top: sel.y - 8 }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {ACTIONS.map(([a, label]) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                onAction(a, sel.text);
                setSel(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="cursor-pointer border-r border-line px-2.5 py-1.5 text-[12px] whitespace-nowrap text-ink2 last:border-r-0 hover:bg-acc-soft hover:text-acc pointer-coarse:py-2.5"
            >
              {label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
