"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Повторная отправка письма с обратным отсчётом (защита от спама кнопкой). */
export function ResendButton({ seconds = 60 }: { seconds?: number }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  return (
    <Button className="w-full" disabled={left > 0} onClick={() => setLeft(seconds)}>
      {left > 0 ? `Отправить ещё раз через ${left} с` : "Отправить письмо ещё раз"}
    </Button>
  );
}
