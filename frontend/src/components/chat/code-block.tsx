"use client";

import { isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { isCalm } from "@/lib/motion";

/** Текст узла react-markdown: <pre> получает один <code> со строкой внутри. */
function plain(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plain).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return plain(node.props.children);
  return "";
}

/**
 * Блок кода: язык, номера строк и «Копировать».
 * 27 — при первом появлении на экране раскрывается построчно; кнопка копирования — когда блок раскрыт.
 */
export function CodeBlock({ children, lang }: { children: ReactNode; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(false);
  const pre = useRef<HTMLPreElement>(null);
  const code = plain(children).replace(/\n$/, "");
  const lines = code.split("\n").length;

  useEffect(() => {
    const el = pre.current;
    if (!el) return;
    if (isCalm() || typeof IntersectionObserver === "undefined" || !("animate" in el)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const steps = Math.min(lines, 40);
      el.animate([{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: Math.min(900, steps * 32), easing: `steps(${steps}, end)` })
        .finished.catch(() => undefined)
        .finally(() => setShown(true));
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [lines]);

  return (
    <div className="my-3 overflow-hidden rounded-(--radius-md) border border-line bg-g1">
      <div className="flex h-8 items-center justify-between border-b border-line px-3">
        <span className="font-mono text-[11px] tracking-[0.08em] text-ink3 uppercase">{lang ?? "код"}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-ink3 transition-opacity duration-(--dur-base) hover:text-ink pointer-coarse:py-2"
          style={{ opacity: shown ? 1 : 0 }}
          tabIndex={shown ? 0 : -1}
        >
          {copied ? <Check size={12} strokeWidth={1.5} /> : <Copy size={12} strokeWidth={1.5} />}
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
      <div className="flex overflow-x-auto">
        <span aria-hidden="true" className="shrink-0 border-r border-line py-3 pr-2.5 pl-3 text-right font-mono text-[12px] leading-relaxed text-ink3 select-none">
          {Array.from({ length: lines }, (_, i) => (
            <span key={i} className="block">{i + 1}</span>
          ))}
        </span>
        <pre ref={pre} className="min-w-0 flex-1 p-3 font-mono text-[13px] leading-relaxed">{children}</pre>
      </div>
    </div>
  );
}
