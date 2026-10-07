"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { MOTION, SPRING, flyTo } from "@/lib/motion";
import { Archive, ChevronLeft, ChevronRight, EllipsisVertical, FolderClosed, FolderInput, Images, LayoutGrid, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, SquarePen, UserRound, Wallet, Flame, X, type LucideIcon } from "lucide-react";
import type { Balance, ChatSummary, Project, User } from "@/types/api";
import { KuraiMark } from "@/components/brand/mark";
import { Initials } from "@/components/brand/avatar";
import { formatCredits, formatWhen } from "@/lib/format";
import { createProject as createOfflineProject, projectChatIds } from "@/lib/projects";
import { kuraiApi } from "@/lib/kurai-api";
import { cn } from "@/lib/cn";
import { FlapNumber } from "@/components/fx/flap-number";
import { Segments } from "@/components/fx/primitives";
import { chatsStore, projectsStore } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { prefetchChat, summarize } from "@/lib/chat-cache";
import { clearTracked, trackedStore, type Tracked } from "@/lib/tracked";
import { markStep } from "@/lib/prefs";
import { modeById } from "@/lib/modes";
import { routeLabel } from "@/lib/models";
import { Hint } from "./hint";
import { ChatRow } from "./chat-row";
import { Inbox } from "./inbox";
import { LocalPreviewBanner } from "./offline-banner";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app/models", label: "Модели", icon: LayoutGrid },
  { href: "/app/media", label: "Медиатека", icon: Images },
  { href: "/app/artifacts", label: "Артефакты", icon: Archive },
  { href: "/app/settings", label: "Настройки", icon: Settings },
];

const MENU: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app/profile", label: "Профиль", icon: UserRound },
  { href: "/app/billing", label: "Баланс и тарифы", icon: Wallet },
  { href: "/app/explore", label: "Шаблоны и рецепты", icon: Flame },
  { href: "/app/settings", label: "Настройки", icon: Settings },
];

const PLAN = { free: "Free", pro: "Pro", ultra: "Ultra" } as const;
const CHAT_MIME = "application/x-kurai-chat";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  /** origin — кнопка «Поиск»: окно ⌘K вырастает из неё. */
  onSearch: (origin?: DOMRect) => void;
  onNavigate?: () => void;
  chats: ChatSummary[];
  /** null — баланс ещё не получен от сервера. */
  balance: Balance | null;
  user: User;
  now: Date;
};

type Preview = { chat: ChatSummary; x: number; y: number; data: ReturnType<typeof summarize> | null };

/** Знак KURAI для рейки: разреженный шрифт и тихий подзаголовок, без эффектов при наведении. */
function Wordmark() {
  return (
    <span className="flex items-center gap-3">
      <span className="text-[19px] font-normal tracking-[0.34em] text-ink">KURAI</span>
      <span aria-hidden="true" className="h-6 w-px bg-line2" />
      <span className="font-mono text-[8.5px] leading-[1.35] tracking-[0.22em] text-ink3">DEEP WORK<br />WITH AI</span>
    </span>
  );
}

/** 34 — метка активного пункта: одна на группу, переезжает к новому пункту. */
function RailMark({ id }: { id: string }) {
  return <motion.i aria-hidden="true" layoutId={id} transition={SPRING.snappy} className="k-rail-mark" />;
}

/** Левая рейка Command Deck: создание, основные разделы, проекты, история и аккаунт. */
export function Sidebar({ collapsed, onToggle, onSearch, onNavigate, chats, balance, user, now }: Props) {
  const pathname = usePathname();
  // шторка и десктоп рендерят по рейке — у каждой своё меню аккаунта и свои переезжающие метки
  const group = useId();
  const accountMenu = `${group}-account`;
  const projects = useStore(projectsStore);
  const tracked = useStore(trackedStore);
  const projectChats = projectChatIds(projects);
  const history = chats
    .filter((chat) => !projectChats.has(chat.id))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const [removed, setRemoved] = useState<ChatSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // одна подложка наведения на всю рейку: переезжает за курсором между пунктами
  const [hover, setHover] = useState<string | null>(null);
  // 99 — выделение нескольких чатов (Shift/⌘-клик)
  const [selected, setSelected] = useState<string[]>([]);
  const anchor = useRef<string | null>(null);
  const [moveMenu, setMoveMenu] = useState(false);
  // 87 — предпросмотр чата при задержке курсора на строке
  const [preview, setPreview] = useState<Preview | null>(null);
  const previewTimer = useRef(0);
  const warmTimer = useRef(0);
  const [prefetching, setPrefetching] = useState<string | null>(null);
  const previewOpen = useRef(false);
  const rail = useRef<HTMLElement>(null);
  const [historyDrop, setHistoryDrop] = useState(false);

  useEffect(() => {
    if (!removed && !actionError) return;
    const t = setTimeout(() => {
      setRemoved(null);
      setActionError(null);
    }, 6000);
    return () => clearTimeout(t);
  }, [removed, actionError]);

  useEffect(() => {
    if (!selected.length) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSelected([]);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [selected.length]);

  useEffect(() => () => clearTimeout(previewTimer.current), []);

  const patchChat = (id: string, change: Partial<ChatSummary>) => chatsStore.set((xs) => xs.map((x) => (x.id === id ? { ...x, ...change } : x)));
  /** Изменение видно сразу; в рабочем режиме сохраняется на сервере, при отказе — откатывается с объяснением. */
  function persist(id: string, patch: { title?: string; pinned?: boolean; archived?: boolean; projectId?: string | null }, rollback: () => void) {
    if (!kuraiApi) return;
    kuraiApi.updateChat(id, patch).catch(() => {
      rollback();
      setActionError("Не удалось сохранить изменение — проверьте соединение.");
    });
  }

  /** 60 — перенос чата в проект (или обратно в историю): видно сразу, на сервере — PATCH projectId. */
  function moveChat(chatId: string, projectId: string | null) {
    const before = projectsStore.get();
    if (projectId && before.find((p) => p.id === projectId)?.chatIds.includes(chatId)) return;
    projectsStore.set(before.map((p) => ({ ...p, chatIds: [...p.chatIds.filter((x) => x !== chatId), ...(p.id === projectId ? [chatId] : [])] })));
    persist(chatId, { projectId }, () => projectsStore.set(before));
  }

  function rowEl(chatId: string): Element | null {
    return rail.current?.querySelector(`[data-chat-row="${CSS.escape(chatId)}"]`) ?? null;
  }

  // отмена доступна 8 секунд — столько же едет штриховка
  useEffect(() => {
    if (!removed) return;
    const t = setTimeout(() => setRemoved(null), 8000);
    return () => clearTimeout(t);
  }, [removed]);

  function archive(c: ChatSummary, undoable: boolean) {
    if (undoable) setRemoved(c);
    chatsStore.set((xs) => xs.filter((x) => x.id !== c.id));
    // в архив, а не стирание: запуски и списания по чату остаются в журнале
    persist(c.id, { archived: true }, () => {
      chatsStore.set((xs) => [c, ...xs]);
      if (undoable) setRemoved(null);
    });
  }

  function select(id: string, range: boolean) {
    setSelected((cur) => {
      if (range && anchor.current) {
        const order = history.map((c) => c.id);
        const from = order.indexOf(anchor.current);
        const to = order.indexOf(id);
        if (from >= 0 && to >= 0) return [...new Set([...cur, ...order.slice(Math.min(from, to), Math.max(from, to) + 1)])];
      }
      anchor.current = id;
      return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    });
  }

  function previewEnter(c: ChatSummary, el: HTMLElement) {
    const pending = prefetchChat(c.id);
    clearTimeout(previewTimer.current);
    clearTimeout(warmTimer.current);
    // 95 — тихое кольцо у строки, пока данные чата грузятся заранее
    if (pending) {
      setPrefetching(c.id);
      void pending.catch(() => undefined).finally(() => setPrefetching((cur) => (cur === c.id ? null : cur)));
    }
    const show = () => {
      previewOpen.current = true;
      setPreview({ chat: c, x: (rail.current?.getBoundingClientRect().right ?? 272) + 10, y: el.getBoundingClientRect().top, data: null });
      pending?.then((s) => setPreview((cur) => (cur && cur.chat.id === c.id ? { ...cur, data: summarize(s) } : cur))).catch(() => undefined);
    };
    if (previewOpen.current) show();
    else previewTimer.current = window.setTimeout(show, 600);
  }
  function previewClose() {
    clearTimeout(previewTimer.current);
    setPreview(null);
    // 87 — переход на соседнюю строку: карточка меняется сразу, без новой задержки
    warmTimer.current = window.setTimeout(() => (previewOpen.current = false), 300);
  }

  const item = (active: boolean) =>
    cn("k-rail-item flex h-9 items-center gap-3 rounded-(--radius-sm) px-3 text-[14px] pointer-coarse:h-11", active ? "bg-s2 text-ink" : "text-ink2 hover:text-ink");

  const showTracked = tracked && !collapsed && pathname !== `/app/c/${tracked.chatId}`;

  return (
    <LayoutGroup id={group}>
      <aside
        ref={rail}
        aria-label="Навигация"
        className={cn("k-rail group/rail relative flex h-full flex-col transition-[width] duration-(--dur-rail) ease-(--ease-out)", collapsed ? "k-rail-collapsed w-16" : "w-[272px]")}
      >
        {/* «язычок» на краю рейки: заметный способ свернуть/развернуть, дублирует кнопку в шапке (для мыши) */}
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute top-1/2 -right-3 z-20 grid h-12 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-line2 bg-g2 text-ink2 opacity-0 shadow-(--shadow-float) transition-[opacity,color] duration-(--dur-rail) group-hover/rail:opacity-100 hover:text-ink max-md:hidden"
        >
          {collapsed ? <ChevronRight size={14} strokeWidth={1.75} /> : <ChevronLeft size={14} strokeWidth={1.75} />}
        </button>
        <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "justify-between pr-2 pl-5")}>
          {!collapsed && (
            <Link href="/app" onClick={onNavigate} aria-label="KURAI — новая задача">
              <Wordmark />
            </Link>
          )}
          <button
            type="button"
            onClick={onToggle}
            data-kbd="["
            aria-label={collapsed ? "Развернуть панель ([)" : "Свернуть панель ([)"}
            aria-keyshortcuts="["
            className="relative grid size-8 cursor-pointer place-items-center rounded-(--radius-sm) text-ink2 hover:bg-s2 hover:text-ink max-md:hidden"
          >
            {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.5} /> : <PanelLeftClose size={16} strokeWidth={1.5} />}
            <Hint k="[" />
          </button>
        </div>

        <div className="flex flex-col gap-0.5 overflow-hidden px-3" onMouseLeave={() => setHover(null)}>
          <Link href="/app" onClick={onNavigate} onMouseEnter={() => setHover(null)} aria-label={collapsed ? "Новый чат" : undefined} className={cn(item(false), "mb-2 bg-s2 text-ink hover:bg-s3")}>
            <SquarePen size={16} strokeWidth={1.5} className="shrink-0" />
            <span className="k-shift k-label flex flex-1 items-center justify-between">
              Новый чат <span className="k-kbd" data-kbd="n">N</span>
            </span>
            <Hint k="N" />
          </Link>
          <button
            type="button"
            onClick={(e) => onSearch(e.currentTarget.getBoundingClientRect())}
            onMouseEnter={() => setHover("search")}
            aria-label={collapsed ? "Поиск" : undefined}
            className={cn(item(false), "cursor-pointer")}
          >
            <HoverPlate on={hover === "search"} />
            <Search size={16} strokeWidth={1.5} className="shrink-0 text-ink3" />
            <span className="k-shift k-label flex flex-1 items-center justify-between">
              Поиск <span className="k-kbd" data-kbd="k">⌘K</span>
            </span>
            <Hint k="⌘K" />
          </button>
          <div className="relative isolate" onMouseEnter={() => setHover("inbox")}>
            <HoverPlate on={hover === "inbox"} />
            <Inbox collapsed={collapsed} onNavigate={onNavigate} />
          </div>
          {NAV.map(({ href, label, icon: Icon }, i) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                onMouseEnter={() => setHover(href)}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? label : undefined}
                className={cn(item(active), "k-mark-moving")}
              >
                <HoverPlate on={hover === href} />
                {active && <RailMark id="k-rail-mark" />}
                <Icon size={16} strokeWidth={1.5} className={cn("shrink-0", active ? "text-ink" : "text-ink3")} />
                <span className="k-shift k-label">{label}</span>
                <span aria-hidden="true" className="k-rail-idx">0{i + 1}</span>
              </Link>
            );
          })}
        </div>

        <nav aria-label="Проекты и история" className={cn("mt-6 min-h-0 flex-1 overflow-y-auto px-3 pb-4 transition-opacity duration-(--dur-rail)", collapsed && "invisible opacity-0")}>
          <Projects projects={projects} chats={chats} pathname={pathname} onNavigate={onNavigate} onMove={moveChat} rowEl={rowEl} />
          <section aria-label="Чаты" className="mt-6">
            <h2
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(CHAT_MIME)) return;
                e.preventDefault();
                setHistoryDrop(true);
              }}
              onDragLeave={() => setHistoryDrop(false)}
              onDrop={(e) => {
                setHistoryDrop(false);
                const id = e.dataTransfer.getData(CHAT_MIME);
                if (id && projectChats.has(id)) moveChat(id, null);
              }}
              className={cn("rounded-(--radius-sm) px-3 pb-2 text-[12.5px] text-ink3", historyDrop && "k-drop")}
            >
              Чаты
            </h2>
            {history.length === 0 && <p className="px-3 py-2 text-[12.5px] leading-relaxed text-ink3">Здесь появятся ваши диалоги. Начните с поля ввода.</p>}
            <ul className="flex flex-col" onMouseLeave={previewClose}>
              <AnimatePresence initial={false} mode="popLayout">
                {history.map((c) => (
                  <motion.li
                    key={c.id}
                    layout="position"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: MOTION.instant / 1000 } }}
                    transition={SPRING.snappy}
                    onMouseEnter={(e) => previewEnter(c, e.currentTarget)}
                  >
                    <ChatRow
                      chat={c}
                      now={now}
                      active={pathname === `/app/c/${c.id}`}
                      markId="k-chat-mark"
                      prefetching={prefetching === c.id}
                      selected={selected.includes(c.id)}
                      selecting={selected.length > 0}
                      onSelect={(range) => select(c.id, range)}
                      onNavigate={() => {
                        previewClose();
                        onNavigate?.();
                      }}
                      onDragStart={(e: DragEvent) => {
                        previewClose();
                        e.dataTransfer.setData(CHAT_MIME, c.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onPin={() => {
                        const pinned = !c.pinned;
                        patchChat(c.id, { pinned });
                        persist(c.id, { pinned }, () => patchChat(c.id, { pinned: !pinned }));
                      }}
                      onRename={(title) => {
                        const previous = c.title;
                        patchChat(c.id, { title });
                        persist(c.id, { title }, () => patchChat(c.id, { title: previous }));
                      }}
                      onDelete={() => archive(c, true)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </section>
        </nav>

        {/* 99 — панель массовых действий: появляется, пока выбран хотя бы один чат */}
        <AnimatePresence>
          {selected.length > 0 && !collapsed && (
            <motion.div
              key="bulk"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={SPRING.gentle}
              role="toolbar"
              aria-label="Действия с выбранными чатами"
              className="relative mx-3 mb-2 flex items-center gap-1 rounded-(--radius-md) border border-line2 bg-g2 p-1.5 text-[12.5px]"
            >
              <span className="flex-1 px-1.5 text-ink2">Выбрано {selected.length}</span>
              {projects.length > 0 && (
                <button type="button" onClick={() => setMoveMenu((m) => !m)} aria-expanded={moveMenu} className="k-act inline-flex! h-7 w-auto! gap-1.5 px-2 text-[12.5px]">
                  <FolderInput size={13} strokeWidth={1.5} /> В проект
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  history.filter((c) => selected.includes(c.id)).forEach((c) => archive(c, false));
                  setSelected([]);
                }}
                className="k-act inline-flex! h-7 w-auto! gap-1.5 px-2 text-[12.5px] text-err"
              >
                <Archive size={13} strokeWidth={1.5} /> Убрать
              </button>
              <button type="button" onClick={() => setSelected([])} aria-label="Снять выделение" className="k-act size-7">
                <X size={13} strokeWidth={1.5} />
              </button>
              {moveMenu && (
                <div role="menu" className="k-stagger absolute right-0 bottom-full left-0 mb-1 rounded-(--radius-md) border border-line2 bg-g1 p-1 shadow-(--shadow-float)">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        selected.forEach((id) => moveChat(id, p.id));
                        setSelected([]);
                        setMoveMenu(false);
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-(--radius-sm) px-2.5 py-2 text-left text-[13px] text-ink2 hover:bg-s2 hover:text-ink"
                    >
                      <FolderClosed size={14} strokeWidth={1.5} /> {p.name}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {actionError && !collapsed && (
          <p role="alert" className="mx-3 mb-2 rounded-(--radius-sm) border border-err/40 bg-err-soft px-3 py-2 text-[12.5px] text-err">{actionError}</p>
        )}
        {removed && !collapsed && (
          // К8 — зона отмены: жёлто-чёрная штриховка едет, пока идёт отсчёт; потом решение принято
          <div role="status" key={removed.id} className="k-hazard relative mx-3 mb-2 flex items-center justify-between gap-2 overflow-hidden rounded-(--radius-sm) border border-warn/40 bg-g2 px-3 py-2 text-[12.5px]">
            <span className="relative truncate text-ink2">Чат убран из истории</span>
            <i aria-hidden="true" className="k-fix-bar bg-warn!" style={{ animationDuration: "8s" }} />
            <button
              type="button"
              onClick={() => {
                const chat = removed;
                chatsStore.set((xs) => [chat, ...xs]);
                setRemoved(null);
                persist(chat.id, { archived: false }, () => chatsStore.set((xs) => xs.filter((x) => x.id !== chat.id)));
              }}
              className="relative shrink-0 cursor-pointer text-ink underline underline-offset-2 hover:text-acc"
            >
              Вернуть
            </button>
          </div>
        )}

        <AnimatePresence>{showTracked && <TrackedCard key={tracked.runId} tracked={tracked} onNavigate={onNavigate} />}</AnimatePresence>

        <div className={cn("shrink-0 border-t border-line px-3 pt-2 pb-3", collapsed && "px-2")}>
          {!collapsed && <LocalPreviewBanner />}
          <button
            type="button"
            popoverTarget={accountMenu}
            aria-label={`Аккаунт: ${user.name}${balance ? `, баланс ${formatCredits(balance.micro)}` : ""}`}
            className={cn("mt-1 flex w-full cursor-pointer items-center gap-3 rounded-(--radius-sm) p-2 text-left hover:bg-s2", collapsed && "justify-center p-1")}
          >
            {collapsed ? <KuraiMark className="size-7" /> : <Initials name={user.name} />}
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[14px] text-ink">{user.name}</span>
                  <span className="k-meta text-[11px]" data-balance>
                    {/* 46 — баланс пересчитывается цифрами, когда в него «прилетает» сумма */}
                    {balance ? <FlapNumber value={formatCredits(balance.micro)} /> : "баланс загружается"}
                    {balance && !kuraiApi && ` · ${PLAN[balance.plan]}`}
                  </span>
                </span>
                <EllipsisVertical size={16} strokeWidth={1.5} className="text-ink3" />
              </>
            )}
          </button>
          <div
            id={accountMenu}
            popover="auto"
            onClick={(e) => (e.target as Element).closest("a") && e.currentTarget.hidePopover()}
            className="k-stagger fixed inset-auto bottom-20 left-3 m-0 w-64 rounded-(--radius-md) border border-line2 bg-g1 p-1.5 text-ink shadow-(--shadow-float)"
          >
            <Link href="/app/billing" onClick={onNavigate} className="mb-1 block rounded-(--radius-sm) px-3 py-2.5 hover:bg-s2">
              <span className="mb-2 flex items-baseline justify-between text-[12.5px] text-ink3">
                Баланс <span className="font-mono text-[14px] text-ink tabular-nums">{balance ? formatCredits(balance.micro) : "—"}</span>
              </span>
              {balance && !kuraiApi && <Segments value={balance.micro / balance.monthlyGrantMicro} label="Баланс относительно месячного начисления" />}
            </Link>
            {MENU.map(({ href, label, icon: Icon }) => (
              <Link key={href + label} href={href} onClick={onNavigate} aria-current={pathname === href ? "page" : undefined} className="flex h-9 items-center gap-3 rounded-(--radius-sm) px-3 text-[13.5px] text-ink2 hover:bg-s2 hover:text-ink">
                <Icon size={16} strokeWidth={1.5} className="text-ink3" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* 87 — предпросмотр: последние строки ответа, модель и сумма; без задержки при переходе по строкам */}
        <AnimatePresence>
          {preview && !collapsed && (
            <motion.div
              key="preview"
              aria-hidden="true"
              initial={{ opacity: 0, x: -6, y: preview.y }}
              animate={{ opacity: 1, x: 0, y: preview.y }}
              exit={{ opacity: 0, transition: { duration: MOTION.instant / 1000 } }}
              transition={SPRING.snappy}
              style={{ left: preview.x }}
              className="pointer-events-none fixed top-0 z-(--z-bay) hidden w-72 rounded-(--radius-md) border border-line2 bg-g2 p-3 shadow-(--shadow-float) md:block"
            >
              <p className="truncate text-[13px] font-medium text-ink">{preview.chat.title}</p>
              <p className="mt-1 line-clamp-3 text-[12.5px] leading-relaxed text-ink2">
                {preview.data ? preview.data.text || "Ответа пока нет." : "Загружаю…"}
              </p>
              <p className="k-meta mt-2 text-[11px]">
                {preview.data?.model ? `${routeLabel(preview.data.model)} · ` : ""}
                {preview.data ? `${formatCredits(preview.data.costMicro)} · ` : ""}
                {formatWhen(preview.chat.updatedAt, now)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </LayoutGroup>
  );
}

/** К12 — отслеживаемая задача: реальный статус запуска, видна из любого раздела. */
function TrackedCard({ tracked, onNavigate }: { tracked: Tracked; onNavigate?: () => void }) {
  // время идёт только пока запуск реально идёт; отсчёт от момента старта
  const [nowMs, setNowMs] = useState(() => Date.parse(tracked.startedAt));
  useEffect(() => {
    if (tracked.status !== "running") return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [tracked.status]);
  const seconds = Math.max(0, Math.round((nowMs - Date.parse(tracked.startedAt)) / 1000));
  const elapsed = seconds < 60 ? `${seconds} с` : `${Math.floor(seconds / 60)} мин ${seconds % 60} с`;
  const status =
    tracked.status === "running"
      ? `${tracked.step ?? modeById(tracked.mode).label}${tracked.pct !== undefined ? ` · ${Math.round(tracked.pct * 100)}%` : ""} · ${elapsed}`
      : tracked.status === "done"
        ? `Готово${tracked.costMicro ? ` · ${formatCredits(tracked.costMicro)}` : ""} · открыть`
        : "Не удалось · открыть";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={SPRING.gentle}
      className="relative mx-3 mb-2"
    >
      <Link
        href={`/app/c/${tracked.chatId}`}
        onClick={() => {
          if (tracked.status !== "running") clearTracked();
          onNavigate?.();
        }}
        className={cn("relative block overflow-hidden rounded-(--radius-md) border bg-g1 px-3 py-2.5 pr-8", tracked.status === "done" ? "border-acc-line" : tracked.status === "error" ? "border-err/40" : "border-line2")}
      >
        <span className="k-index block">Отслеживаю</span>
        <span className="mt-0.5 block truncate text-[13px] text-ink">{tracked.title}</span>
        <span className={cn("k-meta mt-0.5 block text-[11px]", tracked.status === "done" && "text-acc-text", tracked.status === "error" && "text-err")}>{status}</span>
        {tracked.status === "running" && <i aria-hidden="true" className="k-tracked-bar" />}
      </Link>
      {tracked.status !== "running" && (
        <button type="button" onClick={clearTracked} aria-label="Убрать отслеживание" className="k-act absolute top-1.5 right-1.5 size-6">
          <X size={12} strokeWidth={1.5} />
        </button>
      )}
    </motion.div>
  );
}

function Projects({
  projects,
  chats,
  pathname,
  onNavigate,
  onMove,
  rowEl,
}: {
  projects: Project[];
  chats: ChatSummary[];
  pathname: string;
  onNavigate?: () => void;
  onMove: (chatId: string, projectId: string | null) => void;
  rowEl: (chatId: string) => Element | null;
}) {
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [open, setOpen] = useState<string | null>(() => projects.find((p) => p.chatIds.some((id) => pathname === `/app/c/${id}`))?.id ?? null);
  const [dropOn, setDropOn] = useState<string | null>(null);

  async function addProject() {
    const title = name.trim();
    if (!title || creating) return;
    setCreating(true);
    setProjectError(null);
    try {
      const project = kuraiApi
        ? await kuraiApi.createProject(title)
        : createOfflineProject(title, new Date().toISOString(), projects.map((item) => item.id));
      projectsStore.set((items) => [project, ...items]);
      markStep("project");
      setOpen(project.id);
      setName("");
      setAdding(false);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "Не удалось создать проект.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section aria-label="Проекты">
      <div className="flex items-center justify-between pr-1 pb-2 pl-3">
        <Link href="/app/projects" onClick={onNavigate} className="inline-flex min-h-6 items-center text-[12.5px] text-ink3 hover:text-ink pointer-coarse:min-h-11">
          Проекты
        </Link>
        <button type="button" onClick={() => { setProjectError(null); setAdding(true); }} aria-label="Новый проект" className="grid size-7 cursor-pointer place-items-center rounded-(--radius-sm) text-ink3 hover:bg-s2 hover:text-ink">
          <Plus size={15} strokeWidth={1.5} />
        </button>
      </div>
      {adding && (
        <form onSubmit={(event) => { event.preventDefault(); void addProject(); }} className="mb-1 rounded-(--radius-sm) border border-line2 bg-g2 p-1 focus-within:border-ink3">
          <label className="fx-sr" htmlFor="project-name">Название проекта</label>
          <input
            id="project-name"
            autoFocus
            value={name}
            disabled={creating}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") { setAdding(false); setName(""); } }}
            placeholder="Название проекта"
            className="h-8 w-full bg-transparent px-2 text-[13px] text-ink outline-none placeholder:text-ink3"
          />
          {projectError && <p role="alert" className="px-2 pt-1 text-[11.5px] text-warn">{projectError}</p>}
        </form>
      )}
      {projects.length === 0 && !adding && <p className="px-3 text-[12.5px] text-ink3">Соберите чаты с общим контекстом в проект.</p>}
      <ul className="flex flex-col gap-px">
        {projects.map((project) => {
          const own = chats.filter((chat) => project.chatIds.includes(chat.id));
          const expanded = open === project.id;
          const hasActive = own.some((chat) => pathname === `/app/c/${chat.id}`);
          return (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => setOpen((current) => (current === project.id ? null : project.id))}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(CHAT_MIME)) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropOn(project.id);
                }}
                onDragLeave={() => setDropOn((cur) => (cur === project.id ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropOn(null);
                  const id = e.dataTransfer.getData(CHAT_MIME);
                  if (!id) return;
                  const from = rowEl(id);
                  const folder = e.currentTarget;
                  // чат «влетает» в папку, затем папка раскрывается с ним внутри
                  void (from ? flyTo(from, folder, { endScale: 0.3, ms: 420 }) : Promise.resolve()).then(() => {
                    onMove(id, project.id);
                    setOpen(project.id);
                  });
                }}
                aria-expanded={expanded}
                data-active={hasActive && !expanded ? "true" : undefined}
                className={cn("k-rail-item flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-(--radius-sm) px-3 text-left text-[13.5px] text-ink2 hover:bg-s1 hover:text-ink pointer-coarse:h-11", dropOn === project.id && "k-drop")}
              >
                <ChevronRight size={14} strokeWidth={1.5} className={cn("-ml-1 shrink-0 text-ink3 transition-transform duration-(--dur-rail)", expanded && "rotate-90")} />
                <FolderClosed size={15} strokeWidth={1.5} className="shrink-0 text-ink3" />
                <span className="k-shift min-w-0 flex-1 truncate">{project.name}</span>
                <motion.span key={own.length} initial={{ scale: 1.4 }} animate={{ scale: 1 }} transition={SPRING.snappy} className="k-meta text-[10.5px]">
                  {own.length}
                </motion.span>
              </button>
              {/* 56 — папка раскрывается до естественной высоты плавно */}
              <AnimatePresence initial={false}>
              {expanded && (
                <motion.ul key="folder" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING.gentle} className="mt-px mb-1 ml-[22px] overflow-hidden border-l border-line pl-2">
                  {own.length > 0 ? (
                    own.map((chat, i) => {
                      const active = pathname === `/app/c/${chat.id}`;
                      return (
                        // 57 — чаты внутри папки проявляются лесенкой по 20 мс
                        <motion.li key={chat.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.snappy, delay: Math.min(i, 6) * 0.02 }}>
                          <Link
                            href={`/app/c/${chat.id}`}
                            onClick={onNavigate}
                            draggable
                            data-chat-row={chat.id}
                            onDragStart={(e) => {
                              e.dataTransfer.setData(CHAT_MIME, chat.id);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            aria-current={active ? "page" : undefined}
                            className={cn("k-chat-row k-mark-moving relative block truncate rounded-(--radius-sm) py-1.5 pr-2 pl-3 text-[13px]", active ? "bg-s2 text-ink" : "text-ink2 hover:bg-s1 hover:text-ink")}
                          >
                            {active && <RailMark id="k-chat-mark" />}
                            {chat.title}
                          </Link>
                        </motion.li>
                      );
                    })
                  ) : (
                    <li className="py-1.5 pl-3 text-[12.5px] text-ink3">Пока без чатов — перетащите сюда</li>
                  )}
                </motion.ul>
              )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Подложка наведения: одна на рейку, переезжает между пунктами (в спокойном режиме — без движения). */
function HoverPlate({ on }: { on: boolean }) {
  return (
    <AnimatePresence>
      {on && (
        <motion.span
          aria-hidden="true"
          layoutId="k-rail-hover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ ...SPRING.snappy, opacity: { duration: MOTION.instant / 1000 } }}
          className="pointer-events-none absolute inset-0 -z-10 rounded-(--radius-sm) bg-s2"
        />
      )}
    </AnimatePresence>
  );
}
