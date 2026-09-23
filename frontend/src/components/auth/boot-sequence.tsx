"use client";

import { useEffect, useRef, useState } from "react";
import { Decode } from "@/components/fx/decode";
import { isCalm } from "@/lib/motion";
import { formatCredits } from "@/lib/format";
import { MOCK_BALANCE, MOCK_STATUS, MOCK_USER } from "@/mocks/data";

const LINES = [
  "› Проверка сессии ............... OK",
  `› Профиль: ${MOCK_USER.name} · PRO ......... OK`,
  `› Баланс: ${formatCredits(MOCK_BALANCE.micro)} ............... OK`,
  `› Каталог моделей: ${MOCK_STATUS.modelsOnline} ........... OK`,
  "› Соединение установлено",
];

/**
 * «Вход в систему» после логина. Строки идут, пока реально грузятся профиль, баланс и модели,
 * поэтому не добавляет ожидания. Пропуск — клик или любая клавиша; в спокойном режиме — сразу дальше.
 */
export function BootSequence({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (done.current) return;
      done.current = true;
      onDone();
    };
    if (isCalm()) {
      finish();
      return;
    }
    const timers = LINES.map((_, i) => setTimeout(() => setShown(i + 1), 60 + i * 290));
    timers.push(setTimeout(finish, 60 + LINES.length * 290 + 350));
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", skip);
    };
  }, [onDone]);

  return (
    <div
      role="status"
      aria-label="Вход в систему"
      onClick={() => {
        if (!done.current) {
          done.current = true;
          onDone();
        }
      }}
      className="fixed inset-0 z-50 flex cursor-pointer flex-col justify-center gap-2 bg-bg px-[clamp(20px,8vw,120px)] font-mono text-[13px] text-ink2"
    >
      <p className="mb-3 text-[12px] tracking-[0.2em] text-acc">KURAI // ВХОД В СИСТЕМУ</p>
      {LINES.slice(0, shown).map((l, i) => (
        <Decode key={l} text={l} duration={220} className={i === LINES.length - 1 ? "text-acc" : undefined} />
      ))}
      <span className="absolute right-6 bottom-5 text-[11px] tracking-[0.1em] text-ink3">КЛИК — ПРОПУСТИТЬ</span>
    </div>
  );
}
