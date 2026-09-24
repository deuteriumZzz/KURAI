import Link from "next/link";
import { KuraiLogo } from "@/components/brand/mark";
import { Label, Scanline } from "@/components/fx/primitives";

/** Оболочка входа: слева панель с сеткой (на телефоне скрыта), справа форма. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <aside
        aria-hidden="true"
        className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-g1 p-10 md:flex"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      >
        <Scanline active />
        <Link href="/" className="relative" aria-label="KURAI — на главную">
          <KuraiLogo />
        </Link>
        <div className="relative">
          <p className="font-display text-5xl leading-[1.05] font-extralight tracking-wide">
            Продолжите
            <br />с того же
            <br />
            места.
          </p>
          <Label className="mt-5 block">История и баланс общие для сайта и Telegram</Label>
        </div>
        <Label className="relative">SYS · ONLINE · NODE-EU-01</Label>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-8">
        <Link href="/" className="md:hidden" aria-label="KURAI — на главную">
          <KuraiLogo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
