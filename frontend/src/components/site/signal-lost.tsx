import Link from "next/link";
import type { ReactNode } from "react";
import { Label, SysLine } from "@/components/fx/primitives";
import { Scanner } from "./scanner";
import { Decode } from "@/components/fx/decode";

/** «Сигнал потерян» — общий вид 404 и 500. Крупный глитч разрешён только здесь. */
export function SignalLost({ code, text, action }: { code: string; text: string; action?: ReactNode }) {
  return (
    <main className="fx-halftone relative flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center">
      <Label className="text-acc">{code}</Label>
      {/* К10 — заголовок собирается из кодов, одна вспышка при открытии, потом тишина */}
      <h1 className="fx-glitch-loud font-display text-[clamp(2.2rem,7vw,4.5rem)] font-normal tracking-[0.06em]">
        <Decode text="СИГНАЛ ПОТЕРЯН" duration={700} />
      </h1>
      <p className="max-w-md text-ink2">{text}</p>
      <Scanner />
      <div className="flex flex-wrap items-center justify-center gap-4">
        {action}
        <Link href="/" className="py-2 text-[14px] text-ink2 hover:text-ink pointer-coarse:py-3">
          На главную →
        </Link>
      </div>
      <SysLine className="absolute bottom-6">{`KURAI // NODE-EU-01 // ${code}`}</SysLine>
    </main>
  );
}
