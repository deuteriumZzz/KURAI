"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { inboxStore } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Label } from "@/components/fx/primitives";
import { EmptyState } from "@/components/fx/empty-state";

/** «Входящие» — центр уведомлений о долгих задачах, чтобы ничего не терялось, пока вы в другом чате. */
export function Inbox({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const items = useStore(inboxStore);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const unread = items.filter((i) => i.unread).length;

  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", off);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Входящие${unread ? `, непрочитанных: ${unread}` : ""}`}
        title="Входящие"
        className={cn(
          "relative flex h-9 w-full cursor-pointer items-center gap-2.5 px-2.5 text-[13.5px] text-ink2 hover:bg-g2 hover:text-ink pointer-coarse:h-11",
          collapsed && "justify-center px-0",
        )}
      >
        <Bell size={16} strokeWidth={1.5} />
        {!collapsed && "Входящие"}
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 1.6, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn("bg-acc px-1.5 font-mono text-[10px] leading-4 text-acc-ink", collapsed ? "absolute top-1 right-1" : "ml-auto")}
          >
            {unread}
          </motion.span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed top-16 left-4 z-50 w-[min(340px,calc(100vw-32px))] bg-g1 shadow-(--shadow-float) md:absolute md:top-0 md:left-full md:ml-2"
          >
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <Label className="text-acc">Входящие</Label>
              {unread > 0 && (
                <button type="button" onClick={() => inboxStore.set((xs) => xs.map((x) => ({ ...x, unread: false })))} className="cursor-pointer text-[12px] text-ink3 hover:text-ink">
                  Прочитать все
                </button>
              )}
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {items.length === 0 && (
                <li>
                  <EmptyState compact title="Пока тихо" hint="Здесь появятся готовые видео, отчёты и важные события." />
                </li>
              )}
              {items.map((it) => (
                <li key={it.id} className={cn("border-b border-line last:border-b-0", it.unread && "shadow-[inset_2px_0_0_var(--color-acc)]")}>
                  <Link
                    href={it.href ?? "#"}
                    onClick={() => {
                      inboxStore.set((xs) => xs.map((x) => (x.id === it.id ? { ...x, unread: false } : x)));
                      setOpen(false);
                      onNavigate?.();
                    }}
                    className="flex items-baseline gap-3 px-3 py-2.5 text-[13px] hover:bg-g2"
                  >
                    <span className={cn("flex-1", it.tone === "warn" ? "text-warn" : it.unread ? "text-ink" : "text-ink2")}>{it.title}</span>
                    <span className="shrink-0 font-mono text-[11px] text-ink3">{it.at}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
