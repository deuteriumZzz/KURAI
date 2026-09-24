"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PREFS, readPrefs, type Prefs } from "./prefs";

/** Настройки из localStorage с подпиской на изменения (событие kurai:prefs). */
export function usePrefs(): Prefs {
  const [p, setP] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage доступен только в браузере
    setP(readPrefs());
    const on = (e: Event) => setP((e as CustomEvent<Prefs>).detail);
    window.addEventListener("kurai:prefs", on);
    return () => window.removeEventListener("kurai:prefs", on);
  }, []);
  return p;
}
