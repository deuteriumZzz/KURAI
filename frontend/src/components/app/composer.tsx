"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, ViewTransition, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Bookmark, Brain, Check, Globe, Paperclip, Plus, Sparkles, Square, X } from "lucide-react";
import { usePrefs } from "@/lib/use-prefs";
import { writePrefs } from "@/lib/prefs";
import { ModeIcon } from "@/components/brand/mode-icons";
import { costFactor, defaultParams, enhancePrompt, PARAMS, type ModeParams } from "@/lib/prompt";
import { AnimatePresence, motion } from "motion/react";
import type { Mode } from "@/types/api";
import { MODES, modeById, parseCommand } from "@/lib/modes";
import { defaultModel, modelById, modelsForMode, type ModelInfo } from "@/lib/models";
import { contextUsage } from "@/lib/context";
import { fileError, type FileMeta } from "@/lib/files";
import { formatCredits } from "@/lib/format";
import { readPrefs } from "@/lib/prefs";
import { cn } from "@/lib/cn";
import { retrigger } from "@/lib/motion";
import { Decode } from "@/components/fx/decode";
import { Hatch, Label, Scanline, Segments, useFx } from "@/components/fx/primitives";
import { Hint } from "./hint";
import { ModelPicker } from "./model-picker";
import { VoiceInput } from "./voice-input";
import { AttachmentChips, type Attachment } from "./attachments";

export type Outgoing = { text: string; mode: Mode; model: ModelInfo; web: boolean; think: boolean; params: ModeParams; files: FileMeta[] };

type Props = {
  /** home — центр пустого экрана (чипы под полем, как у Kimi); dock — низ чата (чипы над полем). */
  variant: "home" | "dock";
  initialMode?: Mode;
  initialValue?: string;
  /** Модель из каталога «Все модели» (/app?model=…). */
  initialModel?: string;
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
  /** Ключ черновика: текст сохраняется, пока не отправлен (закрыли вкладку — он на месте). */
  draftKey?: string;
};

let seq = 0;

// превью карточек модели до настоящих картинок: приглушённый свет акцента в разных точках
const THUMB = [
  "bg-s2 bg-[radial-gradient(120%_90%_at_30%_20%,var(--color-acc-soft),transparent_60%)]",
  "bg-s2 bg-[radial-gradient(100%_80%_at_70%_30%,var(--color-acc-soft),transparent_60%)]",
  "bg-s2 bg-[linear-gradient(180deg,transparent,var(--color-acc-soft))]",
  "bg-s2 bg-[radial-gradient(90%_70%_at_50%_100%,var(--color-acc-soft),transparent_65%)]",
];

/** Поле ввода единого чата: режим, модель, голос, файлы, цена и контекст — всё в одном месте. */
export function Composer({
  variant,
  initialMode = "text",
  initialValue = "",
  initialModel,
  onSend,
  busy = false,
  onStop,
  balanceMicro = Infinity,
  contextChars = 0,
  onCompress,
  onEditLast,
  draftKey,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [value, setValue] = useState(initialValue);
  const [web, setWeb] = useState(true);
  const [picked, setPicked] = useState<Partial<Record<Mode, ModelInfo>>>(() => {
    const m = initialModel ? modelById(initialModel) : undefined;
    return m?.modes.includes(initialMode) ? { [initialMode]: m } : {};
  });
  const [preferred, setPreferred] = useState<string | undefined>();
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [recording, setRecording] = useState(false);
  const [think, setThink] = useState(false);
  const [params, setParams] = useState<Partial<Record<Mode, ModeParams>>>({});
  const [pending, setPending] = useState<{ msg: Outgoing; left: number; text: string } | null>(null);
  const prefs = usePrefs();
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

  // черновик: восстановить при открытии, сохранять с задержкой
  useEffect(() => {
    if (!draftKey || initialValue) return;
    try {
      const saved = localStorage.getItem(`kurai:draft:${draftKey}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setValue(saved);
    } catch {}
  }, [draftKey, initialValue]);
  useEffect(() => {
    if (!draftKey) return;
    const t = setTimeout(() => {
      try {
        if (value) localStorage.setItem(`kurai:draft:${draftKey}`, value);
        else localStorage.removeItem(`kurai:draft:${draftKey}`);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [draftKey, value]);

  // «Спросить про это» / «Цитировать» из меню выделения подставляют текст в поле
  useEffect(() => {
    const onPrefill = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      setValue((v) => (v ? `${v}\n${text}` : text));
      requestAnimationFrame(() => document.getElementById("composer-input")?.focus());
    };
    window.addEventListener("kurai:prefill", onPrefill);
    return () => window.removeEventListener("kurai:prefill", onPrefill);
  }, []);

  // отмена отправки: 3 секунды, потом уходит
  useEffect(() => {
    if (!pending) return;
    if (pending.left <= 0) {
      onSend?.(pending.msg);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- завершение таймера отправки
      setPending(null);
      return;
    }
    const t = setTimeout(() => setPending((p) => (p ? { ...p, left: p.left - 1 } : p)), 1000);
    return () => clearTimeout(t);
  }, [pending, onSend]);

  // перетаскивание файлов на всё окно
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && (e.dataTransfer.types.includes("Files") || e.dataTransfer.types.includes("application/x-kurai-image"));
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
      // картинка из ответа, перетащенная в поле, становится референсом
      const url = e.dataTransfer?.getData("application/x-kurai-image");
      if (url)
        void fetch(url)
          .then((r) => r.blob())
          .then((b) => addFiles([new File([b], `референс-${Date.now()}.${b.type.includes("svg") ? "svg" : "png"}`, { type: b.type || "image/svg+xml" })]));
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
    // импульс по сетке фона от поля ввода — отмечает реальное событие «отправлено»
    const r = boxRef.current?.getBoundingClientRect();
    if (r) window.dispatchEvent(new CustomEvent("kurai:pulse", { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }));
    if (onSend && prefs.undoSend) {
      setPending({ msg, left: 3, text: value });
      return;
    }
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

  // чипы инструментов под полем (главная): повторный клик возвращает обычный чат
  const chips = (
    <div role="radiogroup" aria-label="Инструмент" className="flex flex-wrap justify-center gap-2 md:flex-nowrap">
      {MODES.filter((m) => m.id !== "text").map((m, i) => {
        const on = m.id === mode;
        return (
          <motion.button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => switchMode(on ? "text" : m.id)}
            initial={{ y: 8 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2 + i * 0.04, duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              "inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-2 rounded-(--radius-field) px-3.5 text-[14px] transition-colors duration-(--dur-fast) pointer-coarse:h-11",
              on ? "bg-acc-soft text-acc" : "bg-s1 text-ink2 hover:bg-s2 hover:text-ink",
            )}
          >
            <ModeIcon mode={m.id} size={16} className={on ? "" : "text-ink3"} />
            {m.label}
          </motion.button>
        );
      })}
    </div>
  );

  const paramsRow = (PARAMS[mode] ?? []).length > 0 && (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
      {(PARAMS[mode] ?? []).map((p) => (
        <div key={p.key} role="radiogroup" aria-label={p.label} className="flex shrink-0 items-center gap-2">
          <span className="text-[13px] text-ink3">{p.label}</span>
          <span className="inline-flex rounded-(--radius-field) bg-s1">
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
                    "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-(--radius-field) px-2.5 text-[12.5px] whitespace-nowrap transition-colors duration-(--dur-fast) pointer-coarse:h-9",
                    on ? "bg-s3 text-ink" : "text-ink2 hover:text-ink",
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
          </span>
        </div>
      ))}
    </div>
  );

  // «ящик инструмента» над полем: Syntx внутри Kimi — выбор модели карточками и параметры
  const drawer = (
    <AnimatePresence initial={false}>
      {variant === "home" && mode !== "text" && (
        <motion.div
          key="drawer"
          initial={{ height: 0, y: 8 }}
          animate={{ height: "auto", y: 0 }}
          exit={{ height: 0, y: 8 }}
          transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-3.5 rounded-(--radius-field) bg-g1 p-3.5 shadow-[inset_0_0_0_1px_var(--color-hair)]">
            <div className="flex items-center justify-between text-[13.5px] text-ink2">
              <span>
                <span className="text-ink">{cfg.label}</span> · выберите модель
              </span>
              <Link href={`/app/models?type=${mode === "research" || mode === "slides" ? "text" : mode}`} className="text-ink3 hover:text-ink">
                Все модели ›
              </Link>
            </div>
            <div role="radiogroup" aria-label="Модель" className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {modelsForMode(mode).slice(0, 4).map((m, i) => {
                const on = m.id === model.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPicked((p) => ({ ...p, [mode]: m }))}
                    className={cn(
                      "cursor-pointer overflow-hidden rounded-(--radius-field) text-left transition-colors duration-(--dur-fast)",
                      on ? "bg-s2 shadow-[inset_0_0_0_1px_var(--color-acc-line)]" : "bg-s1 hover:bg-s2",
                    )}
                  >
                    <span aria-hidden="true" className={cn("block aspect-[16/10]", THUMB[i % THUMB.length])} />
                    <span className="block p-2.5">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13.5px] text-ink">{m.name}</span>
                        <span className="shrink-0 font-mono text-[11.5px] text-ink3">{formatCredits(m.priceHintMicro, { approx: true })}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-1 block text-[12px] text-ink3">{m.note}</span>
                      <Segments value={m.stats.quality / 10} label={`Качество: ${m.stats.quality} из 10`} className="mt-2 [&>i]:h-[3px]" />
                    </span>
                  </button>
                );
              })}
            </div>
            {paramsRow}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const menuId = `plus-${variant}`;
  const iconBtn = "relative grid size-8 cursor-pointer place-items-center rounded-(--radius-field) hover:bg-s2 pointer-coarse:size-11";

  return (
    <form onSubmit={submit} className="flex w-full max-w-3xl flex-col gap-3">
      {short && (
        <Hatch>
          Недостаточно кредитов для «{model.name}»: нужно {formatCredits(cost)}, на балансе {formatCredits(balanceMicro)}.{" "}
          <Link href="/app/billing#top-up" className="underline underline-offset-2">
            Пополнить
          </Link>
        </Hatch>
      )}
      {pending && (
        <div role="status" className="flex items-center justify-between gap-3 border border-acc-line bg-g1 px-3 py-2 text-[13px]">
          <span className="font-mono text-acc">› отправка через {pending.left} с</span>
          <button
            type="button"
            onClick={() => {
              setValue(pending.text);
              setPending(null);
            }}
            className="cursor-pointer text-ink2 underline underline-offset-2 hover:text-ink"
          >
            Отменить
          </button>
        </div>
      )}
      {value === "/" && (
        <div role="listbox" aria-label="Команды и шаблоны" className="flex max-h-64 flex-col overflow-y-auto bg-g2 py-1 shadow-(--shadow-float)">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="option" aria-selected="false" onClick={() => { switchMode(m.id); setValue(""); }} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-left text-[13px] text-ink2 hover:bg-g2 hover:text-ink">
              <span className="flex items-center gap-2"><ModeIcon mode={m.id} size={14} /> {m.label}</span>
              <span className="font-mono text-[11px] text-ink3">{m.command}</span>
            </button>
          ))}
          {prefs.templates.length > 0 && <span className="px-3 pt-2 pb-1 font-mono text-[10.5px] tracking-[0.1em] text-ink3 uppercase">Мои шаблоны</span>}
          {prefs.templates.map((t) => (
            <button key={t} type="button" role="option" aria-selected="false" onClick={() => setValue(t)} className="cursor-pointer truncate px-3 py-1.5 text-left text-[13px] text-ink2 hover:bg-g2 hover:text-ink">
              ☆ {t}
            </button>
          ))}
        </div>
      )}
      {error && (
        <div ref={errRef} role="alert" className="flex items-start justify-between gap-3 border border-err/45 bg-err-soft px-3 py-2 text-[13px] text-err">
          {error}
          <button type="button" onClick={() => setError(null)} className="cursor-pointer text-[12px] underline">
            Понятно
          </button>
        </div>
      )}
      {drawer}
      <ViewTransition name="composer">
      <div className="fx-brackets">
        <div
          ref={boxRef}
          data-mode={mode}
          className={cn("fx-chamfer fx-texture fx-rim bg-g2 shadow-(--shadow-float) [--ch:var(--chamfer-lg)] focus-within:shadow-[inset_0_0_0_1px_var(--color-acc-line),var(--shadow-float)]", variant === "home" ? "px-[18px] pt-[18px] pb-3.5" : "px-3.5 pt-3 pb-2.5")}
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
          {variant === "dock" && paramsRow && <div className="mb-2">{paramsRow}</div>}
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
            className={cn("block max-h-60 w-full resize-none bg-transparent text-ink field-sizing-content outline-none placeholder:text-ink3", variant === "home" ? "min-h-14 text-[16px]" : "min-h-7 text-[15px]")}
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
              <button
                type="button"
                popoverTarget={menuId}
                aria-label="Файл, режимы и настройки запроса"
                data-tip="Файл · режим · веб · думать дольше"
                style={{ anchorName: `--${menuId}` } as React.CSSProperties}
                className={cn(iconBtn, "text-ink2 hover:text-ink")}
              >
                <Plus size={18} strokeWidth={1.5} />
              </button>
              <div
                id={menuId}
                popover="auto"
                onClick={(e) => (e.target as Element).closest("button") && e.currentTarget.hidePopover()}
                style={{ positionAnchor: `--${menuId}`, positionArea: "block-end span-inline-end", positionTryFallbacks: "flip-block" } as React.CSSProperties}
                className="inset-auto m-0 my-2 w-64 rounded-(--radius-field) border-0 bg-g2 p-1.5 text-ink shadow-(--shadow-float)"
              >
                <MenuItem icon={<Paperclip size={16} strokeWidth={1.5} />} onClick={() => fileInput.current?.click()}>
                  Файл или фото
                </MenuItem>
                <MenuItem icon={<Globe size={16} strokeWidth={1.5} />} on={web} onClick={() => setWeb((w) => !w)}>
                  Поиск в интернете
                </MenuItem>
                {canThink && (
                  <MenuItem icon={<Brain size={16} strokeWidth={1.5} />} on={think} onClick={() => setThink((t) => !t)}>
                    Думать дольше <span className="text-ink3">· ×1,7</span>
                  </MenuItem>
                )}
                {value.trim().length > 3 && (
                  <MenuItem
                    icon={<Sparkles size={16} strokeWidth={1.5} />}
                    onClick={() => {
                      setValue((v) => enhancePrompt(v, mode, modeParams));
                      retrigger(boxRef.current, "fx-flicker-border");
                    }}
                  >
                    Улучшить промпт
                  </MenuItem>
                )}
                {value.trim().length > 10 && !prefs.templates.includes(value.trim()) && (
                  <MenuItem icon={<Bookmark size={16} strokeWidth={1.5} />} onClick={() => writePrefs({ templates: [value.trim(), ...prefs.templates].slice(0, 20) })}>
                    Сохранить как шаблон
                  </MenuItem>
                )}
                <span className="my-1 block h-px bg-hair" aria-hidden="true" />
                {MODES.map((m) => (
                  <MenuItem key={m.id} icon={<ModeIcon mode={m.id} size={16} />} on={m.id === mode} onClick={() => switchMode(m.id)} hint={m.command}>
                    {m.label}
                  </MenuItem>
                ))}
              </div>
              <VoiceInput
                onActiveChange={onVoiceActive}
                onText={(t) => setValue(t)}
                onAudio={(f) => addFiles([f])}
                onError={(m) => {
                  setError(m);
                  glitch();
                }}
              />
              {mode !== "text" && (
                <span className="ml-1 inline-flex h-[30px] items-center gap-2 rounded-(--radius-field) bg-acc-soft pr-1 pl-2.5 text-[13px] text-acc">
                  <ModeIcon mode={mode} size={14} />
                  {cfg.label}
                  <button type="button" onClick={() => switchMode("text")} aria-label={`Убрать «${cfg.label}»`} className="grid size-6 cursor-pointer place-items-center rounded-(--radius-field) hover:bg-acc-soft">
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </span>
              )}
              {think && canThink && (
                <span className="ml-1 inline-flex h-[30px] items-center gap-2 rounded-(--radius-field) bg-s2 pr-1 pl-2.5 text-[13px] text-ink2">
                  <Brain size={14} strokeWidth={1.5} />
                  Думать дольше
                  <button type="button" onClick={() => setThink(false)} aria-label="Выключить «Думать дольше»" className="grid size-6 cursor-pointer place-items-center rounded-(--radius-field) hover:bg-s3">
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </span>
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
              <AnimatePresence mode="popLayout" initial={false}>
              {busy ? (
                <motion.button key="stop" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.16 }} type="button" onClick={onStop} aria-label="Остановить ответ" className={cn(iconBtn, "border-acc-line text-acc")}>
                  <Square size={12} strokeWidth={2} fill="currentColor" />
                  <Hint k="Esc" />
                </motion.button>
              ) : (
                <motion.button
                  key="send"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  type="submit"
                  aria-label="Отправить"
                  disabled={(!value.trim() && files.length === 0) || short || uploading || recording}
                  className={cn(iconBtn, "border-acc bg-acc text-acc-ink disabled:cursor-not-allowed disabled:opacity-40")}
                >
                  <ArrowUp size={16} strokeWidth={2} />
                  <Hint k="Enter" />
                </motion.button>
              )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      </ViewTransition>
      {usage >= 0.8 && onCompress && (
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-warn">
          Чат длинный — ответы дорожают.
          <button type="button" onClick={onCompress} className="cursor-pointer underline underline-offset-2">
            Сжать историю
          </button>
        </p>
      )}
      {variant === "home" && chips}
      {dragging && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-3 z-50 grid place-items-center overflow-hidden border border-dashed border-acc bg-bg/80">
          <Scanline active />
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

function MenuItem({ icon, on, hint, onClick, children }: { icon: React.ReactNode; on?: boolean; hint?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role={on === undefined ? undefined : "menuitemcheckbox"}
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-(--radius-field) px-2.5 text-left text-[13.5px] hover:bg-s2 pointer-coarse:h-11",
        on ? "text-ink" : "text-ink2 hover:text-ink",
      )}
    >
      <span className={on ? "text-acc" : "text-ink3"}>{icon}</span>
      <span className="flex-1">{children}</span>
      {hint && <span className="font-mono text-[11px] text-ink3">{hint}</span>}
      {on && <Check size={14} strokeWidth={1.5} className="text-acc" />}
    </button>
  );
}
