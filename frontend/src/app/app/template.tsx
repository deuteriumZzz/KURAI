/**
 * Контейнер маршрутов кабинета.
 *
 * Здесь намеренно нет enter-анимации: на части браузеров Motion может оставить
 * новый template в начальном состоянии при прямом открытии URL. Микроанимации
 * живут внутри самих экранов, но сам рабочий контент всегда виден сразу.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}
