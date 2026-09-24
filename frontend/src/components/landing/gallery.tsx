import { Art } from "@/components/app/inspiration";
import { Appear } from "@/components/fx/motion";
import { Label } from "@/components/fx/primitives";

const WORKS = [
  { art: "city", mode: "Изображение", model: "Nano Banana Pro", title: "Постер ночного маркета" },
  { art: "wave", mode: "Видео", model: "Veo 3", title: "Оживлённый товар" },
  { art: "bars", mode: "Слайды", model: "Авто · агент", title: "Питч-дек за 3 минуты" },
  { art: "rings", mode: "Research", model: "Авто · агент", title: "Карта рынка доставки" },
  { art: "sun", mode: "Аудио", model: "TTS · Нова", title: "Озвучка для Reels" },
  { art: "grid", mode: "Изображение", model: "Flux 2", title: "Логотип кофейни" },
] as const;

/** «Сделано в KURAI»: витрина работ. Сейчас — процедурные примеры; после запуска — реальные работы с согласия авторов. */
export function Gallery() {
  return (
    <section aria-labelledby="gal-title" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label className="text-acc">Витрина</Label>
          <h2 id="gal-title" className="mt-2 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-normal">
            Сделано в KURAI
          </h2>
        </div>
        <Label>примеры</Label>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {WORKS.map((w, i) => (
          <Appear inView index={i} key={w.title}>
            <figure className="fx-hover group border border-line bg-g1 hover:border-line2">
              <div className="aspect-[4/3] overflow-hidden border-b border-line">
                <div className="h-full w-full transition-transform duration-(--dur-slow) ease-(--ease-out) group-hover:scale-[1.04]">
                  <Art kind={w.art} seed={80 + i} />
                </div>
              </div>
              <figcaption className="flex flex-col gap-1 p-3">
                <span className="text-[13.5px]">{w.title}</span>
                <Label>
                  {w.mode} · {w.model}
                </Label>
              </figcaption>
            </figure>
          </Appear>
        ))}
      </div>
    </section>
  );
}
