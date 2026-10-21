"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ModeIcon } from "@/components/brand/mode-icons";
import { useFx } from "@/components/fx/primitives";
import { formatCredits } from "@/lib/format";
import { kuraiApi } from "@/lib/kurai-api";
import { saveLandingDraft } from "@/lib/landing-draft";
import { isCalm } from "@/lib/motion";
import { MODES, modeById } from "@/lib/modes";
import type { PublicMode } from "@/lib/public-catalog";
import type { Mode } from "@/types/api";

/** Режимы, где «Авто» сам подбирает модель — для них сервер считает цену до регистрации. */
const AUTO_PRICED: Mode[] = ["text", "research", "slides"];

/**
 * Первый экран лендинга — то же поле ввода, что в кабинете. Цена считается сервером по формуле резерва,
 * отправка ведёт в регистрацию, а черновик открывается в кабинете после входа.
 */
export function TryComposer({ modes }: { modes: PublicMode[] | null }) {
  const router = useRouter();
  const [boxRef, flicker] = useFx<HTMLFormElement>("fx-flicker-border");
  const [mode, setMode] = useState<Mode>("text");
  const [value, setValue] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  // без сервера доступность неизвестна — показываем режимы без пометок
  const ready = (id: Mode) => !modes || id === "text" || Boolean(modes.find((m) => m.id === id)?.available);

  // корзины по 500 символов, как в кабинете: сервер не дёргается на каждую букву
  const chars = Math.max(500, Math.ceil(value.length / 500) * 500);
  useEffect(() => {
    const api = kuraiApi;
    if (!api || !AUTO_PRICED.includes(mode)) return;
    let live = true;
    const timer = setTimeout(() => {
      void api.estimate(mode, "openrouter/auto", chars).then(
        (e) => live && setPrice(e.estimatedCostMicro),
        () => live && setPrice(null),
      );
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [mode, chars]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) saveLandingDraft(mode, value.trim());
    // 41 — точки фона на миг стягиваются к полю, как при отправке в кабинете; потом переход
    const r = boxRef.current?.getBoundingClientRect();
    if (r) window.dispatchEvent(new CustomEvent("kurai:sent", { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
    setTimeout(() => router.push("/register"), isCalm() ? 0 : 280);
  }

  const priced = AUTO_PRICED.includes(mode) && price !== null;
  return (
    <div className="flex flex-col gap-3">
      <form ref={boxRef} onSubmit={submit} className="k-composer px-5 pt-5 pb-3">
        <label htmlFor="composer-input" className="sr-only">
          Задача
        </label>
        <textarea
          id="composer-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={3}
          maxLength={2000}
          placeholder={modeById(mode).placeholder}
          className="block min-h-[5.5rem] w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink3"
        />
        <div className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-3">
          <span className="k-code mr-auto text-[12px] text-ink3" aria-live="polite">
            Авто{priced ? ` · ≈ ${formatCredits(price)}` : ""}
          </span>
          <button type="submit" className="k-ignite k-chamfer inline-flex h-11 cursor-pointer items-center gap-2 border border-acc bg-acc px-4 text-[13.5px] font-semibold text-acc-ink active:translate-y-px">
            <span className="k-kbd border-acc-ink/25 bg-transparent text-acc-ink">↵</span>
            Продолжить
          </button>
        </div>
      </form>
      <div role="radiogroup" aria-label="Режим задачи" className="flex flex-wrap items-center gap-1">
        {MODES.map((m) => {
          const on = m.id === mode;
          const soon = !ready(m.id);
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={soon}
              onClick={() => {
                if (soon || on) return;
                setMode(m.id);
                flicker();
              }}
              className="k-tool h-9 px-3 text-[13px]"
            >
              <ModeIcon mode={m.id} size={15} className={on ? undefined : "text-ink3"} />
              {m.label}
              {soon && <span className="k-index">скоро</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[13px] leading-6 text-ink3">
        Отправка откроет регистрацию: черновик сохранится, на баланс придут 10 кредитов. Уже есть аккаунт?{" "}
        <Link href="/login" className="text-ink2 underline underline-offset-2 hover:text-ink">
          Войти
        </Link>
      </p>
    </div>
  );
}
