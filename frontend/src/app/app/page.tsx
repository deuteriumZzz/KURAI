import { Composer } from "@/components/app/composer";
import { InspirationStrip } from "@/components/app/inspiration";
import { Greeting } from "@/components/app/greeting";
import { Appear } from "@/components/fx/motion";
import { Decode } from "@/components/fx/decode";
import { MOCK_BALANCE, MOCK_USER } from "@/mocks/data";
import { MODES } from "@/lib/modes";
import type { Mode } from "@/types/api";

/** Главная кабинета — как у Kimi: пустой экран, одно поле ввода, чипы режимов под ним. */
export default async function AppHome(props: PageProps<"/app">) {
  const sp = await props.searchParams;
  const mode = MODES.find((m) => m.id === sp.mode)?.id as Mode | undefined;
  const model = typeof sp.model === "string" ? sp.model : undefined;
  const prompt = typeof sp.prompt === "string" ? sp.prompt.slice(0, 2000) : "";
  return (
    <main className="relative flex flex-1 flex-col overflow-y-auto bg-[radial-gradient(1200px_600px_at_50%_-20%,var(--color-acc-soft),transparent_60%)]">
      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-4 pt-20 pb-36">
        <h1 className="relative mr-[-0.44em] mb-6 font-brand text-[40px] leading-none font-extralight tracking-[0.44em] md:text-[64px]">
          <Decode text="KURAI" duration={420} />
          <span aria-hidden="true" className="absolute -bottom-4 left-1/2 h-0.5 w-7 -translate-x-[calc(50%+0.22em)] bg-acc" />
        </h1>
        <Greeting name={MOCK_USER.name} />
        <Appear delay={0.12} className="flex w-full justify-center [&>form]:max-w-[780px]">
          <Composer key={`${mode}:${model}:${prompt}`} variant="home" initialMode={mode} initialValue={prompt} initialModel={model} balanceMicro={MOCK_BALANCE.micro} />
        </Appear>
        <a href="#inspiration" className="absolute bottom-7 hidden text-[13.5px] text-ink3 hover:text-ink2 md:block">
          <span className="text-ink2">Найти вдохновение</span> · прокрутите вниз
        </a>
      </div>
      <div id="inspiration" className="flex scroll-mt-6 justify-center px-4 pb-16">
        <InspirationStrip />
      </div>
    </main>
  );
}
