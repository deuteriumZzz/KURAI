"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Coins, Layers, Search, Star, Workflow } from "lucide-react";
import { readPrefs, writePrefs, pushRecent, toggleFavorite } from "@/lib/prefs";
import { AnimatePresence, motion } from "motion/react";
import type { Mode } from "@/types/api";
import { GROUP_LABEL, modelsForMode, searchModels, type ModelInfo } from "@/lib/models";
import { MODES } from "@/lib/modes";
import { formatCredits } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useCalm } from "@/lib/use-calm";
import { ModelGlyph, glyphKind } from "@/components/brand/model-glyph";

const ctx = (k: number) => (k <= 0 ? "—" : k >= 1000 ? `${k / 1000}M` : `${k}K`);
const COLS = "grid-cols-[minmax(0,1fr)_3.5rem_4.75rem] md:grid-cols-[minmax(11.5rem,1.1fr)_minmax(0,1.4fr)_3.75rem_5.5rem]";

/** Детали маршрута: только то, что известно о модели, без придуманных оценок. */
function RouteDetail({ m, mode }: { m: ModelInfo; mode: Mode }) {
  const modes = MODES.filter((x) => m.modes.includes(x.id)).map((x) => x.label.toLowerCase());
  return (
    <div className="flex h-full flex-col">
      <ModelGlyph id={m.id} kind={glyphKind(m.group)} size={34} />
      <p className="mt-4 text-[22px] leading-tight font-normal tracking-[-0.01em] text-ink">{m.name}</p>
      <p className="mt-1 text-[13px] text-ink3">{m.group === "auto" ? "Один запрос — подходящий маршрут" : `${GROUP_LABEL[m.group]} · ${m.provider}`}</p>
      <p className="mt-4 text-[13.5px] leading-relaxed text-ink2">{m.note}</p>
      <ul className="mt-5 flex flex-col gap-3 border-t border-line pt-5 text-[13px] text-ink2">
        {m.contextK > 0 && (
          <li className="flex items-center gap-3"><Layers size={16} strokeWidth={1.5} className="text-ink3" /> Контекст до {ctx(m.contextK)} токенов</li>
        )}
        <li className="flex items-center gap-3"><Coins size={16} strokeWidth={1.5} className="text-ink3" /> {formatCredits(m.priceHintMicro, { approx: true })} за {mode === "image" ? "пакет изображений" : mode === "video" ? "ролик" : "типовой запрос"}</li>
        {modes.length > 0 && <li className="flex items-center gap-3"><Workflow size={16} strokeWidth={1.5} className="text-ink3" /> {modes.join(", ")}</li>}
      </ul>
      <p className="mt-auto flex items-center gap-2 border-t border-line pt-4 text-[12px] text-ink3">
        <span className="k-kbd">↵</span> выбрать <span className="k-kbd ml-2">Esc</span> закрыть
      </p>
    </div>
  );
}

type Props = {
  mode: Mode;
  value: ModelInfo;
  onChange: (m: ModelInfo) => void;
  catalog?: ModelInfo[];
  /** home — крупная кнопка маршрута, Model Bay раскрывается вниз; dock — компактная, вверх. */
  variant?: "home" | "dock";
};

/**
 * Model Bay: закреплённый модуль выбора маршрута. Сначала рекомендация «Авто»,
 * детали провайдера — вторым слоем. Стрелки, Enter, Esc; фокус возвращается на кнопку.
 * Панель позиционируется относительно поля ввода (ближайшего relative-предка).
 */
export function ModelPicker({ mode, value, onChange, catalog, variant = "dock" }: Props) {
  const calm = useCalm();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [favs, setFavs] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const list = useMemo(() => {
    const all = searchModels(catalog ?? modelsForMode(mode), q);
    if (q) return all.map((m) => ({ m, group: GROUP_LABEL[m.group] }));
    const pinned = all.filter((m) => favs.includes(m.id)).map((m) => ({ m, group: "Избранные" }));
    const rec = recent.map((id) => all.find((m) => m.id === id)).filter((m): m is ModelInfo => !!m && !favs.includes(m.id)).map((m) => ({ m, group: "Недавние" }));
    const seen = new Set([...pinned, ...rec].map((x) => x.m.id));
    return [...pinned, ...rec, ...all.filter((m) => !seen.has(m.id)).map((m) => ({ m, group: GROUP_LABEL[m.group] }))];
  }, [mode, q, favs, recent, catalog]);
  const current = list[active]?.m ?? value;

  function show() {
    const p = readPrefs();
    setFavs(p.favorites);
    setRecent(p.recent);
    setQ("");
    setActive(0);
    setOpen(true);
  }

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => trigger.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  // «Сменить маршрут» из инспектора открывает тот же модуль
  useEffect(() => {
    const onOpen = () => {
      const p = readPrefs();
      setFavs(p.favorites);
      setRecent(p.recent);
      setQ("");
      setActive(0);
      setOpen(true);
    };
    window.addEventListener("kurai:open-bay", onOpen);
    return () => window.removeEventListener("kurai:open-bay", onOpen);
  }, []);

  // модуль целиком попадает в экран: на главной он раскрывается вниз под полем
  useEffect(() => {
    if (open) panel.current?.scrollIntoView?.({ block: "nearest", behavior: calm ? "auto" : "smooth" });
  }, [open, calm]);

  // выбранная строка остаётся в зоне видимости при навигации стрелками
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${list[active]?.m.id}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, list, listId]);

  function pick(m: ModelInfo | undefined) {
    if (!m) return;
    writePrefs({ recent: pushRecent(readPrefs().recent, m.id) });
    onChange(m);
    close();
  }

  function onKey(e: KeyboardEvent) {
    // Enter/пробел на кнопке внутри строки (★) — это её действие, а не выбор модели
    if ((e.key === "Enter" || e.key === " ") && e.target instanceof HTMLButtonElement) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(list.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(list[active]?.m);
    }
  }

  const home = variant === "home";

  return (
    <div ref={root} onKeyDown={open ? onKey : undefined}>
      <button
        ref={trigger}
        type="button"
        onClick={() => (open ? close(false) : show())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Модель: ${value.name}. Выбрать другую`}
        className={cn(
          "flex cursor-pointer items-center gap-2.5 rounded-(--radius-sm) text-ink transition-colors duration-(--dur-fast)",
          home ? "h-11 border border-line2 px-3.5 text-[14px] hover:border-ink3 aria-expanded:border-acc-line" : "h-9 max-w-52 px-2.5 text-[13px] text-ink2 hover:bg-s2 hover:text-ink aria-expanded:bg-s2 pointer-coarse:h-11",
        )}
      >
        <ModelGlyph id={value.id} kind={glyphKind(value.group)} size={home ? 20 : 17} />
        <span className="truncate">{value.name}</span>
        <ChevronDown size={14} strokeWidth={1.5} className={cn("shrink-0 text-ink3 transition-transform duration-(--dur-fast)", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="bay"
            ref={panel}
            role="dialog"
            aria-label="Выбор маршрута"
            initial={calm ? { opacity: 0 } : { opacity: 0, transform: `translateY(${home ? -6 : 6}px)` }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={calm ? { opacity: 0, transition: { duration: 0.12 } } : { opacity: 0, transform: `translateY(${home ? -4 : 4}px)`, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn(
              "k-bay z-(--z-bay) grid overflow-hidden max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[85dvh] max-sm:rounded-none max-sm:pb-[env(safe-area-inset-bottom)] sm:absolute sm:inset-x-0 md:grid-cols-[minmax(0,1fr)_300px]",
              home ? "sm:top-full sm:mt-3" : "sm:bottom-full sm:mb-3",
            )}
          >
            <div className="flex min-w-0 flex-col p-5 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[21px] leading-tight font-normal tracking-[-0.01em] text-ink">Выберите маршрут</p>
                  <p className="mt-1 text-[13.5px] text-ink3">KURAI подберёт модель под задачу — или выберите сами.</p>
                </div>
                <span className="hidden shrink-0 items-center gap-2 text-[12px] text-ink3 sm:flex">Навигация <span className="k-kbd">↑</span><span className="k-kbd">↓</span></span>
              </div>
              <label className="mt-4 flex h-11 items-center gap-3 rounded-(--radius-sm) border border-line bg-bg px-3.5 focus-within:border-acc-line">
                <Search size={16} strokeWidth={1.5} className="shrink-0 text-ink3" aria-hidden="true" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setActive(0);
                  }}
                  aria-label="Найти модель"
                  role="combobox"
                  aria-expanded="true"
                  aria-autocomplete="list"
                  aria-controls={listId}
                  aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
                  placeholder="Найти модель по задаче, например «анализ» или «код»…"
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink3 focus-visible:outline-none"
                />
              </label>
              <div className={cn("mt-4 grid gap-3 px-3 pb-2 text-[12.5px] text-ink3", COLS)} aria-hidden="true">
                <span className="pl-8">Модель</span>
                <span className="max-md:hidden">Для каких задач</span>
                <span>Контекст</span>
                <span className="text-right">Цена</span>
              </div>
              <ul id={listId} role="listbox" aria-label="Модели" className="-mx-1 max-h-[min(20rem,42dvh)] overflow-y-auto px-1 pb-1">
                {list.length === 0 && <li className="px-3 py-4 text-[13.5px] text-ink3">Не нашли такую модель — попробуйте описать задачу иначе.</li>}
                {list.map(({ m, group }, i) => {
                  const header = group !== list[i - 1]?.group ? group : null;
                  const selected = m.id === value.id;
                  return (
                    <li key={`${group}-${m.id}`} role="presentation">
                      {header && i > 0 && <span className="k-index block px-3 pt-4 pb-2">{header}</span>}
                      <div
                        id={`${listId}-${m.id}`}
                        role="option"
                        aria-selected={selected}
                        data-active={i === active || undefined}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => pick(m)}
                        className={cn("k-bay-row grid cursor-pointer items-center gap-3 px-3 py-3", COLS)}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="k-radio" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block text-[14.5px] leading-snug text-ink">{m.name}</span>
                            <span className="block truncate text-[12px] text-ink3">{m.group === "auto" ? "Рекомендуется" : GROUP_LABEL[m.group]}</span>
                          </span>
                        </span>
                        <span className="line-clamp-2 text-[13px] leading-snug text-ink2 max-md:hidden">{m.note}</span>
                        <span className="font-mono text-[12px] text-ink2">{ctx(m.contextK)}</span>
                        <span className="flex items-center justify-end gap-1 font-mono text-[12px] text-ink2">
                          {formatCredits(m.priceHintMicro, { approx: true })}
                          <button
                            type="button"
                            aria-label={favs.includes(m.id) ? `Убрать ${m.name} из избранного` : `Добавить ${m.name} в избранное`}
                            aria-pressed={favs.includes(m.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = toggleFavorite(favs, m.id);
                              setFavs(next);
                              writePrefs({ favorites: next });
                            }}
                            className={cn("grid size-7 shrink-0 cursor-pointer place-items-center rounded-(--radius-sm) hover:bg-s2", favs.includes(m.id) ? "text-acc" : "text-ink3")}
                          >
                            <Star size={13} strokeWidth={1.5} fill={favs.includes(m.id) ? "currentColor" : "none"} />
                          </button>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="hidden border-l border-line bg-bg/40 p-6 md:block">
              <AnimatePresence mode="wait" initial={false}>
                {current && (
                  <motion.div key={current.id} className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                    <RouteDetail m={current} mode={mode} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
