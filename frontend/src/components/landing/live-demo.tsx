"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { StreamText } from "@/components/fx/decode";
import { Label, SysLine } from "@/components/fx/primitives";
import { isCalm } from "@/lib/motion";

const PROMPT = "Собери короткую записку о рисках AI-регулирования для продуктовой команды";
const ANSWER =
  "Сначала выделю требования, которые влияют на продукт в ближайшем квартале. Затем соберу проверяемые источники и оформлю вывод в краткий план действий для команды.";

const SOURCES = ["Регуляторный обзор", "Отраслевая аналитика", "Внутренняя заметка"];

type Phase = "idle" | "typing" | "route" | "stream" | "sources" | "done";

/** Интерактивный пример: запрос → подготовка маршрута → ответ → опоры. Запускается при появлении. */
export function LiveDemo() {
  const root = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState(0);
  const [streamed, setStreamed] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)));

    async function play() {
      if (isCalm()) {
        setTyped(PROMPT.length);
        setStreamed(ANSWER.length);
        setPhase("done");
        return;
      }
      setPhase("typing");
      for (let i = 1; i <= PROMPT.length && !cancelled; i++) {
        setTyped(i);
        await wait(22);
      }
      setPhase("route");
      await wait(700);
      setPhase("stream");
      for (let i = 0; i <= ANSWER.length && !cancelled; i += 3) {
        setStreamed(i);
        await wait(26);
      }
      setStreamed(ANSWER.length);
      setPhase("sources");
      await wait(1200);
      if (!cancelled) setPhase("done");
    }

    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        io.disconnect();
        void play();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [run]);

  const showAnswer = phase === "stream" || phase === "sources" || phase === "done";

  return (
    <div ref={root} className="border border-line bg-g1">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <Label>Сценарий · research</Label>
        <button
          type="button"
          onClick={() => {
            setTyped(0);
            setStreamed(0);
            setPhase("idle");
            setRun((r) => r + 1);
          }}
          className="-my-1 inline-flex min-h-8 cursor-pointer items-center gap-1.5 px-2 text-[12px] text-ink3 hover:text-ink pointer-coarse:min-h-11"
        >
          <RotateCcw size={12} strokeWidth={1.5} /> Ещё раз
        </button>
      </div>
      <div className="relative flex min-h-[420px] flex-col gap-4 overflow-hidden bg-bg p-4 sm:p-5">
        <div aria-hidden="true" className="fx-live-orbit absolute -right-24 -bottom-24 size-64" />
        <div className="ml-auto max-w-[85%] border border-line bg-g2 px-3.5 py-2.5 text-[14px]">
          {PROMPT.slice(0, typed) || <span className="text-ink3">…</span>}
          {phase === "typing" && <span className="fx-caret text-acc">▍</span>}
        </div>
        {phase !== "idle" && phase !== "typing" && <SysLine decode>Маршрут определён · оценка до запуска</SysLine>}
        {showAnswer && (
          <div className="text-[14px] leading-relaxed">
            <StreamText text={ANSWER.slice(0, streamed)} done={streamed >= ANSWER.length} />
          </div>
        )}
        {(phase === "sources" || phase === "done") && (
          <div className="flex flex-col gap-2">
            <SysLine tone="acc" decode>
              Материалы к ответу
            </SysLine>
            <div className="fx-reveal grid max-w-md gap-px border border-line bg-line sm:grid-cols-3">
              {SOURCES.map((source, index) => (
                <div key={source} className="bg-g1 p-3">
                  <Label className="text-acc">0{index + 1}</Label>
                  <p className="mt-4 text-[12px] leading-snug text-ink2">{source}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
