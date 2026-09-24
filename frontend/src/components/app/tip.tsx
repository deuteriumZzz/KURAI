"use client";

import { useEffect, useState } from "react";
import { Decode } from "@/components/fx/decode";

const TIPS = [
  "совет: /v переключает поле ввода в видео",
  "совет: выделите текст в ответе — появится меню",
  "совет: зажмите Alt — покажем клавиши на кнопках",
  "совет: ✦ улучшит промпт под выбранный режим",
  "совет: ? — шпаргалка горячих клавиш",
];

/** «Совет дня» в строке статуса: сменяется раз в 12 с, с расшифровкой. */
export function Tip() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % TIPS.length), 12_000);
    return () => clearInterval(t);
  }, []);
  return <Decode key={i} text={TIPS[i] ?? ""} duration={400} className="text-ink3" />;
}
