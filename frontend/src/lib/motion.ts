/** Motion-токены для JS (Motion / GSAP). CSS-источник — globals.css. */
export const MOTION = {
  instant: 120,
  fast: 150,
  base: 220,
  slow: 400,
  decode: 260,
  ease: {
    out: [0.2, 0.8, 0.2, 1],
    inOut: [0.65, 0, 0.35, 1],
  },
} as const;

/** Эффекты выключены: системное «уменьшить движение» или «Спокойный режим» (класс .calm на <html>). */
export function isCalm(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("calm")
  );
}

/** Перезапускает CSS-анимацию класса на элементе (мерцание, глитч). */
export function retrigger(el: Element | null, className: string): void {
  if (!el) return;
  el.classList.remove(className);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(className);
}
