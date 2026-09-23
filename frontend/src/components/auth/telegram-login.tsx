"use client";

import { useState } from "react";
import { Scanline } from "@/components/fx/primitives";
import { Button } from "@/components/ui/button";

/** Детерминированный узор QR-заглушки (настоящий код выдаст бэкенд через Telegram Login). */
function qrCells(): boolean[] {
  const finder = (x: number, y: number) => {
    for (const [ox, oy] of [[0, 0], [14, 0], [0, 14]] as const) {
      const dx = x - ox;
      const dy = y - oy;
      if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
    }
    return null;
  };
  return Array.from({ length: 441 }, (_, i) => {
    const x = i % 21;
    const y = Math.floor(i / 21);
    return finder(x, y) ?? (x * 7 + y * 13 + x * y) % 5 < 2;
  });
}
const CELLS = qrCells();

export function TelegramLogin() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Button className="w-full" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Войти через Telegram
      </Button>
      {open && (
        <div className="flex flex-col items-center gap-3 border border-line bg-g1 p-4">
          <div className="fx-brackets relative overflow-hidden p-2" data-selected="true">
            <div role="img" aria-label="QR-код для входа через Telegram" className="grid size-40 grid-cols-[repeat(21,1fr)] bg-ink p-2">
              {CELLS.map((on, i) => (
                <i key={i} className={on ? "bg-bg" : undefined} />
              ))}
            </div>
            <Scanline active />
          </div>
          <p className="text-center text-[13px] text-ink2">Откройте Telegram на телефоне и отсканируйте код — вход подтвердится сам.</p>
        </div>
      )}
    </div>
  );
}
