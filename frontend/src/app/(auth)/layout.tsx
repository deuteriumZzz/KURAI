import Link from "next/link";

function Wordmark() {
  return (
    <span className="flex items-center gap-3">
      <span className="text-[19px] font-normal tracking-[0.34em] text-ink">KURAI</span>
      <span aria-hidden="true" className="h-6 w-px bg-line2" />
      <span className="font-mono text-[8.5px] leading-[1.35] tracking-[0.22em] text-ink3">DEEP WORK<br />WITH AI</span>
    </span>
  );
}

/** Вход: слева спокойный якорь бренда (на телефоне скрыт), справа форма. Без телеметрии и декоративных сеток. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="kurai-app grid min-h-dvh md:grid-cols-2">
      <aside aria-hidden="true" className="k-rail relative hidden flex-col justify-between p-10 md:flex">
        <Link href="/" aria-label="KURAI — на главную" tabIndex={-1}>
          <Wordmark />
        </Link>
        <div>
          <p className="k-index mb-5">K/00 · Рабочее пространство</p>
          <p className="k-display text-[clamp(3rem,5.4vw,5.25rem)] text-ink">
            Продолжите
            <br />с того же места
          </p>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink2">История задач, маршруты и баланс хранятся в вашем рабочем пространстве.</p>
        </div>
        <span />
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-8">
        <Link href="/" className="md:hidden" aria-label="KURAI — на главную">
          <Wordmark />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
