"use client";

import { Appear } from "@/components/fx/motion";
import Link from "next/link";
import { KuraiLogo, KuraiMark } from "@/components/brand/mark";
import { Avatar } from "@/components/brand/avatar";
import { FlapNumber } from "@/components/fx/flap-number";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, Flame, Gift, Images, LayoutGrid, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, UserRound, Wallet, type LucideIcon } from "lucide-react";
import type { Balance, ChatSummary, Mode, User } from "@/types/api";
import { modeById } from "@/lib/modes";
import { ModeIcon } from "@/components/brand/mode-icons";
import { formatCredits, groupChats } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Label, Segments } from "@/components/fx/primitives";
import { Hint } from "./hint";
import { ChatRow } from "./chat-row";
import { Inbox } from "./inbox";
import { chatsStore } from "@/lib/app-state";
import { useEffect, useState } from "react";

const TOOLS: Mode[] = ["image", "video", "research", "slides", "audio"];

const MENU: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app/profile", label: "Профиль", icon: UserRound },
  { href: "/app/media", label: "Медиатека", icon: Images },
  { href: "/app/explore", label: "Тренды и шаблоны", icon: Flame },
  { href: "/app/billing", label: "Баланс и тарифы", icon: Wallet },
  { href: "/app/settings", label: "Настройки", icon: Settings },
];

const PLAN = { free: "Free", pro: "Pro", ultra: "Ultra" } as const;

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  onSearch: () => void;
  onNavigate?: () => void;
  chats: ChatSummary[];
  balance: Balance;
  user: User;
  now: Date;
};

export function Sidebar({ collapsed, onToggle, onSearch, onNavigate, chats, balance, user, now }: Props) {
  const pathname = usePathname();
  const groups = groupChats(chats, now);
  const [removed, setRemoved] = useState<ChatSummary | null>(null);
  useEffect(() => {
    if (!removed) return;
    const t = setTimeout(() => setRemoved(null), 6000);
    return () => clearTimeout(t);
  }, [removed]);
  const itemCls = (active: boolean) =>
    cn(
      "relative flex h-[38px] items-center gap-3 rounded-(--radius-field) px-2.5 text-[14px] transition-colors duration-(--dur-fast) pointer-coarse:h-11 [&>svg]:text-ink3 hover:[&>svg]:text-ink2",
      active ? "bg-s2 text-ink" : "text-ink2 hover:bg-s1 hover:text-ink",
      collapsed && "justify-center px-0",
    );

  return (
    <aside
      aria-label="Навигация"
      className={cn(
        "flex h-full flex-col bg-g1 transition-[width] duration-(--dur-base) ease-(--ease-out)",
        collapsed ? "w-14" : "w-[260px]",
      )}
    >
      <div className={cn("flex h-14 items-center px-3", collapsed ? "justify-center" : "justify-between")}>
        {collapsed && <KuraiMark className="size-6 max-md:hidden" />}
        {!collapsed && (
          <Link href="/app" onClick={onNavigate} aria-label="KURAI — главная">
            <KuraiLogo />
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
          className="grid size-8 cursor-pointer place-items-center text-ink2 hover:text-ink max-md:hidden"
        >
          {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.5} /> : <PanelLeftClose size={16} strokeWidth={1.5} />}
        </button>
      </div>

      <div className="isolate flex flex-col gap-0.5 px-2">
        <Link
          href="/app"
          onClick={onNavigate}
          title="Новый чат"
          className={cn(
            "relative mb-3 flex h-[38px] items-center gap-3 rounded-(--radius-field) bg-s2 px-2.5 text-[14px] text-ink hover:bg-s3 pointer-coarse:h-11",
            collapsed && "justify-center px-0",
          )}
        >
          <Plus size={16} strokeWidth={1.5} />
          {!collapsed && (
            <>
              Новый чат <Label className="ml-auto text-[11px]">N</Label>
            </>
          )}
          <Hint k="N" />
        </Link>
        <button type="button" onClick={onSearch} title="Поиск и команды" className={cn(itemCls(false), "cursor-pointer")}>
          <Search size={16} strokeWidth={1.5} />
          {!collapsed && (
            <>
              Поиск <Label className="ml-auto text-[11px]">⌘K</Label>
            </>
          )}
          <Hint k="⌘K" />
        </button>
        <Inbox collapsed={collapsed} onNavigate={onNavigate} />

        {!collapsed && <Label className="block px-2.5 pt-4 pb-1.5">Инструменты</Label>}
        {TOOLS.map((m) => (
          <Link key={m} href={`/app?mode=${m}`} onClick={onNavigate} aria-label={collapsed ? modeById(m).label : undefined} data-tip={collapsed ? modeById(m).label : undefined} className={itemCls(false)}>
            <ModeIcon mode={m} />
            {!collapsed && modeById(m).label}
          </Link>
        ))}
        <Link href="/app/models" onClick={onNavigate} aria-current={pathname === "/app/models" ? "page" : undefined} aria-label={collapsed ? "Все модели" : undefined} data-tip={collapsed ? "Все модели" : undefined} className={itemCls(pathname === "/app/models")}>
          <LayoutGrid size={16} strokeWidth={1.5} />
          {!collapsed && (
            <>
              Все модели <Label className="ml-auto text-[11px]">300+</Label>
            </>
          )}
        </Link>
      </div>

      <nav aria-label="История чатов" className={cn("mt-3 flex-1 overflow-y-auto px-2 pb-3", collapsed && "invisible")}>
        {groups.length === 0 && <p className="px-2.5 py-4 text-[12.5px] text-ink3">Чатов пока нет — начните с поля ввода на главной.</p>}
        {groups.map((g) => (
          <div key={g.label} className="mt-3 first:mt-0">
            <Label className="block px-2.5 pb-1">{g.label}</Label>
            {g.chats.map((c, i) => (
              <Appear key={c.id} index={i} delay={0.1}>
                <ChatRow
                  chat={c}
                  active={pathname === `/app/c/${c.id}`}
                  onNavigate={onNavigate}
                  onPin={() => chatsStore.set((xs) => xs.map((x) => (x.id === c.id ? { ...x, pinned: !x.pinned } : x)))}
                  onRename={(title) => chatsStore.set((xs) => xs.map((x) => (x.id === c.id ? { ...x, title } : x)))}
                  onDelete={() => {
                    setRemoved(c);
                    chatsStore.set((xs) => xs.filter((x) => x.id !== c.id));
                  }}
                />
              </Appear>
            ))}
          </div>
        ))}
      </nav>

      {removed && !collapsed && (
        <div role="status" className="mx-2 mb-2 flex items-center justify-between gap-2 border border-line2 bg-g2 px-2.5 py-2 text-[12.5px]">
          <span className="truncate text-ink2">Чат удалён</span>
          <button
            type="button"
            onClick={() => {
              chatsStore.set((xs) => [removed, ...xs]);
              setRemoved(null);
            }}
            className="shrink-0 cursor-pointer text-acc hover:underline"
          >
            Вернуть
          </button>
        </div>
      )}
      {!collapsed && <Invite />}
      <div className={cn("p-3 pt-2", collapsed && "px-1.5")}>
        <button
          type="button"
          popoverTarget="account-menu"
          className={cn("flex w-full cursor-pointer items-center gap-2.5 rounded-(--radius-field) p-1.5 text-left hover:bg-s2", collapsed && "justify-center")}
        >
          <Avatar seed={user.email} />
          {!collapsed && (
            <span className="min-w-0 flex-1 text-[13px] leading-tight">
              <span className="block truncate">{user.name}</span>
              <Label className="text-[11.5px]">{PLAN[balance.plan]}</Label>
            </span>
          )}
          {!collapsed && <FlapNumber value={formatCredits(balance.micro)} className="font-mono text-[12.5px] text-ink2 tabular-nums" />}
          {!collapsed && <ChevronsUpDown size={14} strokeWidth={1.5} className="text-ink3" />}
        </button>
        <div
          id="account-menu"
          popover="auto"
          onClick={(e) => (e.target as Element).closest("a") && e.currentTarget.hidePopover()}
          className="fixed border-0 inset-auto bottom-16 left-2 m-0 w-60 rounded-(--radius-field) bg-g2 p-1.5 text-ink shadow-(--shadow-float)"
        >
          <Link href="/app/billing" onClick={onNavigate} className="mb-1 block rounded-[calc(var(--radius-field)-6px)] bg-s1 px-2.5 py-2">
            <span className="mb-1.5 flex items-baseline justify-between text-[12.5px] text-ink2">
              Баланс <span className="font-mono text-[14px] text-ink tabular-nums">{formatCredits(balance.micro)}</span>
            </span>
            <Segments value={balance.micro / balance.monthlyGrantMicro} label="Баланс относительно месячного начисления" />
          </Link>
          {MENU.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={onNavigate} aria-current={pathname === href ? "page" : undefined} className={cn(itemCls(pathname === href), "rounded-[calc(var(--radius-field)-6px)]")}>
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}

/** «Пригласите друга» — копирует реферальную ссылку. */
function Invite() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(`${location.origin}/r/u_1`).catch(() => {});
        setCopied(true);
      }}
      className="mx-3 flex cursor-pointer items-center gap-3 rounded-(--radius-field) bg-s1 p-3 text-left text-[13.5px] text-ink hover:bg-s2"
    >
      {copied ? <Check size={18} strokeWidth={1.5} className="shrink-0 text-acc" /> : <Gift size={18} strokeWidth={1.5} className="shrink-0 text-acc" />}
      <span>
        {copied ? "Ссылка скопирована" : "Пригласите друга"}
        <span className="block text-[12.5px] text-ink3">+200 кредитов вам и другу</span>
      </span>
    </button>
  );
}
