"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Ellipsis, PenLine, Pin, PinOff, Trash } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ChatSummary } from "@/types/api";
import { formatWhen } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useCalm } from "@/lib/use-calm";

type Props = {
  chat: ChatSummary;
  active: boolean;
  /** «Сейчас» для подписи времени; без него строка однострочная. */
  now?: Date;
  onNavigate?: () => void;
  onPin: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
};

/** Строка истории: название и время; закрепить, переименовать, удалить — из меню на конце строки. */
export function ChatRow({ chat, active, now, onNavigate, onPin, onRename, onDelete }: Props) {
  const calm = useCalm();
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const off = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("pointerdown", off);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", esc);
    };
  }, [menu]);

  if (renaming) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) onRename(draft.trim());
          setRenaming(false);
        }}
      >
        <label htmlFor={`rn-${chat.id}`} className="fx-sr">
          Новое название чата
        </label>
        <input
          id={`rn-${chat.id}`}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => setRenaming(false)}
          onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
          className="h-9 w-full rounded-(--radius-sm) border border-line2 bg-g2 px-3 text-[13.5px] outline-none focus:border-ink3"
        />
      </form>
    );
  }

  const item = "flex w-full cursor-pointer items-center gap-2.5 rounded-(--radius-sm) px-2.5 py-2 text-left text-[13px] text-ink2 hover:bg-s2 hover:text-ink pointer-coarse:py-3";

  return (
    <div ref={root} className="group relative">
      <Link
        href={`/app/c/${chat.id}`}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "k-chat-row flex flex-col gap-0.5 rounded-(--radius-sm) py-2 pr-9 pl-3 pointer-coarse:py-2.5",
          active ? "bg-s2" : "hover:bg-s1",
        )}
      >
        <span className={cn("flex items-center gap-1.5 truncate text-[13.5px] leading-snug", active ? "text-ink" : "text-ink2 group-hover:text-ink")}>
          <span className="truncate">{chat.title}</span>
          {chat.pinned && <Pin size={11} strokeWidth={1.5} className="shrink-0 text-ink3" aria-label="Закреплён" />}
        </span>
        {now && <span className="text-[12px] leading-tight text-ink3">{formatWhen(chat.updatedAt, now)}</span>}
      </Link>
      <button
        type="button"
        onClick={() => setMenu((m) => !m)}
        aria-label={`Действия с чатом «${chat.title}»`}
        aria-expanded={menu}
        className="k-row-actions absolute top-1.5 right-1 grid size-7 cursor-pointer place-items-center rounded-(--radius-sm) text-ink3 hover:bg-s2 hover:text-ink pointer-coarse:size-10"
      >
        <Ellipsis size={14} strokeWidth={1.5} />
      </button>
      <AnimatePresence>
        {menu && (
          <motion.div
            role="menu"
            initial={calm ? { opacity: 0 } : { opacity: 0, transform: "translateY(-4px)" }}
            animate={{ opacity: 1, transform: "translateY(0)" }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.14 }}
            className="absolute top-9 right-0 z-(--z-bay) w-48 rounded-(--radius-md) border border-line2 bg-g1 p-1 shadow-(--shadow-float)"
          >
            <button role="menuitem" type="button" className={item} onClick={() => { onPin(); setMenu(false); }}>
              {chat.pinned ? <PinOff size={14} strokeWidth={1.5} /> : <Pin size={14} strokeWidth={1.5} />}
              {chat.pinned ? "Открепить" : "Закрепить"}
            </button>
            <button role="menuitem" type="button" className={item} onClick={() => { setDraft(chat.title); setRenaming(true); setMenu(false); }}>
              <PenLine size={14} strokeWidth={1.5} /> Переименовать
            </button>
            <span aria-hidden="true" className="k-hatch-line mx-1 my-1 block" />
            <button role="menuitem" type="button" className={cn(item, "text-err hover:text-err")} onClick={() => { onDelete(); setMenu(false); }}>
              <Trash size={14} strokeWidth={1.5} /> Удалить
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
