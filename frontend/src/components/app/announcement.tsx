"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { Label } from "@/components/fx/primitives";

const ID = "veo4-2026-09";

/** Карточка-анонс новинки на главной; закрывается навсегда (localStorage). */
export function Announcement() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- флаг из localStorage
      setShow(localStorage.getItem(`kurai:ann:${ID}`) !== "1");
    } catch {}
  }, []);
  if (!show) return null;
  return (
    <motion.aside
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.24 }}
      aria-label="Новинка"
      className="fx-hover flex w-full max-w-3xl items-center gap-4 border border-acc-line bg-g1 p-3"
    >
      <Label className="shrink-0 bg-acc px-1.5 text-acc-ink">NEW</Label>
      <p className="min-w-0 flex-1 text-[13.5px]">
        <b className="font-medium">Veo 4</b> уже в KURAI — кинематографичное видео со звуком в кадре.
      </p>
      <Link href="/app?mode=video" className="shrink-0 text-[13px] text-acc hover:underline">
        Попробовать →
      </Link>
      <button
        type="button"
        onClick={() => {
          setShow(false);
          try {
            localStorage.setItem(`kurai:ann:${ID}`, "1");
          } catch {}
        }}
        aria-label="Скрыть анонс"
        className="grid size-7 shrink-0 cursor-pointer place-items-center text-ink3 hover:text-ink"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </motion.aside>
  );
}
