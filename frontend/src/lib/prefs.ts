/** Пользовательские настройки интерфейса в localStorage (только удобства; серверные настройки — в API). */
export type ReadSize = "s" | "m" | "l";
export type ReadWidth = "narrow" | "wide";
export type Prefs = {
  calm: boolean;
  hints: boolean;
  web: boolean;
  model: string;
  onboarded: boolean;
  useCase?: string;
  readSize: ReadSize;
  readWidth: ReadWidth;
  favorites: string[];
  recent: string[];
  notifyBrowser: boolean;
  /** Пройденные шаги знакомства. */
  steps: string[];
  checklistHidden: boolean;
  softContrast: boolean;
  quiet: boolean;
  undoSend: boolean;
  templates: string[];
};

const KEY = "kurai:prefs";
export const DEFAULT_PREFS: Prefs = { calm: false, hints: true, web: true, model: "auto", onboarded: false, readSize: "m", readWidth: "narrow", favorites: [], recent: [], notifyBrowser: false, steps: [], checklistHidden: false, softContrast: false, quiet: false, undoSend: false, templates: [] };

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
  window.dispatchEvent(new CustomEvent("kurai:prefs", { detail: next }));
  return next;
}

/** Применяет интерфейсные настройки к документу: спокойный режим и подсказки клавиш. */
export function applyPrefs(p: Prefs): void {
  document.documentElement.classList.toggle("calm", p.calm);
  document.documentElement.classList.toggle("nohints", !p.hints);
  document.documentElement.classList.toggle("soft", p.softContrast);
  const root = document.documentElement.style;
  root.setProperty("--read-size", { s: "14px", m: "15px", l: "17px" }[p.readSize]);
  root.setProperty("--read-width", p.readWidth === "wide" ? "60rem" : "48rem");
}

/** Недавние модели: новая — первой, без повторов, не больше 3. */
export function pushRecent(recent: string[], id: string): string[] {
  return [id, ...recent.filter((x) => x !== id)].slice(0, 3);
}

export function toggleFavorite(favs: string[], id: string): string[] {
  return favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
}

/** Отметить шаг знакомства пройденным (идемпотентно). */
export function markStep(id: string): void {
  const p = readPrefs();
  if (!p.steps.includes(id)) writePrefs({ steps: [...p.steps, id] });
}
