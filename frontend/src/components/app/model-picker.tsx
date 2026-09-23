"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import type { Mode } from "@/types/api";
import { GROUP_LABEL, modelsForMode, searchModels, type ModelInfo } from "@/lib/models";
import { formatCredits } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Decode } from "@/components/fx/decode";
import { Label, Segments } from "@/components/fx/primitives";

function Emblem({ m, size = "sm" }: { m: ModelInfo; size?: "sm" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center border font-mono",
        m.group === "auto" ? "border-acc-line text-acc" : "border-line2 text-ink2",
        size === "sm" ? "size-6 text-[11px]" : "size-10 text-[15px]",
      )}
    >
      {m.emblem}
    </span>
  );
}

/** Карточка модели как сравнение предметов: шкалы скорость / качество / выгода / контекст. */
function ModelCard({ m }: { m: ModelInfo }) {
  const rows = [
    ["Скорость", m.stats.speed],
    ["Качество", m.stats.quality],
    ["Выгода", m.stats.value],
    ["Контекст", m.stats.context],
  ] as const;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Emblem m={m} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-[14px]">{m.name}</p>
          <Label>{m.provider}{m.contextK > 0 ? ` · контекст ${m.contextK >= 1000 ? `${m.contextK / 1000}M` : `${m.contextK}K`}` : ""}</Label>
        </div>
      </div>
      <p className="text-[12.5px] text-ink2">{m.note}</p>
      <dl className="flex flex-col gap-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[72px_1fr_28px] items-center gap-2 text-[12px]">
            <dt className="text-ink3">{k}</dt>
            <dd>
              <Segments value={v / 10} count={10} label={`${k}: ${v} из 10`} />
            </dd>
            <dd className="text-right font-mono text-ink2">{v}</dd>
          </div>
        ))}
      </dl>
      <Label className="text-acc">{formatCredits(m.priceHintMicro, { approx: true })} за запрос</Label>
    </div>
  );
}

/** Выбор модели по задачам: группы, поиск, карточка со шкалами. Стрелки, Enter, Esc. */
export function ModelPicker({ mode, value, onChange }: { mode: Mode; value: ModelInfo; onChange: (m: ModelInfo) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const list = useMemo(() => searchModels(modelsForMode(mode), q), [mode, q]);
  const current = list[active] ?? value;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  function toggle() {
    setQ("");
    setActive(Math.max(0, modelsForMode(mode).findIndex((m) => m.id === value.id)));
    setOpen((o) => !o);
  }

  function pick(m: ModelInfo | undefined) {
    if (!m) return;
    onChange(m);
    setOpen(false);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(list.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(list[active]);
    }
  }

  return (
    <div ref={root} className="relative" onKeyDown={open ? onKey : undefined}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Модель: ${value.name}. Выбрать другую`}
        className="flex h-8 max-w-44 cursor-pointer items-center gap-2 border border-line px-2 text-[12.5px] text-ink2 hover:border-line2 hover:text-ink pointer-coarse:h-11"
      >
        <Emblem m={value} />
        <Decode key={value.id} text={value.name} className="truncate" />
        <ChevronDown size={14} strokeWidth={1.5} className="shrink-0" />
      </button>

      {open && (
        <div className="fx-flicker-border absolute right-0 bottom-full z-20 mb-2 grid w-[min(600px,calc(100vw-32px))] border border-line2 bg-g1 sm:grid-cols-[1fr_220px]">
          <div className="flex min-w-0 flex-col border-line sm:border-r">
            <label className="flex items-center gap-2 border-b border-line px-3 py-2 font-mono text-[13px]">
              <span className="text-acc" aria-hidden="true">›</span>
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                aria-label="Найти модель"
                aria-controls={listId}
                aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
                placeholder="найти модель…"
                className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink3"
              />
            </label>
            <ul id={listId} role="listbox" aria-label="Модели" className="max-h-72 overflow-y-auto py-1">
              {list.length === 0 && <li className="px-3 py-3 text-[13px] text-ink3">Не нашли такую модель</li>}
              {list.map((m, i) => {
                const header = m.group !== list[i - 1]?.group ? GROUP_LABEL[m.group] : null;
                return (
                  <li key={m.id} role="presentation">
                    {header && <Label className="block px-3 pt-2 pb-1">{header}</Label>}
                    <div
                      id={`${listId}-${m.id}`}
                      role="option"
                      aria-selected={m.id === value.id}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(m)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] pointer-coarse:py-3",
                        i === active ? "bg-g2 text-ink shadow-[inset_2px_0_0_var(--color-acc)]" : "text-ink2",
                      )}
                    >
                      <Emblem m={m} />
                      <span className="truncate">{m.name}</span>
                      {m.id === value.id && <span className="font-mono text-[10px] text-acc">●</span>}
                      <span className="ml-auto shrink-0 font-mono text-[11px] text-ink3">{formatCredits(m.priceHintMicro)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="hidden p-3 sm:block">{current && <ModelCard m={current} />}</div>
        </div>
      )}
    </div>
  );
}
