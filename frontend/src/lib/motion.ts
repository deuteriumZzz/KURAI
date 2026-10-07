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
  // без matchMedia (тесты, старые встраиваемые браузеры) — без анимаций
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("calm")
  );
}

/** Пружины motion/react: один набор на весь кабинет, без чисел в компонентах. */
export const SPRING = {
  /** подложки, метки, чипы — быстро и без перебора */
  snappy: { type: "spring", stiffness: 520, damping: 42, mass: 0.6 },
  /** панели, листы, карточки */
  gentle: { type: "spring", stiffness: 260, damping: 30 },
  /** отпускание после жеста пальцем */
  release: { type: "spring", stiffness: 300, damping: 28, restDelta: 0.001 },
  /** отскок: звезда избранного, счётчик */
  bouncy: { type: "spring", stiffness: 600, damping: 14 },
} as const;

/**
 * Копия элемента перелетает к цели (сумма → баланс, уведомление → «Входящие», модель → счётчик) и гаснет.
 * Чисто визуальный след: состояние меняет вызывающий код; в спокойном режиме — ничего не летит.
 */
export async function flyTo(
  from: Element,
  to: Element,
  { html, arc = 0, endScale = 0.6, fade = true, ms = 520 }: { html?: string; arc?: number; endScale?: number; fade?: boolean; ms?: number } = {},
): Promise<void> {
  if (isCalm() || !("animate" in from)) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  let ghost: HTMLElement;
  if (html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    ghost = t.content.firstElementChild as HTMLElement;
  } else {
    ghost = from.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, { width: `${a.width}px`, height: `${a.height}px` });
  }
  Object.assign(ghost.style, { position: "fixed", left: `${a.left}px`, top: `${a.top}px`, margin: "0", zIndex: "90", pointerEvents: "none" });
  // внутри .kurai-app — чтобы копия видела токены темы
  (document.querySelector(".kurai-app") ?? document.body).append(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const frames: Keyframe[] = [
    { transform: "none", opacity: 1 },
    ...(arc ? [{ transform: `translate(${dx / 2}px, ${dy / 2 - arc}px) scale(0.9)`, offset: 0.5 }] : []),
    { transform: `translate(${dx}px, ${dy}px) scale(${endScale})`, opacity: fade ? 0.2 : 1 },
  ];
  await ghost.animate(frames, { duration: ms, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }).finished.catch(() => undefined);
  ghost.remove();
}

/**
 * Смена состояния всего экрана, которая расходится кругом из точки (смена темы).
 * Без View Transitions или в спокойном режиме изменение применяется сразу.
 */
export function revealFrom(update: () => void, origin?: { x: number; y: number }): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || !origin || isCalm()) {
    update();
    return;
  }
  const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
  document.documentElement.classList.add("k-reveal");
  const vt = doc.startViewTransition(update);
  vt.ready
    .then(() =>
      document.documentElement
        .animate(
          { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
          { duration: 520, easing: "cubic-bezier(.6,0,.2,1)", pseudoElement: "::view-transition-new(root)" },
        )
        .finished.catch(() => undefined),
    )
    .finally(() => document.documentElement.classList.remove("k-reveal"));
}

/** Перезапускает CSS-анимацию класса на элементе (мерцание, глитч). */
export function retrigger(el: Element | null, className: string): void {
  if (!el) return;
  el.classList.remove(className);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(className);
}

/** Где было поле ввода в момент отправки: новое сообщение в ленте «вылетает» оттуда (18). */
export function markSendOrigin(el: Element | null): void {
  markOrigin("send", el);
}

/** FLIP: элемент стартует из прямоугольника отправки и встаёт на своё место. Срабатывает один раз на отправку. */
export function flyInFromSend(el: Element | null): void {
  const origin = origins.get("send");
  if (!el || !origin || Date.now() - origin.at > 1500 || isCalm() || !("animate" in el)) return;
  origins.delete("send");
  const b = el.getBoundingClientRect();
  // реплика — строка документа от левого края: совмещаем левые края, по вертикали — центр поля
  const dx = origin.rect.left - b.left;
  const dy = origin.rect.top + origin.rect.height / 2 - (b.top + b.height / 2);
  (el as HTMLElement).animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(0.97)`, opacity: 0.3 },
      { transform: "none", opacity: 1 },
    ],
    { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" },
  );
}

/**
 * Откуда «прилетит» элемент на следующем экране: прямоугольник источника по ключу, живёт 4 с (с загрузкой данных).
 * Хранилище на globalThis: меню и страница чата могут попасть в разные чанки с разными копиями модуля.
 */
const origins: Map<string, { rect: DOMRect; at: number }> = ((globalThis as unknown as { __kuraiOrigins?: Map<string, { rect: DOMRect; at: number }> }).__kuraiOrigins ??= new Map());

export function markOrigin(key: string, el: Element | null): void {
  if (el) origins.set(key, { rect: el.getBoundingClientRect(), at: Date.now() });
}

/** FLIP из запомненного прямоугольника: элемент стартует там (с масштабом по высоте) и встаёт на место. */
export function flyFromOrigin(key: string, el: Element | null, maxAge = 4000): void {
  const origin = origins.get(key);
  origins.delete(key);
  if (!el || !origin || Date.now() - origin.at > maxAge || isCalm() || !("animate" in el)) return;
  const b = el.getBoundingClientRect();
  // цель за краем экрана (открылось на сохранённом месте) — лететь некуда
  if (b.bottom < 0 || b.top > innerHeight) return;
  const scale = Math.min(1, origin.rect.height / Math.max(1, b.height));
  (el as HTMLElement).animate(
    [
      { transformOrigin: "0 0", transform: `translate(${origin.rect.left - b.left}px, ${origin.rect.top - b.top}px) scale(${scale})`, opacity: 0.6 },
      { transformOrigin: "0 0", transform: "none", opacity: 1 },
    ],
    { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)" },
  );
}
