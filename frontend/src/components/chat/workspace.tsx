"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "lucide-react";

/** «Живое рабочее место» агента: лента его действий как терминал. Открыто, пока агент работает. */
export function Workspace({ actions, live }: { actions: string[]; live: boolean }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const isOpen = open ?? live;
  const box = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [actions.length]);

  return (
    <div className="max-w-xl border border-line bg-bg">
      <button type="button" onClick={() => setOpen(!isOpen)} aria-expanded={isOpen} className="flex w-full cursor-pointer items-center justify-between gap-2 border-b border-line px-3 py-2 text-left">
        <span className="inline-flex items-center gap-2 font-mono text-[11.5px] text-ink2">
          <Terminal size={13} strokeWidth={1.5} className={live ? "text-acc" : undefined} />
          рабочее место агента · {actions.length} действий
        </span>
        <span className="font-mono text-[11px] text-ink3">{isOpen ? "▾" : "▸"}</span>
      </button>
      {isOpen && (
        <ol ref={box} aria-live="polite" className="max-h-44 overflow-y-auto p-3 font-mono text-[11.5px] leading-relaxed text-ink3">
          {actions.map((a, i) => (
            <li key={i} className={i === actions.length - 1 && live ? "text-ink" : undefined}>
              <span className="text-acc">$</span> {a}
            </li>
          ))}
          {live && <li className="fx-caret text-acc">▍</li>}
        </ol>
      )}
    </div>
  );
}
