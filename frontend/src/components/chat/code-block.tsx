"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

/** Блок кода: язык в шапке и кнопка «Копировать». Подсветку синтаксиса подключим при появлении кода в ответах. */
export function CodeBlock({ children, lang }: { children: ReactNode; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-3 border border-line bg-g1">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">{lang ?? "код"}</span>
        <button
          type="button"
          onClick={async (e) => {
            const code = (e.currentTarget.closest("div.my-3")?.querySelector("pre")?.textContent ?? "").trim();
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-ink3 hover:text-ink pointer-coarse:py-2"
        >
          {copied ? <Check size={12} strokeWidth={1.5} /> : <Copy size={12} strokeWidth={1.5} />}
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-relaxed">{children}</pre>
    </div>
  );
}
