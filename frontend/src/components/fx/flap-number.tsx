"use client";

import { AnimatePresence, motion } from "motion/react";

/** Табло: каждая цифра при смене значения перелистывается сверху вниз. Нецифровые символы стоят на месте. */
export function FlapNumber({ value, className }: { value: string; className?: string }) {
  return (
    <span className={className} aria-label={value}>
      {value.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} aria-hidden="true" className="relative inline-block overflow-hidden align-bottom">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={ch}
                initial={{ y: "-100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1], delay: i * 0.02 }}
                className="inline-block"
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        ) : (
          <span key={i} aria-hidden="true">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
