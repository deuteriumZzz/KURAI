"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type DragEvent } from "react";
import { Archive, Ellipsis, PenLine, Pin, PinOff, Trash } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ChatSummary } from "@/types/api";
import { formatWhen } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useCalm } from "@/lib/use-calm";
import { markOrigin, SPRING } from "@/lib/motion";
import { vibrate } from "@/lib/haptics";

type Props = {
  chat: ChatSummary;
  active: boolean;
  /** «Сейчас» для подписи времени; без него строка однострочная. */
  now?: Date;
  /** layoutId переезжающей метки активного чата (34). */
  markId?: string;
  /** 99 — выделение нескольких чатов. */
  selected?: boolean;
  selecting?: boolean;
  onSelect?: (range: boolean) => void;
  /** 60 — перетаскивание в проект (мышь). */
  onDragStart?: (e: DragEvent) => void;
  onNavigate?: () => void;
  /** 95 — данные чата грузятся заранее (наведение): тихое кольцо у строки. */
  prefetching?: boolean;
  onPin: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
};

const SWIPE = 112;

function subscribeCoarse(cb: () => void) {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const isCoarse = () => typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;

/** Строка истории: название и время; закрепить, переименовать, убрать — из меню на конце строки. */
export function ChatRow({ chat, active, now, markId, selected = false, selecting = false, onSelect, onDragStart, onNavigate, prefetching = false, onPin, onRename, onDelete }: Props) {
  const calm = useCalm();
  const coarse = useSyncExternalStore(subscribeCoarse, isCoarse, () => false);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  // 80 — на телефоне строку можно сдвинуть влево: из-под неё видны «Закрепить» и «Убрать»
  const [swiped, setSwiped] = useState(false);
  const dragged = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu && !swiped) return;
    const off = (e: PointerEvent) => {
      if (root.current?.contains(e.target as Node)) return;
      setMenu(false);
      setSwiped(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (setMenu(false), setSwiped(false));
    window.addEventListener("pointerdown", off);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", esc);
    };
  }, [menu, swiped]);

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
    <div ref={root} data-chat-row={chat.id} className="group relative">
      {coarse && (
        <div aria-hidden={!swiped} className="absolute inset-y-0 right-0 flex overflow-hidden rounded-(--radius-sm)">
          <button type="button" tabIndex={swiped ? 0 : -1} onClick={() => { onPin(); setSwiped(false); }} className="grid w-14 place-items-center bg-acc text-acc-ink">
            {chat.pinned ? <PinOff size={16} strokeWidth={1.5} aria-label="Открепить" /> : <Pin size={16} strokeWidth={1.5} aria-label="Закрепить" />}
          </button>
          <button type="button" tabIndex={swiped ? 0 : -1} onClick={onDelete} className="grid w-14 place-items-center bg-warn text-acc-ink">
            <Archive size={16} strokeWidth={1.5} aria-label="Убрать из истории" />
          </button>
        </div>
      )}
      <motion.div
        drag={coarse && !calm ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: -SWIPE, right: 0 }}
        dragElastic={0.08}
        animate={{ x: swiped ? -SWIPE : 0 }}
        transition={SPRING.release}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={(_, info) => {
          const open = info.offset.x < -SWIPE / 2 || info.velocity.x < -300;
          setSwiped(open);
          if (open) vibrate(10);
          window.setTimeout(() => (dragged.current = false), 0);
        }}
        className="relative rounded-(--radius-sm) bg-(--color-rail)"
      >
        <Link
          href={`/app/c/${chat.id}`}
          draggable={!coarse}
          onDragStart={onDragStart}
          onClick={(e) => {
            if (dragged.current || swiped) {
              e.preventDefault();
              setSwiped(false);
              return;
            }
            // 99 — Shift выделяет диапазон, ⌘/Ctrl — отдельный чат; в режиме выделения клик тоже выделяет
            if (onSelect && (e.shiftKey || e.metaKey || e.ctrlKey || selecting)) {
              e.preventDefault();
              onSelect(e.shiftKey);
              return;
            }
            // 2 — название из строки «перелетит» в заголовок открытого документа
            markOrigin(`chat-title:${chat.id}`, e.currentTarget.querySelector("[data-title]"));
            onNavigate?.();
          }}
          aria-current={active ? "page" : undefined}
          aria-selected={selecting ? selected : undefined}
          className={cn(
            "k-chat-row flex flex-col gap-0.5 rounded-(--radius-sm) py-2 pr-9 pl-3 pointer-coarse:py-2.5",
            markId && "k-mark-moving",
            selected ? "bg-acc-soft shadow-[inset_0_0_0_1px_var(--color-acc-line)]" : active ? "bg-s2" : "hover:bg-s1",
          )}
        >
          {active && markId && <motion.i aria-hidden="true" layoutId={markId} transition={SPRING.snappy} className="k-rail-mark" />}
          <span className={cn("flex items-center gap-1.5 truncate text-[13.5px] leading-snug", active || selected ? "text-ink" : "text-ink2 group-hover:text-ink")}>
            <span data-title className="truncate">{chat.title}</span>
            {prefetching && <i aria-hidden="true" className="k-prefetch ml-auto size-2.5 shrink-0 rounded-full border border-acc-line border-t-transparent" />}
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
      </motion.div>
      <AnimatePresence>
        {menu && (
          <motion.div
            role="menu"
            initial={calm ? { opacity: 0 } : { opacity: 0, transform: "translateY(-4px)" }}
            animate={{ opacity: 1, transform: "translateY(0)" }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.14 }}
            className="k-stagger absolute top-9 right-0 z-(--z-bay) w-48 rounded-(--radius-md) border border-line2 bg-g1 p-1 shadow-(--shadow-float)"
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
              <Trash size={14} strokeWidth={1.5} /> Убрать из истории
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
