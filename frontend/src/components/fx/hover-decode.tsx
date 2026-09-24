"use client";

import { useState } from "react";
import { Decode } from "./decode";

/** Текст расшифровывается заново при наведении на родителя-ссылку (логотип). */
export function HoverDecode({ text, className }: { text: string; className?: string }) {
  const [k, setK] = useState(0);
  return (
    <span onMouseEnter={() => setK((v) => v + 1)} className={className}>
      <Decode key={k} text={text} duration={k === 0 ? 0 : 300} />
    </span>
  );
}
