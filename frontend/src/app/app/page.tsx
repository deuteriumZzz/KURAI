import Link from "next/link";
import { Composer } from "@/components/app/composer";
import { InspirationStrip } from "@/components/app/inspiration";
import { Greeting } from "@/components/app/greeting";
import { Appear } from "@/components/fx/motion";
import { Decode } from "@/components/fx/decode";
import { Label } from "@/components/fx/primitives";
import { formatCredits } from "@/lib/format";
import { MOCK_BALANCE, MOCK_USER } from "@/mocks/data";
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
          className="rounded-(--radius-field) bg-s2 px-3 py-1.5 text-[13px] hover:bg-s3"
        >
          Пополнить
        </Link>
      </div>

      <div className="flex min-h-[78dvh] flex-col items-center justify-center gap-7 px-4 py-10">
        <h1 className="mr-[-0.44em] flex items-center font-brand text-5xl font-light tracking-[0.44em]">
          <Decode text="KURAI" duration={420} />
          <span aria-hidden="true" className="ml-[-0.2em] h-1 w-5 translate-y-3 bg-acc" />
        </h1>
        <Greeting name={MOCK_USER.name} />
        <Appear delay={0.12} className="flex w-full justify-center">
          <Composer key={`${mode}:${prompt}`} variant="home" initialMode={mode} initialValue={prompt} balanceMicro={MOCK_BALANCE.micro} />
        </Appear>
      </div>
      <div className="flex justify-center px-4 pb-12">
        <InspirationStrip />
      </div>
    </main>
  );
}
