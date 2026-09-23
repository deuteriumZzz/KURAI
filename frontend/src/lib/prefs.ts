/** Пользовательские настройки интерфейса в localStorage (только удобства; серверные настройки — в API). */
export type Prefs = { calm: boolean; hints: boolean; web: boolean; model: string; onboarded: boolean; useCase?: string };

const KEY = "kurai:prefs";
export const DEFAULT_PREFS: Prefs = { calm: false, hints: true, web: true, model: "auto", onboarded: false };

export function readPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...readPrefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  applyPrefs(next);
  return next;
}

/** Применяет интерфейсные настройки к документу: спокойный режим и подсказки клавиш. */
export function applyPrefs(p: Prefs): void {
  document.documentElement.classList.toggle("calm", p.calm);
  document.documentElement.classList.toggle("nohints", !p.hints);
}
