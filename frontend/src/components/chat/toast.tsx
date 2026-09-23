"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Decode } from "@/components/fx/decode";

/** «Входящее» — уведомление о готовой долгой задаче. Исчезает само через 8 с. */
export function IncomingToast({ title, onOpen, onClose }: { title: string; onOpen: () => void; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
      transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
      role="status"
      className="fx-flicker-border fixed right-4 bottom-4 z-30 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2 border border-acc-line bg-g2 p-3">
      <Decode text="● ВХОДЯЩЕЕ" className="font-mono text-[11px] tracking-[0.14em] text-acc" />
      <p className="text-[13.5px]">{title}</p>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={onOpen}>
          Открыть
        </Button>
        <Button size="sm" onClick={onClose}>
          Позже
        </Button>
      </div>
    </motion.div>
  );
}
