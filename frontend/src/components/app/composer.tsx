"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Globe, Paperclip } from "lucide-react";
import type { Mode } from "@/types/api";
import { MODES, modeById, parseCommand } from "@/lib/modes";
import { formatCredits } from "@/lib/format";
import { cn } from "@/lib/cn";
import { retrigger } from "@/lib/motion";
import { Decode } from "@/components/fx/decode";
import { KeyHint, Label } from "@/components/fx/primitives";
import { Hint } from "./hint";

type Props = {
  /** home — центр пустого экрана (чипы под полем, как у Kimi); dock — низ чата (чипы над полем). */
  variant: "home" | "dock";
  initialMode?: Mode;
};

/** Поле ввода единого чата. Режим — состояние поля, а не отдельная страница. */
export function Composer({ variant, initialMode = "text" }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [value, setValue] = useState("");
  const [web, setWeb] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const cfg = modeById(mode);

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    retrigger(boxRef.current, "fx-flicker-border");
  }

  function onChange(text: string) {
    const cmd = parseCommand(text);
    if (cmd) {
      switchMode(cmd.mode);
      setValue(cmd.rest);
      return;
    }
    setValue(text);
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!value.trim()) return;
    // тестовые данные: отправка ведёт в демонстрационный чат; настоящая отправка — в секции «Единый чат»
    setValue("");
    router.push("/app/c/7f3a");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
  }

  const chips = (
    <div role="radiogroup" aria-label="Режим" className={cn("flex flex-wrap gap-2", variant === "home" ? "justify-center" : "")}>
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={m.id === mode}
          onClick={() => switchMode(m.id)}
          className={cn(
            "cursor-pointer border px-3 py-1.5 text-[13px] transition-colors duration-(--dur-fast)",
            m.id === mode ? "border-acc-line bg-acc-soft text-acc" : "border-line bg-g1 text-ink2 hover:border-line2 hover:text-ink",
          )}
        >
          {m.label}
          {variant === "dock" && <span className="ml-1.5 font-mono text-[10px] text-ink3">{m.command}</span>}
        </button>
      ))}
    </div>
  );

  return (
    <form onSubmit={submit} className="flex w-full max-w-3xl flex-col gap-3">
      {variant === "dock" && chips}
      <div className="fx-brackets">
        <div
          ref={boxRef}
          className="fx-chamfer border border-line2 bg-g1 px-3.5 pt-3 pb-2.5 [--ch:var(--chamfer-lg)] focus-within:border-acc-line focus-within:shadow-[0_0_0_3px_var(--color-acc-soft)]"
        >
          {cfg.params.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {cfg.params.map((p) => (
                <span key={p} className="border border-line px-2 py-0.5 font-mono text-[11px] text-ink2">
                  {p}
                </span>
              ))}
            </div>
          )}
          <label htmlFor="composer-input" className="fx-sr">
            Запрос · режим «{cfg.label}»
          </label>
          <textarea
            id="composer-input"
            rows={variant === "home" ? 2 : 1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={cfg.placeholder}
            className="block max-h-60 min-h-7 w-full resize-none bg-transparent text-[15px] text-ink field-sizing-content outline-none placeholder:text-ink3"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button type="button" aria-label="Прикрепить файл" className="relative grid size-8 cursor-pointer place-items-center border border-line text-ink2 hover:text-ink pointer-coarse:size-11">
                <Paperclip size={16} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-pressed={web}
                aria-label="Поиск в интернете"
                onClick={() => setWeb((w) => !w)}
                className={cn("relative grid size-8 cursor-pointer place-items-center border pointer-coarse:size-11", web ? "border-acc-line text-acc" : "border-line text-ink3")}
              >
                <Globe size={16} strokeWidth={1.5} />
              </button>
              {mode !== "text" && (
                <Label className="ml-1 text-acc">
                  <Decode key={mode} text={`● ${cfg.label}`} />
                </Label>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label className="tabular-nums">{formatCredits(cfg.costHintMicro, { approx: true })}</Label>
              <span className="hidden border border-line px-2.5 py-1 text-[12.5px] text-ink2 sm:inline">{cfg.model} ▾</span>
              <button
                type="submit"
                aria-label="Отправить"
                disabled={!value.trim()}
                className="relative grid size-8 cursor-pointer place-items-center border border-acc bg-acc text-acc-ink disabled:cursor-not-allowed disabled:opacity-40 pointer-coarse:size-11"
              >
                <ArrowUp size={16} strokeWidth={2} />
                <Hint k="Enter" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {variant === "home" && chips}
      {variant === "home" && (
        <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] text-ink3">
          <span><KeyHint>Enter</KeyHint> отправить</span>
          <span><KeyHint>/</KeyHint> команды</span>
          <span><KeyHint>⌘K</KeyHint> поиск</span>
          <span><KeyHint>Alt</KeyHint> подсказки клавиш</span>
        </p>
      )}
    </form>
  );
}
