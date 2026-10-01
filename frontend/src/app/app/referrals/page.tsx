import { Gift } from "lucide-react";
import { PageTitle } from "@/components/fx/page-title";

export default function ReferralsPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 pl-16 md:pl-6"><PageTitle title="Приглашения" /></header>
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-6 md:px-6">
        <section className="w-full">
          <Gift size={22} strokeWidth={1.5} className="text-ink3" aria-hidden="true" />
          <p className="k-index mt-6">Статус · не активировано</p>
          <h2 className="k-display mt-3 text-[clamp(2.5rem,6vw,4rem)] text-ink">Приглашения пока не запущены</h2>
          <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-ink2">
            Мы включим её только вместе с персональными ссылками, проверкой активации и неизменяемыми записями в балансе.
            До этого KURAI не показывает вымышленные бонусы или ссылки, которые не работают.
          </p>
        </section>
      </div>
    </main>
  );
}
