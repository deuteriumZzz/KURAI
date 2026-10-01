"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Archive, ChevronRight, EllipsisVertical, FolderClosed, Images, LayoutGrid, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, SquarePen, UserRound, Wallet, Flame, type LucideIcon } from "lucide-react";
import type { Balance, ChatSummary, Project, User } from "@/types/api";
import { KuraiMark } from "@/components/brand/mark";
import { Initials } from "@/components/brand/avatar";
import { formatCredits } from "@/lib/format";
import { createProject as createOfflineProject, projectChatIds } from "@/lib/projects";
import { kuraiApi } from "@/lib/kurai-api";
import { cn } from "@/lib/cn";
import { Segments } from "@/components/fx/primitives";
import { chatsStore, projectsStore } from "@/lib/app-state";
import { useStore } from "@/lib/store";
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

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  onSearch: () => void;
  onNavigate?: () => void;
  chats: ChatSummary[];
  /** null — баланс ещё не получен от сервера. */
  balance: Balance | null;
  user: User;
  now: Date;
};

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

/** Левая рейка Command Deck: создание, основные разделы, проекты, история и аккаунт. */
export function Sidebar({ collapsed, onToggle, onSearch, onNavigate, chats, balance, user, now }: Props) {
  const pathname = usePathname();
  // шторка и десктоп рендерят по рейке — у каждой своё меню аккаунта
  const accountMenu = useId();
  const projects = useStore(projectsStore);
  const projectChats = projectChatIds(projects);
  const history = chats
    .filter((chat) => !projectChats.has(chat.id))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const [removed, setRemoved] = useState<ChatSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => {
    if (!removed && !actionError) return;
    const t = setTimeout(() => {
      setRemoved(null);
      setActionError(null);
    }, 6000);
    return () => clearTimeout(t);
  }, [removed, actionError]);

  const patchChat = (id: string, change: Partial<ChatSummary>) => chatsStore.set((xs) => xs.map((x) => (x.id === id ? { ...x, ...change } : x)));
  /** Изменение видно сразу; в рабочем режиме сохраняется на сервере, при отказе — откатывается с объяснением. */
  function persist(id: string, patch: { title?: string; pinned?: boolean; archived?: boolean }, rollback: () => void) {
    if (!kuraiApi) return;
    kuraiApi.updateChat(id, patch).catch(() => {
      rollback();
      setActionError("Не удалось сохранить изменение — проверьте соединение.");
    });
  }

  const item = (active: boolean) =>
    cn(
      "k-rail-item flex h-9 items-center gap-3 rounded-(--radius-sm) px-3 text-[14px] pointer-coarse:h-11",
      active ? "bg-s2 text-ink" : "text-ink2 hover:bg-s1 hover:text-ink",
      collapsed && "justify-center px-0",
    );

  return (
    <aside aria-label="Навигация" className={cn("k-rail flex h-full flex-col transition-[width] duration-(--dur-rail) ease-(--ease-out)", collapsed ? "w-16" : "w-[272px]")}>
      <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "justify-between pr-2 pl-5")}>
        {!collapsed && (
          <Link href="/app" onClick={onNavigate} aria-label="KURAI — новая задача">
            <Wordmark />
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
          className="grid size-8 cursor-pointer place-items-center rounded-(--radius-sm) text-ink3 hover:bg-s2 hover:text-ink max-md:hidden"
        >
          {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.5} /> : <PanelLeftClose size={16} strokeWidth={1.5} />}
        </button>
      </div>

      <div className="flex flex-col gap-0.5 px-3">
        <Link href="/app" onClick={onNavigate} aria-label={collapsed ? "Новый чат" : undefined} className={cn(item(false), "mb-2 bg-s2 text-ink hover:bg-s3")}>
          <SquarePen size={16} strokeWidth={1.5} className="shrink-0" />
          {!collapsed && (
            <span className="k-shift flex flex-1 items-center justify-between">
              Новый чат <span className="k-kbd">N</span>
            </span>
          )}
          <Hint k="N" />
        </Link>
        <button type="button" onClick={onSearch} aria-label={collapsed ? "Поиск" : undefined} className={cn(item(false), "cursor-pointer")}>
          <Search size={16} strokeWidth={1.5} className="shrink-0 text-ink3" />
          {!collapsed && (
            <span className="k-shift flex flex-1 items-center justify-between">
              Поиск <span className="k-kbd">⌘K</span>
            </span>
          )}
          <Hint k="⌘K" />
        </button>
        <Inbox collapsed={collapsed} onNavigate={onNavigate} />
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} aria-label={collapsed ? label : undefined} className={item(active)}>
              <Icon size={16} strokeWidth={1.5} className={cn("shrink-0", active ? "text-ink" : "text-ink3")} />
              {!collapsed && <span className="k-shift">{label}</span>}
            </Link>
          );
        })}
      </div>

      <nav aria-label="Проекты и история" className={cn("mt-6 min-h-0 flex-1 overflow-y-auto px-3 pb-4", collapsed && "invisible")}>
        <Projects projects={projects} chats={chats} pathname={pathname} onNavigate={onNavigate} />
        <section aria-label="Чаты" className="mt-6">
          <h2 className="px-3 pb-2 text-[12.5px] text-ink3">Чаты</h2>
          {history.length === 0 && <p className="px-3 py-2 text-[12.5px] leading-relaxed text-ink3">Здесь появятся ваши диалоги. Начните с поля ввода.</p>}
          <ul className="flex flex-col">
            {history.map((c) => (
              <li key={c.id}>
                <ChatRow
                  chat={c}
                  now={now}
                  active={pathname === `/app/c/${c.id}`}
                  onNavigate={onNavigate}
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
                  onDelete={() => {
                    setRemoved(c);
                    chatsStore.set((xs) => xs.filter((x) => x.id !== c.id));
                    // в архив, а не стирание: запуски и списания по чату остаются в журнале
                    persist(c.id, { archived: true }, () => {
                      chatsStore.set((xs) => [c, ...xs]);
                      setRemoved(null);
                    });
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      </nav>

      {actionError && !collapsed && (
        <p role="alert" className="mx-3 mb-2 rounded-(--radius-sm) border border-err/40 bg-err-soft px-3 py-2 text-[12.5px] text-err">{actionError}</p>
      )}
      {removed && !collapsed && (
        <div role="status" className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-(--radius-sm) border border-line bg-g2 px-3 py-2 text-[12.5px]">
          <span className="truncate text-ink2">Чат убран из истории</span>
          <button
            type="button"
            onClick={() => {
              const chat = removed;
              chatsStore.set((xs) => [chat, ...xs]);
              setRemoved(null);
              persist(chat.id, { archived: false }, () => chatsStore.set((xs) => xs.filter((x) => x.id !== chat.id)));
            }}
            className="shrink-0 cursor-pointer text-ink underline underline-offset-2 hover:text-acc"
          >
            Вернуть
          </button>
        </div>
      )}

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
                <span className="k-meta text-[11px]">
                  {balance ? formatCredits(balance.micro) : "баланс загружается"}
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
          className="fixed inset-auto bottom-20 left-3 m-0 w-64 rounded-(--radius-md) border border-line2 bg-g1 p-1.5 text-ink shadow-(--shadow-float)"
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
    </aside>
  );
}

function Projects({ projects, chats, pathname, onNavigate }: { projects: Project[]; chats: ChatSummary[]; pathname: string; onNavigate?: () => void }) {
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [open, setOpen] = useState<string | null>(() => projects.find((p) => p.chatIds.some((id) => pathname === `/app/c/${id}`))?.id ?? null);

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
        <Link href="/app/projects" onClick={onNavigate} className="text-[12.5px] text-ink3 hover:text-ink">
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
                aria-expanded={expanded}
                data-active={hasActive && !expanded ? "true" : undefined}
                className="k-rail-item flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-(--radius-sm) px-3 text-left text-[13.5px] text-ink2 hover:bg-s1 hover:text-ink pointer-coarse:h-11"
              >
                <ChevronRight size={14} strokeWidth={1.5} className={cn("-ml-1 shrink-0 text-ink3 transition-transform duration-(--dur-rail)", expanded && "rotate-90")} />
                <FolderClosed size={15} strokeWidth={1.5} className="shrink-0 text-ink3" />
                <span className="k-shift min-w-0 flex-1 truncate">{project.name}</span>
                <span className="k-meta text-[10.5px]">{own.length}</span>
              </button>
              {expanded && (
                <ul className="mt-px mb-1 ml-[22px] border-l border-line pl-2">
                  {own.length > 0 ? (
                    own.map((chat) => {
                      const active = pathname === `/app/c/${chat.id}`;
                      return (
                        <li key={chat.id}>
                          <Link
                            href={`/app/c/${chat.id}`}
                            onClick={onNavigate}
                            aria-current={active ? "page" : undefined}
                            className={cn("k-chat-row block truncate rounded-(--radius-sm) py-1.5 pr-2 pl-3 text-[13px]", active ? "bg-s2 text-ink" : "text-ink2 hover:bg-s1 hover:text-ink")}
                          >
                            {chat.title}
                          </Link>
                        </li>
                      );
                    })
                  ) : (
                    <li className="py-1.5 pl-3 text-[12.5px] text-ink3">Пока без чатов</li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
