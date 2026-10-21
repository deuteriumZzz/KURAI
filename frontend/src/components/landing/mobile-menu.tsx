"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const LINKS = [
  ["/#models", "Модели"],
  ["/pricing", "Тарифы"],
  ["/#faq", "Вопросы и ответы"],
  ["/status", "Статус"],
  ["/login", "Войти"],
] as const;

/** Меню публичных страниц на телефоне: шторка сверху, пункты лесенкой. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-label="Открыть меню" aria-expanded={open} className="grid size-11 cursor-pointer place-items-center border border-line text-ink2 rounded-(--radius-sm)">
        <Menu size={18} strokeWidth={1.5} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Меню"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-bg px-4 pt-5 pb-8"
          >
            <div className="flex justify-end">
              <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть меню" autoFocus className="grid size-11 cursor-pointer place-items-center border border-line text-ink2 rounded-(--radius-sm)">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <nav aria-label="Основное" className="mt-8 flex flex-col">
              {LINKS.map(([href, label], i) => (
                <motion.div key={href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.05, duration: 0.22 }}>
                  <Link href={href} onClick={() => setOpen(false)} className="flex items-center justify-between border-b border-line py-4 font-display text-2xl font-medium">
                    {label}
                    <span className="font-mono text-[12px] text-ink3">0{i + 1}</span>
                  </Link>
                </motion.div>
              ))}
            </nav>
            <Link href="/register" onClick={() => setOpen(false)} className="fx-chamfer fx-sheen mt-auto bg-acc py-3.5 text-center text-[15px] font-semibold text-acc-ink [--ch:var(--chamfer-lg)]">
              Создать аккаунт · 5 запросов бесплатно
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
