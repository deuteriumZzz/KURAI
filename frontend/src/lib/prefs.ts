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
  theme: "dark" | "light" | "system";
  /** Звук только на реальное завершение или ошибку; по умолчанию выключен. */
  sound: boolean;
  /** Акцент кабинета: пастельный лайм (по умолчанию), жёлтый Night City или циан. */
  accent: "lime" | "yellow" | "cyan";
  /** 90 — плотность списков и ленты. */
  density: "comfortable" | "compact";
  /** 111 — мягкий лимит расходов на месяц в кредитах; 0 — без лимита. Хранится только в этом браузере. */
  spendLimit: number;
  /** 83 — точные размер текста (px) и ширина колонки (rem) с ползунков; 0 — по пресетам выше. */
  readSizePx: number;
  readWidthRem: number;
};

const KEY = "kurai:prefs";
export const DEFAULT_PREFS: Prefs = { calm: false, hints: true, web: true, model: "auto", onboarded: false, readSize: "m", readWidth: "narrow", favorites: [], recent: [], notifyBrowser: false, steps: [], checklistHidden: false, softContrast: false, quiet: false, undoSend: false, templates: [], theme: "system", sound: false, accent: "lime", density: "comfortable", spendLimit: 0, readSizePx: 0, readWidthRem: 0 };

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
  const theme = resolveTheme(p.theme);
  const html = document.documentElement;
  // при круговой заливке (revealFrom) переход делает View Transition — без второго плавного перетекания
  if (html.dataset.theme !== theme && !html.classList.contains("k-reveal")) {
    // смена темы: материал и чернила перетекают на месте, без вспышки и повторных входов
    html.classList.add("k-theme-shift");
    window.setTimeout(() => html.classList.remove("k-theme-shift"), 260);
  }
  html.dataset.theme = theme;
  if (p.accent === "lime") delete html.dataset.accent;
  else html.dataset.accent = p.accent;
  if (p.density === "compact") html.dataset.density = "compact";
  else delete html.dataset.density;
  // панель браузера на телефоне — цвета материала, без белой полосы над графитом
  const bar = theme === "light" ? "#f1f0ec" : "#151515";
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (metas.length) metas.forEach((m) => (m.content = bar));
  else document.head.append(Object.assign(document.createElement("meta"), { name: "theme-color", content: bar }));
  const root = document.documentElement.style;
  root.setProperty("--read-size", p.readSizePx ? `${p.readSizePx}px` : { s: "14px", m: "15px", l: "17px" }[p.readSize]);
  root.setProperty("--read-width", p.readWidthRem ? `${p.readWidthRem}rem` : p.readWidth === "wide" ? "56rem" : "42rem");
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

/** «Как в системе» → светлая или тёмная по настройке ОС. */
export function resolveTheme(t: Prefs["theme"]): "dark" | "light" {
  if (t !== "system") return t;
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
