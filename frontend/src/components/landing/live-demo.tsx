"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { StreamText } from "@/components/fx/decode";
import { Label, SysLine } from "@/components/fx/primitives";
import { isCalm } from "@/lib/motion";
import { placeholderImage } from "@/mocks/media";

const PROMPT = "Сравни GPT-5 и Claude для работы с текстом и нарисуй обложку к выводу";
const ANSWER =
  "Для длинных текстов и редактуры сильнее Claude, для быстрых черновиков и кода — GPT-5. Обложку сделаю в режиме «Изображение» — это тот же чат, контекст сохранится.";

type Phase = "idle" | "typing" | "route" | "stream" | "image" | "done";

/** Живое демо на лендинге: печать запроса → маршрут → стриминг с расшифровкой → картинка. Запускается при появлении. */
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
      setPhase("image");
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

  const showAnswer = phase === "stream" || phase === "image" || phase === "done";

  return (
    <div ref={root} className="border border-line bg-g1">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <Label>Живое демо · единый чат</Label>
        <button
          type="button"
          onClick={() => {
            setTyped(0);
            setStreamed(0);
            setPhase("idle");
            setRun((r) => r + 1);
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-ink3 hover:text-ink"
        >
          <RotateCcw size={12} strokeWidth={1.5} /> Повторить
        </button>
      </div>
      <div className="flex min-h-[420px] flex-col gap-4 bg-bg p-4 sm:p-5">
        <div className="ml-auto max-w-[85%] border border-line bg-g2 px-3.5 py-2.5 text-[14px]">
          {PROMPT.slice(0, typed) || <span className="text-ink3">…</span>}
          {phase === "typing" && <span className="fx-caret text-acc">▍</span>}
        </div>
        {phase !== "idle" && phase !== "typing" && <SysLine decode>Claude Sonnet 5 · EU-01 · 240 мс</SysLine>}
        {showAnswer && (
          <div className="text-[14px] leading-relaxed">
            <StreamText text={ANSWER.slice(0, streamed)} done={streamed >= ANSWER.length} />
          </div>
        )}
        {(phase === "image" || phase === "done") && (
          <div className="flex flex-col gap-2">
            <SysLine tone="acc" decode>
              Nano Banana Pro · 4 варианта · 16 кр
            </SysLine>
            <div className="fx-reveal fx-flicker-border grid max-w-md grid-cols-4 gap-1.5 border border-line p-1.5">
              {[0, 1, 2, 3].map((i) => (
                // eslint-disable-next-line @next/next/no-img-element -- локальная SVG-заглушка
                <img key={i} src={placeholderImage(i + 3, 256, 256, "")} alt="" className="aspect-square w-full" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
