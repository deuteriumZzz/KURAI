"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMotionValueEvent, useScroll } from "motion/react";
import { saveLandingDraft } from "@/lib/landing-draft";
import { useCalm } from "@/lib/use-calm";

const ROWS = 11;
const GAP = 38;
const TASKS = ["Письмо арендодателю о ремонте", "План поездки на выходные", "Сравни три тарифа хостинга"];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

/**
 * Финал «С чего начнём?»: строки с провайдерами каталога сходятся к лаймовой линии,
 * линия ложится на верхнюю кромку поля ввода — сборка заканчивается самим продуктом.
 * Отправка, как на первом экране: черновик сохраняется и открывается регистрация.
 * В спокойном режиме — сразу итог.
 */
export function FinalCall({ names }: { names: string[] }) {
  const calm = useCalm();
  const router = useRouter();
  const [value, setValue] = useState("");
  const track = useRef<HTMLDivElement>(null);
  const rowsBox = useRef<HTMLDivElement>(null);
  const bus = useRef<HTMLElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const motion = !calm && names.length > 0;

  const rows = Array.from({ length: ROWS }, (_, i) => {
    const shift = names.length ? i % names.length : 0;
    const line = [...names.slice(shift), ...names.slice(0, shift)].join("   ·   ");
    return [line, line, line].join("   ·   ");
  });

  // линия становится кромкой поля: её итоговая ширина — ширина поля
  const edge = () => (box.current?.offsetWidth ?? 0) / document.documentElement.clientWidth;

  const draw = (f: number) => {
    const rowsEl = rowsBox.current;
    const line = bus.current;
    if (!rowsEl || !line || !head.current || !box.current) return;
    const W = rowsEl.clientWidth;
    const cy = line.getBoundingClientRect().top - rowsEl.getBoundingClientRect().top;
    const els = [...rowsEl.children] as HTMLElement[];
    const size = els.map((el) => [el.offsetWidth, el.offsetHeight] as const);
    // строки сходятся к линии и гаснут раньше, чем начнут налезать друг на друга
    const conv = smooth(clamp01(f / 0.5));
    const fade = 1 - clamp01((conv - 0.45) / 0.3);
    els.forEach((el, i) => {
      const [w, h] = size[i]!;
      const x = (W - w) / 2 + (i % 2 ? 1 : -1) * (1 - f) * 240;
      const y = cy + (i - (ROWS - 1) / 2) * GAP * (1 - conv) - h / 2;
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      el.style.opacity = ((0.3 + 0.4 * conv) * fade).toFixed(3);
      el.toggleAttribute("data-hot", conv > 0.4);
    });
    const grow = smooth(clamp01((f - 0.32) / 0.2));
    const shrink = smooth(clamp01((f - 0.6) / 0.14));
    line.style.setProperty("--bo", grow.toFixed(3));
    line.style.setProperty("--bx", (grow * (1 - (1 - edge()) * shrink)).toFixed(4));
    const co = smooth(clamp01((f - 0.66) / 0.16));
    for (const el of [head.current, box.current]) {
      el.style.opacity = co.toFixed(3);
      el.style.transform = `translateY(${((1 - co) * 16).toFixed(1)}px)`;
      el.style.visibility = co > 0.01 ? "visible" : "hidden";
    }
  };

  useMotionValueEvent(scrollYProgress, "change", (f) => motion && draw(f));
  useEffect(() => {
    const line = bus.current;
    if (!motion) {
      // итог без движения: заголовок и поле видны, линия — по кромке поля
      for (const el of [head.current, box.current]) el?.removeAttribute("style");
      const place = () => {
        line?.style.setProperty("--bo", "1");
        line?.style.setProperty("--bx", edge().toFixed(4));
      };
      place();
      addEventListener("resize", place);
      return () => removeEventListener("resize", place);
    }
    const redraw = () => draw(scrollYProgress.get());
    redraw();
    addEventListener("resize", redraw);
    return () => removeEventListener("resize", redraw);
    // draw и edge читают только ref'ы — пересоздавать подписку на каждый рендер незачем
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion, scrollYProgress]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) saveLandingDraft("text", value.trim());
    router.push("/register");
  }

  return (
    <section aria-labelledby="fin-title">
      <div ref={track} className={motion ? "h-[240vh]" : undefined}>
        <div className={motion ? "sticky top-0 grid h-dvh place-items-center overflow-hidden" : "py-28"}>
          {motion && (
            <div ref={rowsBox} aria-hidden="true" className="pointer-events-none absolute inset-0">
              {rows.map((r, i) => (
                <div key={i} className="k-fin-row">
                  {r}
                </div>
              ))}
            </div>
          )}
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 text-center sm:px-6">
            <div ref={head} className="flex flex-col items-center">
              <p className="k-index">K/04 · Начать</p>
              <h2 id="fin-title" className="k-tech mt-4 text-[clamp(2.4rem,6vw,4.6rem)] leading-none">
                С чего начнём?
              </h2>
              <p className="mt-5 font-mono text-[12px] tracking-[0.2em] text-acc uppercase">10 кредитов на баланс при регистрации</p>
            </div>
            <div className="relative mt-12 w-full max-w-[54rem]">
              {/* линия, в которую сошлись строки каталога, — верхняя кромка поля */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-px z-10 block h-px">
                <i ref={bus} className="k-bus" />
              </span>
              <div ref={box}>
                <form onSubmit={submit} className="k-composer px-5 pt-5 pb-3 text-left">
                  <label htmlFor="final-input" className="sr-only">
                    Задача
                  </label>
                  <textarea
                    ref={input}
                    id="final-input"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                    rows={2}
                    maxLength={2000}
                    placeholder="Спросите что угодно или выберите задачу ниже…"
                    className="block min-h-[3.5rem] w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink3"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {TASKS.map((task) => (
                      <button
                        key={task}
                        type="button"
                        onClick={() => {
                          setValue(task);
                          input.current?.focus();
                        }}
                        className="k-tool h-9 rounded-full border border-line px-3.5 text-[13px] hover:border-line2"
                      >
                        {task}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-4 border-t border-line pt-3">
                    <Link href="/login" className="inline-flex min-h-11 items-center text-[14px] text-ink2 hover:text-ink">
                      Уже есть аккаунт? Войти
                    </Link>
                    <button type="submit" className="k-ignite k-chamfer inline-flex h-11 cursor-pointer items-center gap-2 border border-acc bg-acc px-4 text-[13.5px] font-semibold text-acc-ink active:translate-y-px">
                      Продолжить
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
