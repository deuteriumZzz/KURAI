"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Ellipsis, PenLine, Pin, PinOff, Trash } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ChatSummary } from "@/types/api";
import { cn } from "@/lib/cn";

type Props = {
  chat: ChatSummary;
  active: boolean;
  onNavigate?: () => void;
  onPin: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
};

/** Строка истории: закрепить, переименовать, удалить — через меню «⋯» (видно при наведении/фокусе). */
export function ChatRow({ chat, active, onNavigate, onPin, onRename, onDelete }: Props) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const off = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener("pointerdown", off);
    return () => window.removeEventListener("pointerdown", off);
  }, [menu]);

  if (renaming) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) onRename(draft.trim());
          setRenaming(false);
        }}
        className="px-1"
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
          className="h-8 w-full border border-acc-line bg-g2 px-2 text-[13px] outline-none"
        />
      </form>
    );
  }

  const item = "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-g2 pointer-coarse:py-3";

  return (
    <div ref={root} className="group relative">
      <Link
        href={`/app/c/${chat.id}`}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-8 items-center gap-2.5 pr-8 pl-2.5 text-[13px] transition-colors duration-(--dur-fast) pointer-coarse:h-11",
          active ? "bg-g2 text-ink shadow-[inset_2px_0_0_var(--color-acc)]" : "text-ink2 hover:bg-g2 hover:text-ink",
        )}
      >
        <span className="truncate">{chat.title}</span>
        {chat.pinned && <Pin size={12} strokeWidth={1.5} className="ml-auto shrink-0 text-ink3" aria-label="Закреплён" />}
      </Link>
      <button
        type="button"
        onClick={() => setMenu((m) => !m)}
        aria-label={`Действия с чатом «${chat.title}»`}
        aria-expanded={menu}
        className="absolute top-0 right-0 grid h-8 w-8 cursor-pointer place-items-center text-ink3 opacity-0 group-hover:opacity-100 hover:text-ink focus-visible:opacity-100 aria-expanded:opacity-100 pointer-coarse:h-11 pointer-coarse:opacity-100"
      >
        <Ellipsis size={14} strokeWidth={1.5} />
      </button>
      <AnimatePresence>
        {menu && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.14 }}
            className="absolute top-8 right-0 z-30 w-44 border border-line2 bg-g1 py-1 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.8)]"
          >
            <button role="menuitem" type="button" className={item} onClick={() => { onPin(); setMenu(false); }}>
              {chat.pinned ? <PinOff size={14} strokeWidth={1.5} /> : <Pin size={14} strokeWidth={1.5} />}
              {chat.pinned ? "Открепить" : "Закрепить"}
            </button>
            <button role="menuitem" type="button" className={item} onClick={() => { setDraft(chat.title); setRenaming(true); setMenu(false); }}>
              <PenLine size={14} strokeWidth={1.5} /> Переименовать
            </button>
            <button role="menuitem" type="button" className={cn(item, "text-err")} onClick={() => { onDelete(); setMenu(false); }}>
              <Trash size={14} strokeWidth={1.5} /> Удалить
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
