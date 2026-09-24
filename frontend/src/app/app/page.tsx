import Link from "next/link";
import { Composer } from "@/components/app/composer";
import { StatusBar } from "@/components/app/status-bar";
import { FirstRun } from "@/components/app/first-run";
import { InspirationStrip } from "@/components/app/inspiration";
import { Announcement } from "@/components/app/announcement";
import { Appear } from "@/components/fx/motion";
import { Decode } from "@/components/fx/decode";
import { Label } from "@/components/fx/primitives";
import { formatCredits } from "@/lib/format";
import { MOCK_BALANCE, MOCK_STATUS } from "@/mocks/data";
import { MODES } from "@/lib/modes";
import type { Mode } from "@/types/api";

/** Главная кабинета — как у Kimi: пустой экран, одно поле ввода, чипы режимов под ним. */
export default async function AppHome(props: PageProps<"/app">) {
  const sp = await props.searchParams;
  const mode = MODES.find((m) => m.id === sp.mode)?.id as Mode | undefined;
  const prompt = typeof sp.prompt === "string" ? sp.prompt.slice(0, 2000) : "";
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
        <p className="-mt-3 font-mono text-[11px] tracking-[0.16em] text-ink3 uppercase">
          <Decode text="Один чат · 300+ моделей · цена до отправки" duration={700} />
        </p>
        <FirstRun />
        <Appear delay={0.12} className="flex w-full justify-center">
          <Composer key={`${mode}:${prompt}`} variant="home" initialMode={mode} initialValue={prompt} balanceMicro={MOCK_BALANCE.micro} />
        </Appear>
        <Announcement />
        <InspirationStrip />
      </div>

      <StatusBar status={MOCK_STATUS} className="px-4 pb-4" />
    </main>
  );
}
