/** Лёгкая вибрация на телефоне для важных событий (готово / ошибка). На десктопе и без поддержки — ничего. */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  if (document.documentElement.classList.contains("calm")) return;
  navigator.vibrate(pattern);
}
