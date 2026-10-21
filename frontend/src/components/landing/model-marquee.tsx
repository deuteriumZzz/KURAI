import { plural } from "@/lib/format";

/**
 * Бегущая строка каталога (из плана лендинга): провайдеры и число их моделей из живого каталога.
 * Две одинаковые копии уезжают ровно на половину ширины; на наведении, в спокойном режиме
 * и при «уменьшить движение» строка стоит. Список для экранного диктора — отдельно, без повторов.
 */
export function ModelMarquee({ providers }: { providers: { name: string; count: number }[] }) {
  if (providers.length === 0) return null;
  const items = providers.map((p) => (
    <span key={p.name} className="pr-10 whitespace-nowrap">
      <span className="text-ink2">{p.name}</span> <span className="k-code text-ink3">{p.count}</span>
    </span>
  ));
  return (
    <section aria-label="Провайдеры в каталоге" className="k-marquee-wrap overflow-hidden border-y border-line py-4 text-[13.5px]">
      <p className="sr-only">В каталоге: {providers.map((p) => `${p.name} — ${plural(p.count, ["модель", "модели", "моделей"])}`).join(", ")}.</p>
      <div aria-hidden="true" className="k-marquee">
        <div className="flex">{items}</div>
        <div data-copy className="flex">{items}</div>
      </div>
    </section>
  );
}
