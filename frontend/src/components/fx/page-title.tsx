/** Заголовок экрана кабинета: спокойный, на одной линии с шапкой чата. */
export function PageTitle({ title }: { title: string }) {
  return <h1 className="truncate text-[16px] font-normal tracking-[-0.01em] text-ink">{title}</h1>;
}
