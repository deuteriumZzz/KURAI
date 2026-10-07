"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";

export type MapItem = {
  id: string;
  kind: "user" | "answer" | "sources";
  label: string;
  /** Идущая задача (видео, изображение): метка у края экрана, пока она за его пределами (К16). */
  live?: string;
};

type Mark = MapItem & { top: number; bottom: number };
const elOf = (id: string) => document.getElementById(`msg-${id}`) ?? document.querySelector<HTMLElement>(`[data-msg="${id}"]`);

/**
 * 50 — мини-карта длинного чата: отметка на каждое сообщение и окно видимой части.
 * Тянуть или кликать — листать, наведение — начало сообщения. К16 — идущие задачи за краем экрана.
 */
export function Minimap({ scroller, items, tick, onJump }: { scroller: RefObject<HTMLDivElement | null>; items: MapItem[]; tick: number; onJump: (id: string) => void }) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [view, setView] = useState({ top: 0, size: 1 });
  const [hover, setHover] = useState<Mark | null>(null);
  const latest = useRef(items);
  useEffect(() => {
    latest.current = items;
  });
  const sig = items.map((i) => `${i.id}:${i.kind}:${i.live ?? ""}`).join("|");

  // позиции пересчитываются при новых сообщениях, росте ответа и смене размера ленты
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => {
      const h = el.scrollHeight || 1;
      setMarks(
        latest.current.flatMap((item) => {
          const node = elOf(item.id);
          return node ? [{ ...item, top: node.offsetTop / h, bottom: (node.offsetTop + node.offsetHeight) / h }] : [];
        }),
      );
      setView({ top: el.scrollTop / h, size: el.clientHeight / h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    const onScroll = () => setView({ top: el.scrollTop / (el.scrollHeight || 1), size: el.clientHeight / (el.scrollHeight || 1) });
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, [scroller, sig, tick]);

  function scrollToRatio(ratio: number) {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: ratio * el.scrollHeight - el.clientHeight / 2 });
  }

  // по одной метке на сторону — ближайшая к видимой части; несколько в одной точке перекрыли бы друг друга
  const above = marks.filter((m) => m.live && m.bottom < view.top).slice(-1);
  const below = marks.filter((m) => m.live && m.top > view.top + view.size).slice(0, 1);

  return (
    <>
      <div
        role="scrollbar"
        aria-label="Карта задачи"
        aria-controls="chat-feed"
        aria-valuenow={Math.round(view.top * 100)}
        aria-orientation="vertical"
        tabIndex={-1}
        className="k-minimap absolute top-16 right-3 bottom-40 z-10 hidden w-3 cursor-pointer touch-none md:block"
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.setPointerCapture(e.pointerId);
          scrollToRatio((e.clientY - r.top) / r.height);
        }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientY - r.top) / r.height;
          if (e.buttons === 1) scrollToRatio(ratio);
          setHover(marks.find((m) => ratio >= m.top - 0.01 && ratio <= m.bottom + 0.01) ?? null);
        }}
        onPointerLeave={() => setHover(null)}
      >
        <span aria-hidden="true" className="absolute inset-x-0 rounded-full bg-s2" style={{ top: `${view.top * 100}%`, height: `${Math.max(view.size, 0.03) * 100}%` }} />
        {marks.map((m) => (
          <i
            key={m.id}
            aria-hidden="true"
            className={cn("absolute right-0.5 h-[3px] rounded-full", m.kind === "user" ? "w-1.5 bg-ink3" : m.kind === "sources" ? "w-2 bg-violet" : "w-2 bg-ink2", m.live && "bg-acc")}
            style={{ top: `${m.top * 100}%` }}
          />
        ))}
        {hover && (
          <span className="pointer-events-none absolute right-5 w-56 -translate-y-1/2 rounded-(--radius-sm) border border-line2 bg-g1 px-2.5 py-1.5 text-[12px] leading-snug text-ink2 shadow-(--shadow-float)" style={{ top: `${hover.top * 100}%` }}>
            <span className="k-index mb-0.5 block">{hover.kind === "user" ? "Вопрос" : hover.kind === "sources" ? "Ответ с источниками" : "Ответ"}</span>
            <span className="line-clamp-2">{hover.label}</span>
          </span>
        )}
      </div>
      {[...above.map((m) => ({ m, dir: "up" as const })), ...below.map((m) => ({ m, dir: "down" as const }))].map(({ m, dir }) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onJump(m.id)}
          className={cn(
            "absolute right-8 z-10 inline-flex h-8 items-center gap-1.5 rounded-full border border-acc-line bg-g1 px-3 font-mono text-[11.5px] text-ink shadow-(--shadow-float)",
            dir === "up" ? "top-16" : "bottom-40",
          )}
        >
          {dir === "up" ? <ArrowUp size={13} strokeWidth={1.5} className="text-acc" /> : <ArrowDown size={13} strokeWidth={1.5} className="text-acc" />}
          {m.live}
        </button>
      ))}
    </>
  );
}
