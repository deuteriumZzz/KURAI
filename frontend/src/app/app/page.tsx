import Link from "next/link";
import { Composer } from "@/components/app/composer";
import { StatusBar } from "@/components/app/status-bar";
import { Decode } from "@/components/fx/decode";
import { Label } from "@/components/fx/primitives";
import { formatCredits } from "@/lib/format";
import { MOCK_BALANCE, MOCK_STATUS } from "@/mocks/data";

/** Главная кабинета — как у Kimi: пустой экран, одно поле ввода, чипы режимов под ним. */
export default function AppHome() {
  return (
    <main className="relative flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center justify-end gap-3 px-4 pt-3 pl-16 md:pl-4">
        <Label>Кредиты</Label>
        <span className="font-mono text-[13px] tabular-nums">{formatCredits(MOCK_BALANCE.micro, { unit: false })}</span>
        <Link
          href="/app/billing"
          className="fx-chamfer border border-line2 bg-g2 px-3 py-1.5 text-[13px] [--ch:var(--chamfer-sm)] hover:border-acc-line"
        >
          Пополнить
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-4 py-10">
        <h1 className="mr-[-0.5em] font-display text-4xl font-light tracking-[0.5em] sm:text-5xl">
          <Decode text="KURAI" duration={420} />
        </h1>
        <Composer variant="home" />
      </div>

      <StatusBar status={MOCK_STATUS} className="px-4 pb-4" />
    </main>
  );
}
