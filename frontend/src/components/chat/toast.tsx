"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { useCalm } from "@/lib/use-calm";

/** Уведомление о готовой долгой задаче: одно появление, тихое присутствие, явное закрытие. Исчезает через 8 с. */
export function IncomingToast({ title, onOpen, onClose }: { title: string; onOpen: () => void; onClose: () => void }) {
  const calm = useCalm();
  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={calm ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" }}
      animate={{ opacity: 1, transform: "translateY(0)" }}
      exit={{ opacity: 0, transition: { duration: 0.14 } }}
      transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      role="status"
      data-toast
      className="fixed right-4 bottom-4 z-(--z-toast) flex w-[min(360px,calc(100vw-32px))] items-start gap-3 rounded-(--radius-md) border border-line2 bg-g1 p-3.5 shadow-(--shadow-float)"
    >
      <i aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 bg-acc" />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug text-ink">{title}</p>
        <button type="button" onClick={onOpen} className="mt-2 cursor-pointer text-[13px] text-ink2 underline decoration-line2 underline-offset-4 hover:text-ink">
          Открыть
        </button>
      </div>
      <button type="button" onClick={onClose} aria-label="Закрыть уведомление" className="k-act -mt-1 -mr-1 size-7">
        <X size={14} strokeWidth={1.5} />
      </button>
    </motion.div>
  );
}
