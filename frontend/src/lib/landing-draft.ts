import type { Mode } from "@/types/api";

const KEY = "kurai:landing-draft";

/** Черновик с лендинга переживает регистрацию или вход и открывается в поле ввода кабинета. */
export function saveLandingDraft(mode: Mode, prompt: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ mode, prompt: prompt.slice(0, 2000) }));
  } catch {}
}

/** Куда вести после входа: в кабинет с черновиком, если он был, иначе на главную кабинета. Черновик берётся один раз. */
export function afterAuthHref(): string {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const draft = raw ? (JSON.parse(raw) as { mode?: string; prompt?: string }) : null;
    if (draft?.prompt?.trim()) return `/app?mode=${encodeURIComponent(draft.mode ?? "text")}&prompt=${encodeURIComponent(draft.prompt)}`;
  } catch {}
  return "/app";
}
