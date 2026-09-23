"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { ChatSummary } from "@/types/api";
import { cn } from "@/lib/cn";
import { KeyHint, Label } from "@/components/fx/primitives";

type Item = { id: string; label: string; hint: string; href: string };

const COMMANDS: Item[] = [
  { id: "new", label: "Новый чат", hint: "N", href: "/app" },
  { id: "media", label: "Медиатека", hint: "—", href: "/app/media" },
  { id: "billing", label: "Баланс и пополнение", hint: "—", href: "/app/billing" },
  { id: "settings", label: "Настройки", hint: "—", href: "/app/settings" },
];

/** ⌘K в стиле терминала: команды и чаты, стрелки + Enter. Нативный <dialog> даёт фокус-ловушку и Esc. */
export function CommandPalette({ open, onClose, chats }: { open: boolean; onClose: () => void; chats: ChatSummary[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const items = useMemo(() => {
    const all: Item[] = [
      ...COMMANDS,
      ...chats.map((c) => ({ id: c.id, label: `Чат #${c.id.toUpperCase()} · ${c.title}`, hint: "↵", href: `/app/c/${c.id}` })),
    ];
    const s = q.trim().toLowerCase();
    return s ? all.filter((i) => i.label.toLowerCase().includes(s)) : all;
  }, [q, chats]);

  function go(item: Item | undefined) {
    if (!item) return;
    onClose();
    router.push(item.href);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active]);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={() => {
        setQ("");
        setActive(0);
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label="Поиск и команды"
      className="fx-dialog m-auto mt-[12vh] w-[min(640px,calc(100vw-32px))] border border-line2 bg-g1 p-0 text-ink"
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3 font-mono text-[14px]">
        <span className="text-acc" aria-hidden="true">›</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={items[active] ? `pi-${items[active].id}` : undefined}
          placeholder="найти чат или команду…"
          className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink3"
        />
        <KeyHint>Esc</KeyHint>
      </div>
      <ul id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto py-1.5 font-mono text-[13px]">
        {items.length === 0 && <li className="px-4 py-3 text-ink3">Ничего не найдено — Enter в чате спросит модель</li>}
        {items.map((item, i) => (
          <li
            key={item.id}
            id={`pi-${item.id}`}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => go(item)}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-3 px-4 py-2",
              i === active ? "bg-g2 text-ink shadow-[inset_2px_0_0_var(--color-acc)]" : "text-ink2",
            )}
          >
            <span className="truncate">{item.label}</span>
            <Label className="shrink-0">{item.hint}</Label>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
