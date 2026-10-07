"use client";

import { useEffect, useRef, useState } from "react";
import { isCalm } from "@/lib/motion";

/** Действия агента: фактическая лента инструментов и источников. Открыта, пока агент работает. */
export function Workspace({ actions, live }: { actions: string[]; live: boolean }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const isOpen = open ?? live;
  const box = useRef<HTMLOListElement>(null);
  // 30 — лента сама держит текущий шаг на виду, мягко докручивая к нему
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: isCalm() ? "auto" : "smooth" });
  }, [actions.length]);

  return (
    <div className="max-w-xl rounded-(--radius-md) border border-line">
      <button type="button" onClick={() => setOpen(!isOpen)} aria-expanded={isOpen} className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-left text-[13.5px] text-ink">
        <span className="flex items-center gap-2">
          {live && <i aria-hidden="true" className="k-live size-1.5 bg-acc" />}
          Действия агента <span className="k-meta">{actions.length}</span>
        </span>
        <span className="k-meta">{isOpen ? "свернуть" : "показать"}</span>
      </button>
      {isOpen && (
        <ol ref={box} aria-live="polite" className="max-h-44 overflow-y-auto border-t border-line px-4 py-2 font-mono text-[11.5px] leading-relaxed text-ink3">
          {actions.map((a, i) => (
            <li key={i} className={i === actions.length - 1 && live ? "text-ink" : undefined}>
              <span className="mr-2 text-ink3">{String(i + 1).padStart(2, "0")}</span>
              {a}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
