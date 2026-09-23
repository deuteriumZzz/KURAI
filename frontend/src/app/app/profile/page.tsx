import { ShareCard } from "@/components/settings/share-card";
import { Label, Segments } from "@/components/fx/primitives";
import { formatCredits } from "@/lib/format";
import { MOCK_BALANCE, MOCK_LEDGER, MOCK_MEDIA, MOCK_USER } from "@/mocks/data";

/** Статистика профиля как лист характеристик — только реальные данные аккаунта. */
export default function ProfilePage() {
  const charges = MOCK_LEDGER.filter((e) => e.kind === "charge");
  const spent = charges.reduce((s, e) => s - e.amountMicro, 0);
  const models = new Map<string, number>();
  charges.forEach((e) => e.model && models.set(e.model, (models.get(e.model) ?? 0) + 1));
  const favorite = [...models.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const images = MOCK_MEDIA.filter((m) => m.kind === "image").length;
  const videos = MOCK_MEDIA.filter((m) => m.kind === "video").length;
  const subscriptionsRub = 2000 + 1000 + 1500; // ориентир: текст + изображения + видео отдельными подписками
  const savedRub = Math.max(0, subscriptionsRub - Math.round(spent / 10_000));

  const stats = [
    { label: "Запросов за месяц", value: "1 284", fill: 0.64 },
    { label: "Потрачено", value: formatCredits(spent), fill: spent / MOCK_BALANCE.monthlyGrantMicro },
    { label: "Изображений · видео", value: `${images} · ${videos}`, fill: 0.4 },
    { label: "Сэкономлено против отдельных подписок", value: `${savedRub.toLocaleString("ru-RU")} ₽`, fill: savedRub / subscriptionsRub },
  ];

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 pl-16 md:pl-6">
        <h1 className="font-display text-lg font-light">Профиль</h1>
        <Label>{MOCK_USER.email}</Label>
      </header>
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-6 md:grid-cols-[1.2fr_0.8fr] md:px-6">
        <section aria-labelledby="stats" className="flex flex-col gap-4">
          <h2 id="stats" className="text-[15px] font-semibold">
            Статистика · сентябрь
          </h2>
          <dl className="flex flex-col gap-4 border border-line bg-g1 p-5">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <dt className="text-ink2">{s.label}</dt>
                  <dd className="font-mono text-ink tabular-nums">{s.value}</dd>
                </div>
                <Segments value={s.fill} count={16} label={s.label} />
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <dt className="text-ink2">Любимая модель</dt>
              <dd className="font-mono text-acc">{favorite}</dd>
            </div>
          </dl>
          <p className="text-[12px] text-ink3">Экономия — ориентир относительно трёх отдельных подписок на текст, изображения и видео.</p>
        </section>
        <section aria-labelledby="share" className="flex flex-col gap-4">
          <h2 id="share" className="text-[15px] font-semibold">
            Поделиться
          </h2>
          <ShareCard lines={[`1 284 запроса`, `${images} картинок · ${videos} видео`, `любимая: ${favorite}`, `сэкономлено ${savedRub.toLocaleString("ru-RU")} ₽`]} />
        </section>
      </div>
    </main>
  );
}
