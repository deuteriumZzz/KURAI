"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { scramble, tail } from "@/lib/decode";
import { isCalm, MOTION } from "@/lib/motion";
import { cn } from "@/lib/cn";

/** Проигрывает расшифровку `text` за `duration` мс; при смене текста — заново. */
export function useDecode(text: string, duration: number = MOTION.decode): string {
  // кадр анимации привязан к исходному тексту; чужой кадр (или спокойный режим) — показываем чистый текст
  const [frame, setFrame] = useState({ src: text, out: text });

  useEffect(() => {
    // нулевая длительность — без анимации (иначе 0/0 даёт NaN и пустую строку)
    if (isCalm() || duration <= 0) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      setFrame({ src: text, out: scramble(text, text.length * k) });
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration]);

  return frame.src === text ? frame.out : text;
}

type DecodeProps = {
  text: string;
  duration?: number;
  as?: ElementType;
  className?: string;
};

/** Текст, который «расшифровывается». Скринридер получает только чистый текст. */
export function Decode({ text, duration, as: Tag = "span", className }: DecodeProps) {
  const shown = useDecode(text, duration);
  return (
    <Tag className={className}>
      <span aria-hidden="true">{shown}</span>
      <span className="fx-sr">{text}</span>
    </Tag>
  );
}

type StreamTextProps = {
  /** Уже полученный текст (растёт по мере стриминга). */
  text: string;
  /** Поток завершён — хвост шифра исчезает. */
  done: boolean;
  tailLength?: number;
  className?: string;
};

/** Стриминг с расшифровкой на переднем крае. Готовый текст неподвижен. */
export function StreamText({ text, done, tailLength = 8, className }: StreamTextProps) {
  const [glyphs, setGlyphs] = useState("");
  // 21 — граница «устоявшегося» текста: всё, что пришло после неё, проявляется из прозрачности
  const [settled, setSettled] = useState(0);

  useEffect(() => {
    if (done || isCalm()) return;
    const id = setInterval(() => setGlyphs(tail(tailLength)), 50);
    return () => clearInterval(id);
  }, [done, tailLength]);

  const latest = useRef(text.length);
  useEffect(() => {
    latest.current = text.length;
  });
  // шаг 160 мс, а не «после паузы»: при сплошном потоке каждая новая порция всё равно проявляется
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setSettled(latest.current), 160);
    return () => clearInterval(id);
  }, [done]);

  const cut = Math.min(settled, text.length);
  return (
    <span className={cn("whitespace-pre-wrap", className)} aria-busy={!done}>
      {text.slice(0, cut)}
      <span key={cut} className="k-fresh">
        {text.slice(cut)}
      </span>
      {!done && (
        <span aria-hidden="true" className="text-acc opacity-75">
          {glyphs}
          <span className="fx-caret">▍</span>
        </span>
      )}
    </span>
  );
}
