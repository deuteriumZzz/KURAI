import Link from "next/link";
import type { ReactNode } from "react";
import { Label, SysLine } from "@/components/fx/primitives";

/** «Сигнал потерян» — общий вид 404 и 500. Крупный глитч разрешён только здесь. */
export function SignalLost({ code, text, action }: { code: string; text: string; action?: ReactNode }) {
  return (
    <main className="fx-halftone relative flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center">
      <Label className="text-acc">{code}</Label>
      <h1 className="fx-glitch-loud font-display text-[clamp(2.2rem,7vw,4.5rem)] font-extralight tracking-[0.06em]">СИГНАЛ ПОТЕРЯН</h1>
      <p className="max-w-md text-ink2">{text}</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {action}
        <Link href="/" className="text-[14px] text-ink2 hover:text-ink">
          На главную →
        </Link>
      </div>
      <SysLine className="absolute bottom-6">{`KURAI // NODE-EU-01 // ${code}`}</SysLine>
    </main>
  );
}
