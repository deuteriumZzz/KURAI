"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, AudioLines, Brain, Clapperboard, Globe, Image as ImageIcon, MessageSquare, Paperclip, Presentation, Sparkles, Square, Telescope } from "lucide-react";
import { costFactor, defaultParams, enhancePrompt, PARAMS, type ModeParams } from "@/lib/prompt";
import { motion } from "motion/react";
import type { Mode } from "@/types/api";
import { MODES, modeById, parseCommand } from "@/lib/modes";
import { defaultModel, type ModelInfo } from "@/lib/models";
import { contextUsage } from "@/lib/context";
import { fileError, type FileMeta } from "@/lib/files";
import { formatCredits } from "@/lib/format";
import { readPrefs } from "@/lib/prefs";
import { cn } from "@/lib/cn";
import { retrigger } from "@/lib/motion";
import { Decode } from "@/components/fx/decode";
import { Hatch, KeyHint, Label, Segments, useFx } from "@/components/fx/primitives";
import { Hint } from "./hint";
import { ModelPicker } from "./model-picker";
import { VoiceInput } from "./voice-input";
import { AttachmentChips, type Attachment } from "./attachments";

const MODE_ICON = { text: MessageSquare, image: ImageIcon, video: Clapperboard, audio: AudioLines, research: Telescope, slides: Presentation } as const;

export type Outgoing = { text: string; mode: Mode; model: ModelInfo; web: boolean; think: boolean; params: ModeParams; files: FileMeta[] };

type Props = {
  /** home — центр пустого экрана (чипы под полем, как у Kimi); dock — низ чата (чипы над полем). */
  variant: "home" | "dock";
  initialMode?: Mode;
  initialValue?: string;
  /** Отправка внутри чата; без неё главная ведёт в чат. */
  onSend?: (msg: Outgoing) => void;
  /** Идёт ответ — кнопка отправки становится «Стоп». */
  busy?: boolean;
  onStop?: () => void;
  /** Баланс пользователя: если меньше оценки запроса — штриховка и отправка недоступна. */
  balanceMicro?: number;
  /** Сколько символов уже в активной ветке — для шкалы контекста. */
  contextChars?: number;
  onCompress?: () => void;
  /** ↑ в пустом поле — изменить последнее своё сообщение. */
  onEditLast?: () => void;
};

let seq = 0;

/** Поле ввода единого чата: режим, модель, голос, файлы, цена и контекст — всё в одном месте. */
export function Composer({
  variant,
  initialMode = "text",
  initialValue = "",
  onSend,
  busy = false,
  onStop,
  balanceMicro = Infinity,
  contextChars = 0,
  onCompress,
  onEditLast,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [value, setValue] = useState(initialValue);
  const [web, setWeb] = useState(true);
  const [picked, setPicked] = useState<Partial<Record<Mode, ModelInfo>>>({});
  const [preferred, setPreferred] = useState<string | undefined>();
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [recording, setRecording] = useState(false);
  const [think, setThink] = useState(false);
  const [params, setParams] = useState<Partial<Record<Mode, ModeParams>>>({});
  const boxRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const voiceBase = useRef("");
  const [errRef, glitch] = useFx<HTMLDivElement>("fx-glitch");

  // настройки из localStorage доступны только в браузере
  useEffect(() => {
    const p = readPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferred(p.model);
    setWeb(p.web);
  }, []);

  const cfg = modeById(mode);
  const model = picked[mode] ?? defaultModel(mode, preferred);
  const modeParams = params[mode] ?? defaultParams(mode);
  const canThink = mode === "text" || mode === "research";
  const cost = Math.round((mode === "research" || mode === "slides" ? cfg.costHintMicro : model.priceHintMicro) * costFactor(mode, modeParams) * (think && canThink ? 1.7 : 1));
  const short = cost > balanceMicro;
  const usage = contextUsage(contextChars, model.contextK);
  const uploading = files.some((f) => f.progress < 1);

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

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      for (const f of Array.from(list)) {
        const err = fileError({ name: f.name, size: f.size, type: f.type });
        if (err) {
          setError(err);
          glitch();
          continue;
        }
        const id = `f${seq++}`;
        const previewUrl = f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined;
        setFiles((fs) => [...fs, { id, name: f.name, size: f.size, type: f.type, progress: 0, previewUrl }]);
        // тестовые данные: загрузка в S3 по подписанной ссылке появится с бэкендом
        const t = setInterval(() => {
          setFiles((fs) => fs.map((x) => (x.id === id ? { ...x, progress: Math.min(1, x.progress + 0.25) } : x)));
        }, 150);
        setTimeout(() => clearInterval(t), 700);
      }
    },
    [glitch],
  );

  // перетаскивание файлов на всё окно
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [addFiles]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if ((!value.trim() && files.length === 0) || busy || short || uploading || recording) return;
    const msg: Outgoing = { text: value.trim(), mode, model, web, think: think && canThink, params: modeParams, files: files.map(({ name, size, type }) => ({ name, size, type })) };
    setValue("");
    setFiles([]);
    setError(null);
    if (onSend) onSend(msg);
    // тестовые данные: с главной запрос открывает демонстрационный чат
    else router.push("/app/c/7f3a");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
    if (e.key === "ArrowUp" && value === "" && onEditLast) {
      e.preventDefault();
      onEditLast();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      addFiles(e.clipboardData.files);
    }
  }

  const onVoiceActive = useCallback((a: boolean) => {
    setRecording(a);
    if (a) voiceBase.current = "";
  }, []);

  const chips = (
    <div role="radiogroup" aria-label="Режим" className={cn("isolate flex flex-wrap gap-2", variant === "home" ? "justify-center" : "")}>
      {MODES.map((m, i) => {
        const Icon = MODE_ICON[m.id];
        const on = m.id === mode;
        return (
          <motion.button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => switchMode(m.id)}
            initial={variant === "home" ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: variant === "home" ? 0.25 + i * 0.04 : 0, duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              "fx-hover relative inline-flex cursor-pointer items-center gap-1.5 border px-3 py-1.5 text-[13px] transition-colors duration-(--dur-fast) pointer-coarse:py-2.5",
              on ? "border-acc-line text-acc" : "border-line bg-g1 text-ink2 hover:border-line2 hover:text-ink",
            )}
          >
            {on && (
              <motion.span
                layoutId={`mode-pill-${variant}`}
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-acc-soft"
                transition={{ type: "tween", duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              />
            )}
            <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
            {m.label}
            {variant === "dock" && <span className="font-mono text-[10px] text-ink3">{m.command}</span>}
          </motion.button>
        );
      })}
    </div>
  );

  const iconBtn = "relative grid size-8 cursor-pointer place-items-center border pointer-coarse:size-11";

  return (
    <form onSubmit={submit} className="flex w-full max-w-3xl flex-col gap-3">
      {variant === "dock" && chips}
      {short && (
        <Hatch>
          Недостаточно кредитов для «{model.name}»: нужно {formatCredits(cost)}, на балансе {formatCredits(balanceMicro)}.{" "}
          <Link href="/app/billing#top-up" className="underline underline-offset-2">
            Пополнить
          </Link>
        </Hatch>
      )}
      {error && (
        <div ref={errRef} role="alert" className="flex items-start justify-between gap-3 border border-err/45 bg-err-soft px-3 py-2 text-[13px] text-err">
          {error}
          <button type="button" onClick={() => setError(null)} className="cursor-pointer text-[12px] underline">
            Понятно
          </button>
        </div>
      )}
      <div className="fx-brackets">
        <div
          ref={boxRef}
          className="fx-chamfer border border-line2 bg-g1 px-3.5 pt-3 pb-2.5 [--ch:var(--chamfer-lg)] focus-within:border-acc-line focus-within:shadow-[0_0_0_3px_var(--color-acc-soft)]"
        >
          <AttachmentChips
            items={files}
            onRemove={(id) =>
              setFiles((fs) => {
                const f = fs.find((x) => x.id === id);
                if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
                return fs.filter((x) => x.id !== id);
              })
            }
          />
          {(PARAMS[mode] ?? []).length > 0 && (
            <div className="-mx-1 mb-2 flex gap-3 overflow-x-auto px-1 pb-1">
              {(PARAMS[mode] ?? []).map((p) => (
                <div key={p.key} role="radiogroup" aria-label={p.label} className="flex shrink-0 items-center gap-1">
                  <span className="mr-1 font-mono text-[10.5px] tracking-[0.08em] text-ink3 uppercase">{p.label}</span>
                  {p.options.map((o) => {
                    const on = modeParams[p.key] === o;
                    return (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setParams((ps) => ({ ...ps, [mode]: { ...modeParams, [p.key]: o } }))}
                        className={cn(
                          "inline-flex h-7 cursor-pointer items-center gap-1.5 border px-2 font-mono text-[11.5px] whitespace-nowrap transition-colors duration-(--dur-fast) pointer-coarse:h-9",
                          on ? "border-acc-line bg-acc-soft text-acc" : "border-line text-ink2 hover:border-line2 hover:text-ink",
                        )}
                      >
                        {p.key === "aspect" && (
                          <span
                            aria-hidden="true"
                            className="inline-block border border-current"
                            style={{ width: 12 * Math.min(1, Number(o.split(":")[0]) / Number(o.split(":")[1])), height: 12 * Math.min(1, Number(o.split(":")[1]) / Number(o.split(":")[0])) }}
                          />
                        )}
                        {o}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          <label htmlFor="composer-input" className="fx-sr">
            Запрос · режим «{cfg.label}» · модель {model.name}
          </label>
          <textarea
            id="composer-input"
            rows={variant === "home" ? 2 : 1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={recording ? "Говорите — текст появится здесь…" : cfg.placeholder}
            className="block max-h-60 min-h-7 w-full resize-none bg-transparent text-[15px] text-ink field-sizing-content outline-none placeholder:text-ink3"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                accept="image/*,application/pdf,text/*,audio/*,.docx,.xlsx,.doc,.xls,.csv"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button type="button" onClick={() => fileInput.current?.click()} aria-label="Прикрепить файл" className={cn(iconBtn, "border-line text-ink2 hover:text-ink")}>
                <Paperclip size={16} strokeWidth={1.5} />
              </button>
              <VoiceInput
                onActiveChange={onVoiceActive}
                onText={(t) => setValue(t)}
                onAudio={(f) => addFiles([f])}
                onError={(m) => {
                  setError(m);
                  glitch();
                }}
              />
              {canThink && (
                <button
                  type="button"
                  aria-pressed={think}
                  aria-label="Думать дольше: модель рассуждает перед ответом, дороже примерно в 1,7 раза"
                  title="Думать дольше"
                  onClick={() => setThink((t) => !t)}
                  className={cn(iconBtn, think ? "border-acc-line text-acc" : "border-line text-ink3 hover:text-ink")}
                >
                  <Brain size={16} strokeWidth={1.5} />
                </button>
              )}
              {value.trim().length > 3 && (
                <button
                  type="button"
                  aria-label="Улучшить промпт"
                  title="Улучшить промпт"
                  onClick={() => {
                    setValue((v) => enhancePrompt(v, mode, modeParams));
                    retrigger(boxRef.current, "fx-flicker-border");
                  }}
                  className={cn(iconBtn, "border-line text-ink2 hover:border-acc-line hover:text-acc")}
                >
                  <Sparkles size={16} strokeWidth={1.5} />
                </button>
              )}
              <button
                type="button"
                aria-pressed={web}
                aria-label="Поиск в интернете"
                onClick={() => setWeb((w) => !w)}
                className={cn(iconBtn, web ? "border-acc-line text-acc" : "border-line text-ink3")}
              >
                <Globe size={16} strokeWidth={1.5} />
              </button>
              {mode !== "text" && (
                <Label className="ml-1 hidden text-acc sm:inline">
                  <Decode key={mode} text={`● ${cfg.label}`} />
                </Label>
              )}
            </div>
            <div className="flex items-center gap-2">
              {contextChars > 0 && model.contextK > 0 && (
                <span className="hidden items-center gap-1.5 sm:flex" title="Заполненность контекста модели">
                  <Segments value={usage} count={8} tone={usage >= 0.8 ? "warn" : "acc"} label="Заполненность контекста" className="w-14" />
                  <span className={cn("font-mono text-[11px] tabular-nums", usage >= 0.8 ? "text-warn" : "text-ink3")}>{Math.round(usage * 100)}%</span>
                </span>
              )}
              <Label className="tabular-nums">{formatCredits(cost, { approx: true })}</Label>
              <ModelPicker mode={mode} value={model} onChange={(m) => setPicked((p) => ({ ...p, [mode]: m }))} />
              {busy ? (
                <button type="button" onClick={onStop} aria-label="Остановить ответ" className={cn(iconBtn, "border-acc-line text-acc")}>
                  <Square size={12} strokeWidth={2} fill="currentColor" />
                  <Hint k="Esc" />
                </button>
              ) : (
                <button
                  type="submit"
                  aria-label="Отправить"
                  disabled={(!value.trim() && files.length === 0) || short || uploading || recording}
                  className={cn(iconBtn, "border-acc bg-acc text-acc-ink disabled:cursor-not-allowed disabled:opacity-40")}
                >
                  <ArrowUp size={16} strokeWidth={2} />
                  <Hint k="Enter" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {usage >= 0.8 && onCompress && (
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-warn">
          Чат длинный — ответы дорожают.
          <button type="button" onClick={onCompress} className="cursor-pointer underline underline-offset-2">
            Сжать историю
          </button>
        </p>
      )}
      {variant === "home" && chips}
      {variant === "home" && (
        <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] text-ink3">
          <span><KeyHint>Enter</KeyHint> отправить</span>
          <span><KeyHint>/</KeyHint> команды</span>
          <span><KeyHint>⌘K</KeyHint> поиск</span>
          <span><KeyHint>Alt</KeyHint> подсказки клавиш</span>
        </p>
      )}
      {dragging && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-3 z-50 grid place-items-center border border-dashed border-acc bg-bg/80">
          <div className="flex flex-col items-center gap-2 text-center">
            <Decode text="› ПРИЁМ ДАННЫХ" className="font-mono text-[12px] tracking-[0.14em] text-acc" />
            <p className="font-display text-2xl font-light">Отпустите, чтобы прикрепить</p>
            <Label>фото · PDF · DOCX · XLSX · аудио · до 50 МБ</Label>
          </div>
        </div>
      )}
    </form>
  );
}
