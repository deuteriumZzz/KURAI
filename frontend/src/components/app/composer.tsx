"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Bookmark, Brain, Check, Globe, Paperclip, SlidersHorizontal, Sparkles, Square, X } from "lucide-react";
import { usePrefs } from "@/lib/use-prefs";
import { writePrefs } from "@/lib/prefs";
import { ModeIcon } from "@/components/brand/mode-icons";
import { apiOptions, costFactor, defaultParams, enhancePrompt, LIVE_PARAMS, PARAMS, type ModeParams } from "@/lib/prompt";
import { AnimatePresence, motion } from "motion/react";
import type { Mode } from "@/types/api";
import { MODES, modeById, parseCommand } from "@/lib/modes";
import { defaultModel, fromCatalogModel, modelById, modelsForMode, type ModelInfo } from "@/lib/models";
import { contextUsage } from "@/lib/context";
import { fileError, type FileMeta } from "@/lib/files";
import { formatCredits } from "@/lib/format";
import { readPrefs } from "@/lib/prefs";
import { cn } from "@/lib/cn";
import { retrigger } from "@/lib/motion";
import { Hatch, Segments, useFx } from "@/components/fx/primitives";
import { Hint } from "./hint";
import { ModelPicker } from "./model-picker";
import { VoiceInput } from "./voice-input";
import { AttachmentChips, type Attachment } from "./attachments";
import { kuraiApi, type KuraiCapability } from "@/lib/kurai-api";

export type Outgoing = { text: string; mode: Mode; model: ModelInfo; compareModels?: ModelInfo[]; web: boolean; think: boolean; params: ModeParams; files: FileMeta[] };

type Props = {
  /** home — центр пустого экрана (чипы под полем, как у Kimi); dock — низ чата (чипы над полем). */
  variant: "home" | "dock";
  initialMode?: Mode;
  initialValue?: string;
  /** Модель из каталога «Все модели» (/app?model=…). */
  initialModel?: string;
  /** Явно выбранные маршруты из реестра моделей для Compare Run. */
  initialCompareModels?: string[];
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

/** Поле ввода единого чата: режим, модель, голос, файлы, цена и контекст — всё в одном месте. */
export function Composer({
  variant,
  initialMode = "text",
  initialValue = "",
  initialModel,
  initialCompareModels,
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
  const [comparisonIds, setComparisonIds] = useState<string[]>(() =>
    [...new Set(initialCompareModels ?? [])].slice(0, 3),
  );
  const [preferred, setPreferred] = useState<string | undefined>();
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [recording, setRecording] = useState(false);
  const [think, setThink] = useState(false);
  const [params, setParams] = useState<Partial<Record<Mode, ModeParams>>>({});
  const [pending, setPending] = useState<{ msg: Outgoing; left: number; text: string } | null>(null);
  const [launching, setLaunching] = useState(false);
  const [catalog, setCatalog] = useState<ModelInfo[]>([]);
  const [capabilities, setCapabilities] = useState<KuraiCapability[] | null>(null);
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

  useEffect(() => {
    if (!kuraiApi) return;
    void kuraiApi.capabilities().then((next) => setCapabilities(next.modes)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!kuraiApi) return;
    void kuraiApi.models(mode).then((models) => {
      const next = models.map(fromCatalogModel);
      setCatalog(next);
      setPicked((current) =>
        Object.fromEntries(
          Object.entries(current).map(([key, selected]) => [key, next.some((item) => item.id === selected.id) ? selected : next.find((item) => item.id === "openrouter/auto") ?? selected]),
        ) as Partial<Record<Mode, ModelInfo>>,
      );
    }).catch(() => undefined);
  }, [mode]);

  const cfg = modeById(mode);
  const liveModels = catalog.filter((item) => item.modes.includes(mode));
  const currentCapability = capabilities?.find((capability) => capability.id === mode);
  const liveModeUnavailable = Boolean(kuraiApi && capabilities && !currentCapability?.available);
  const liveModelCatalogPending = Boolean(kuraiApi && capabilities && currentCapability?.available && liveModels.length === 0);
  const availableModels = kuraiApi && capabilities ? liveModels : liveModels.length > 0 ? liveModels : modelsForMode(mode);
  const model = picked[mode] ?? availableModels.find((item) => item.id === preferred) ?? availableModels[0] ?? defaultModel(mode, preferred);
  const comparisonModels = comparisonIds.map((id) => availableModels.find((candidate) => candidate.id === id)).filter((candidate): candidate is ModelInfo => Boolean(candidate));
  const comparisonActive = comparisonModels.length >= 2 && (mode === "text" || mode === "research");
  const modeParams = params[mode] ?? defaultParams(mode);
  const canThink = mode === "text" || mode === "research";
  const baseCost = comparisonActive ? comparisonModels.reduce((total, candidate) => total + candidate.priceHintMicro, 0) : mode === "research" || mode === "slides" ? cfg.costHintMicro : model.priceHintMicro;
  const cost = Math.round(baseCost * costFactor(mode, modeParams) * (think && canThink ? 1.7 : 1));
  const short = cost > balanceMicro;
  const usage = contextUsage(contextChars, model.contextK);
  const uploading = files.some((f) => f.progress < 1);
  const isBusy = busy || launching;

  function switchMode(next: Mode) {
    if (next === mode) return;
    const target = capabilities?.find((capability) => capability.id === next);
    if (kuraiApi && capabilities && !target?.available) {
      setError(`Режим «${modeById(next).label}» ещё не подключён к этому серверу.`);
      glitch();
      return;
    }
    if (next !== "text" && next !== "research") setComparisonIds([]);
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
        if (kuraiApi) {
          void kuraiApi.uploadFile(f).then((asset) => {
            setFiles((fs) => fs.map((item) => (item.id === id ? { ...item, progress: 1, assetId: asset.id } : item)));
          }).catch((uploadError) => {
            setFiles((fs) => fs.filter((item) => item.id !== id));
            setError(uploadError instanceof Error ? uploadError.message : `Не удалось загрузить «${f.name}».`);
            glitch();
          });
        } else {
          const t = setInterval(() => setFiles((fs) => fs.map((item) => (item.id === id ? { ...item, progress: Math.min(1, item.progress + 0.25) } : item))), 150);
          setTimeout(() => clearInterval(t), 700);
        }
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
    if ((!value.trim() && files.length === 0) || isBusy || short || uploading || recording) return;
    if (liveModeUnavailable || liveModelCatalogPending) {
      const detail = liveModeUnavailable ? `Режим «${cfg.label}» ещё не подключён к этому серверу.` : "Каталог моделей ещё синхронизируется. Повторите через несколько секунд.";
      setError(detail);
      glitch();
      return;
    }
    const msg: Outgoing = { text: value.trim(), mode, model, ...(comparisonActive ? { compareModels: comparisonModels } : {}), web, think: think && canThink, params: modeParams, files: files.map(({ name, size, type, assetId }) => ({ name, size, type, assetId })) };
    setValue("");
    setFiles([]);
    setError(null);
    // route handoff: одна волна по верхней грани поля — только после реальной отправки
    retrigger(boxRef.current, "k-sweep");
    if (onSend && prefs.undoSend) {
      setPending({ msg, left: 3, text: value });
      return;
    }
    if (onSend) onSend(msg);
    else if (kuraiApi) {
      const api = kuraiApi;
      setLaunching(true);
      void (async () => {
        try {
          const chat = await api.createChat(msg.text.slice(0, 80) || modeById(msg.mode).label);
          const attachmentIds = msg.files.flatMap((file) => file.assetId ? [file.assetId] : []);
          const options = apiOptions(msg.mode, msg);
          if (msg.compareModels && (msg.mode === "text" || msg.mode === "research")) {
            const routes = await Promise.all(msg.compareModels.map(async (candidate) => {
              const modelId = candidate.id === "auto" ? "openrouter/auto" : candidate.id;
              const quote = await api.quote(msg.mode, msg.text, modelId, attachmentIds, options);
              return { modelId, quoteId: quote.quoteId };
            }));
            await api.startCompareRun({ chatId: chat.id, mode: msg.mode, text: msg.text, attachmentIds, options, routes, idempotencyKey: crypto.randomUUID() });
          } else {
            const quote = await api.quote(msg.mode, msg.text, msg.model.id === "auto" ? "openrouter/auto" : msg.model.id, attachmentIds, options);
            await api.startRun({
              chatId: chat.id,
              quoteId: quote.quoteId,
              mode: msg.mode,
              modelId: msg.model.id === "auto" ? "openrouter/auto" : msg.model.id,
              text: msg.text,
              attachmentIds,
              options,
              idempotencyKey: crypto.randomUUID(),
            });
          }
          router.push(`/app/c/${chat.id}`);
        } catch (launchError) {
          setError(launchError instanceof Error ? launchError.message : "Не удалось запустить задачу.");
          glitch();
        } finally {
          setLaunching(false);
        }
      })();
    } else router.push("/app/c/7f3a");
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

  // режимы — компактный горизонтальный ряд под полем главной (не стена карточек)
  const modeRow = (
    <div role="radiogroup" aria-label="Режим задачи" className="flex flex-wrap items-center justify-center gap-1">
      {MODES.map((m) => {
        const on = m.id === mode;
        const unavailable = Boolean(kuraiApi && capabilities && m.id !== "text" && !capabilities.find((capability) => capability.id === m.id)?.available);
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={unavailable}
            onClick={() => switchMode(m.id)}
            className="k-tool h-9 px-3 text-[13px]"
          >
            <ModeIcon mode={m.id} size={15} className={on ? undefined : "text-ink3"} />
            {m.label}
            {unavailable && <span className="k-index">скоро</span>}
          </button>
        );
      })}
    </div>
  );

  // в рабочем режиме показываем только параметры, которые сервер действительно исполняет
  const visibleParams = (PARAMS[mode] ?? []).filter((p) => !kuraiApi || (LIVE_PARAMS[mode] ?? []).includes(p.key));
  const paramsRow = visibleParams.length > 0 && (
    <div className="-mx-1 flex gap-5 overflow-x-auto px-1 pb-1">
      {visibleParams.map((p) => (
        <div key={p.key} role="radiogroup" aria-label={p.label} className="flex shrink-0 items-center gap-2">
          <span className="text-[12.5px] text-ink3">{p.label}</span>
          <span className="inline-flex rounded-(--radius-sm) border border-line p-0.5">
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
                    "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-(--radius-xs) px-2.5 text-[12.5px] whitespace-nowrap transition-colors duration-(--dur-fast) pointer-coarse:h-9",
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

  const home = variant === "home";
  // подписи инструментов прячутся по ширине самого поля (container query), а не окна
  const toolLabel = home ? "@max-xl:hidden" : "@max-3xl:hidden";
  const menuId = `tools-${variant}`;
  const canSend = (value.trim() !== "" || files.length > 0) && !short && !uploading && !recording;
  const picker = comparisonActive ? (
    <span className={cn("inline-flex items-center rounded-(--radius-sm) border border-violet-line bg-violet-soft px-2.5 text-[12.5px] text-violet", home ? "h-11" : "h-9")}>Compare · {comparisonModels.length}</span>
  ) : (
    <ModelPicker variant={variant} mode={mode} value={model} catalog={availableModels} onChange={(m) => setPicked((p) => ({ ...p, [mode]: m }))} />
  );

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3">
      {short && (
        <Hatch>
          Недостаточно кредитов для «{model.name}»: нужно {formatCredits(cost)}, на балансе {formatCredits(balanceMicro)}.{" "}
          <Link href="/app/billing#top-up" className="underline underline-offset-2">
            Пополнить
          </Link>
        </Hatch>
      )}
      {pending && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-(--radius-md) border border-line2 bg-g1 px-3.5 py-2.5 text-[13px]">
          <span className="text-ink2">Отправка через <span className="font-mono text-ink">{pending.left} с</span></span>
          <button
            type="button"
            onClick={() => {
              setValue(pending.text);
              setPending(null);
            }}
            className="cursor-pointer text-ink underline underline-offset-4 hover:text-acc"
          >
            Отменить
          </button>
        </div>
      )}
      {comparisonActive && (
        <section aria-label="Сравнение моделей" className="flex flex-wrap items-center justify-between gap-3 rounded-(--radius-md) border border-violet-line bg-violet-soft px-3.5 py-2.5">
          <div>
            <p className="text-[13px] text-violet">Compare Run · {comparisonModels.length} маршрута</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink2">Один запрос — отдельный ответ-ветка на каждый маршрут. Оценка всех ≈ {formatCredits(cost)}, списание — по факту каждого.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {comparisonModels.map((candidate) => (
              <button key={candidate.id} type="button" onClick={() => setComparisonIds((ids) => ids.filter((id) => id !== candidate.id))} aria-label={`Убрать ${candidate.name} из сравнения`} className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-(--radius-sm) bg-g1 px-2 text-[12px] text-ink2 hover:text-ink">
                <span className="max-w-28 truncate">{candidate.name}</span><X aria-hidden="true" size={12} strokeWidth={1.5} />
              </button>
            ))}
            <button type="button" onClick={() => setComparisonIds([])} className="h-7 cursor-pointer px-1.5 text-[12px] text-ink3 hover:text-ink">Сбросить</button>
          </div>
        </section>
      )}
      {value === "/" && (
        <div role="listbox" aria-label="Команды и шаблоны" className="flex max-h-64 flex-col overflow-y-auto rounded-(--radius-md) border border-line2 bg-g1 p-1 shadow-(--shadow-float)">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="option" aria-selected="false" onClick={() => { switchMode(m.id); setValue(""); }} className="flex cursor-pointer items-center justify-between gap-3 rounded-(--radius-sm) px-3 py-2 text-left text-[13.5px] text-ink2 hover:bg-s2 hover:text-ink">
              <span className="flex items-center gap-2.5"><ModeIcon mode={m.id} size={15} /> {m.label}</span>
              <span className="font-mono text-[11px] text-ink3">{m.command}</span>
            </button>
          ))}
          {prefs.templates.length > 0 && <span className="k-index px-3 pt-3 pb-1.5">Мои шаблоны</span>}
          {prefs.templates.map((t) => (
            <button key={t} type="button" role="option" aria-selected="false" onClick={() => setValue(t)} className="cursor-pointer truncate rounded-(--radius-sm) px-3 py-2 text-left text-[13.5px] text-ink2 hover:bg-s2 hover:text-ink">
              {t}
            </button>
          ))}
        </div>
      )}
      {error && (
        <div ref={errRef} role="alert" className="flex items-start justify-between gap-3 rounded-(--radius-md) border border-err/40 bg-err-soft px-3.5 py-2.5 text-[13px] text-err">
          {error}
          <button type="button" onClick={() => setError(null)} className="shrink-0 cursor-pointer text-[12.5px] underline underline-offset-2">
            Понятно
          </button>
        </div>
      )}
      <div ref={boxRef} data-mode={mode} data-dragging={dragging || undefined} className={cn("k-composer @container", home ? "px-5 pt-5 pb-3" : "px-4 pt-3.5 pb-2.5")}>
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
        {paramsRow && <div className="mb-2">{paramsRow}</div>}
        <label htmlFor="composer-input" className="fx-sr">
          Запрос · режим «{cfg.label}» · модель {model.name}
        </label>
        <textarea
          id="composer-input"
          rows={home ? 3 : 1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={recording ? "Говорите — текст появится здесь…" : home ? "Опишите, что нужно сделать…" : "Напишите сообщение…"}
          className={cn("block max-h-60 w-full resize-none bg-transparent text-ink field-sizing-content outline-none placeholder:text-ink3 focus-visible:outline-none", home ? "min-h-[4.75rem] text-[17px] leading-relaxed" : "min-h-7 text-[15px]")}
        />
        <div className={cn("flex flex-wrap items-center justify-between gap-2", home ? "mt-4" : "mt-2")}>
          <div className="-ml-1.5 flex min-w-0 flex-wrap items-center gap-1">
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
            {home && <div className="mr-1 ml-1.5">{picker}</div>}
            <button type="button" onClick={() => fileInput.current?.click()} aria-label="Прикрепить файл или фото" className="k-tool">
              <Paperclip size={16} strokeWidth={1.5} className="text-ink3" />
              <span className={toolLabel}>Прикрепить</span>
            </button>
            {!home && (
              <button type="button" onClick={() => setWeb((w) => !w)} aria-pressed={web} aria-label="Веб-поиск" className="k-tool">
                <Globe size={16} strokeWidth={1.5} className="text-ink3" />
                <span className={toolLabel}>Веб-поиск</span>
              </button>
            )}
            <button
              type="button"
              popoverTarget={menuId}
              aria-label="Инструменты запроса"
              style={{ anchorName: `--${menuId}` } as React.CSSProperties}
              className="k-tool"
            >
              <SlidersHorizontal size={16} strokeWidth={1.5} className="text-ink3" />
              <span className={toolLabel}>Инструменты</span>
            </button>
            <div
              id={menuId}
              popover="auto"
              onClick={(e) => (e.target as Element).closest("button, a") && e.currentTarget.hidePopover()}
              style={{ positionAnchor: `--${menuId}`, positionArea: home ? "block-end span-inline-end" : "block-start span-inline-end", positionTryFallbacks: "flip-block" } as React.CSSProperties}
              className="inset-auto m-0 my-2 w-72 rounded-(--radius-md) border border-line2 bg-g1 p-1.5 text-ink shadow-(--shadow-float)"
            >
              <span className="k-index block px-2.5 pt-1.5 pb-2">Инструменты</span>
              <MenuItem icon={<Globe size={16} strokeWidth={1.5} />} on={web} onClick={() => setWeb((w) => !w)}>
                Поиск в интернете
              </MenuItem>
              {canThink && (
                <MenuItem icon={<Brain size={16} strokeWidth={1.5} />} on={think} onClick={() => setThink((t) => !t)} hint="×1,7">
                  Думать дольше
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
                  Улучшить формулировку
                </MenuItem>
              )}
              {value.trim().length > 10 && !prefs.templates.includes(value.trim()) && (
                <MenuItem icon={<Bookmark size={16} strokeWidth={1.5} />} onClick={() => writePrefs({ templates: [value.trim(), ...prefs.templates].slice(0, 20) })}>
                  Сохранить как шаблон
                </MenuItem>
              )}
              <span className="my-1.5 block h-px bg-line" aria-hidden="true" />
              <span className="k-index block px-2.5 pt-1.5 pb-2">Режим</span>
              {MODES.map((m) => (
                <MenuItem key={m.id} icon={<ModeIcon mode={m.id} size={16} />} on={m.id === mode} onClick={() => switchMode(m.id)} hint={m.command}>
                  {m.label}
                </MenuItem>
              ))}
              <span className="my-1.5 block h-px bg-line" aria-hidden="true" />
              <Link href={`/app/models?type=${mode === "research" || mode === "slides" ? "text" : mode}`} className="flex h-9 items-center justify-between rounded-(--radius-sm) px-2.5 text-[13.5px] text-ink2 hover:bg-s2 hover:text-ink">
                Все модели и сравнение <span aria-hidden="true" className="text-ink3">→</span>
              </Link>
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
            {!home && mode !== "text" && (
              <span className="ml-1 inline-flex h-8 items-center gap-2 rounded-(--radius-sm) bg-acc-soft pr-1 pl-2.5 text-[12.5px] text-ink">
                <ModeIcon mode={mode} size={14} className="text-acc" />
                {cfg.label}
                <button type="button" onClick={() => switchMode("text")} aria-label={`Убрать «${cfg.label}»`} className="grid size-6 cursor-pointer place-items-center rounded-(--radius-sm) text-ink3 hover:text-ink">
                  <X size={13} strokeWidth={1.5} />
                </button>
              </span>
            )}
            {think && canThink && (
              <span className="ml-1 inline-flex h-8 items-center gap-2 rounded-(--radius-sm) bg-s2 pr-1 pl-2.5 text-[12.5px] text-ink2">
                <Brain size={14} strokeWidth={1.5} />
                Думать дольше
                <button type="button" onClick={() => setThink(false)} aria-label="Выключить «Думать дольше»" className="grid size-6 cursor-pointer place-items-center rounded-(--radius-sm) text-ink3 hover:text-ink">
                  <X size={13} strokeWidth={1.5} />
                </button>
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!home && contextChars > 0 && model.contextK > 0 && (
              <span className="hidden items-center gap-1.5 lg:flex" title="Заполненность контекста модели">
                <Segments value={usage} count={8} tone={usage >= 0.8 ? "warn" : "acc"} label="Заполненность контекста" className="w-12" />
                <span className={cn("font-mono text-[11px] tabular-nums", usage >= 0.8 ? "text-warn" : "text-ink3")}>{Math.max(1, Math.round(usage * 100))}%</span>
              </span>
            )}
            <span className="k-meta" title="Оценка до запуска; точная цена фиксируется в квитанции">{formatCredits(cost, { approx: true })}</span>
            {!home && picker}
            <AnimatePresence initial={false} mode="popLayout">
              {isBusy ? (
                <motion.button
                  key="stop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  type="button"
                  onClick={onStop}
                  disabled={launching}
                  aria-label="Остановить ответ"
                  className={cn("relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-(--radius-sm) border border-line2 text-ink hover:bg-s2 disabled:opacity-40", home ? "h-11 px-4 text-[13.5px]" : "size-9 pointer-coarse:size-11")}
                >
                  <Square size={11} strokeWidth={2} fill="currentColor" />
                  {home && "Стоп"}
                  <Hint k="Esc" />
                </motion.button>
              ) : (
                <motion.button
                  key="send"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  type="submit"
                  aria-label="Отправить"
                  disabled={!canSend}
                  className={cn(
                    "relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-(--radius-sm) border transition-colors duration-(--dur-fast) disabled:cursor-not-allowed",
                    canSend ? "border-acc bg-acc text-acc-ink active:translate-y-px" : "border-line2 bg-transparent text-ink3",
                    home ? "h-11 px-4 text-[13.5px]" : "size-9 pointer-coarse:size-11",
                  )}
                >
                  {home ? (
                    <>
                      <span className={cn("k-kbd", canSend && "border-acc-ink/25 bg-transparent text-acc-ink")}>↵</span>
                      Отправить
                    </>
                  ) : (
                    <ArrowUp size={16} strokeWidth={2} />
                  )}
                  <Hint k="Enter" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {usage >= 0.8 && onCompress && (
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-warn">
          Задача длинная — каждый ответ дороже.
          <button type="button" onClick={onCompress} className="cursor-pointer underline underline-offset-2">
            Сжать историю
          </button>
        </p>
      )}
      {home && modeRow}
      {dragging && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-3 z-(--z-overlay) grid place-items-center rounded-(--radius-md) border border-dashed border-acc-line bg-bg/85">
          <div className="flex flex-col items-center gap-2 text-center">
            <Paperclip size={22} strokeWidth={1.5} className="text-acc" />
            <p className="text-[20px] font-light text-ink">Отпустите, чтобы прикрепить</p>
            <p className="text-[12.5px] text-ink3">Фото · PDF · DOCX · XLSX · аудио · до 50 МБ</p>
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
        "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-(--radius-sm) px-2.5 text-left text-[13.5px] hover:bg-s2 pointer-coarse:h-11",
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
