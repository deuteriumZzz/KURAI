"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Images, PanelLeftClose, PanelLeftOpen, Pin, Plus, Search, Settings, Wallet, type LucideIcon } from "lucide-react";
import type { Balance, ChatSummary, User } from "@/types/api";
import { formatCredits, groupChats } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Label, Segments } from "@/components/fx/primitives";
import { Hint } from "./hint";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app", label: "Главная", icon: House },
  { href: "/app/media", label: "Медиатека", icon: Images },
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
  const itemCls = (active: boolean) =>
    cn(
      "relative flex h-9 items-center gap-2.5 px-2.5 text-[13.5px] transition-colors duration-(--dur-fast) pointer-coarse:h-11",
      active ? "bg-g2 text-ink shadow-[inset_2px_0_0_var(--color-acc)]" : "text-ink2 hover:bg-g2 hover:text-ink",
      collapsed && "justify-center px-0",
    );

  return (
    <aside
      aria-label="Навигация"
      className={cn(
        "flex h-full flex-col border-r border-line bg-g1 transition-[width] duration-(--dur-base) ease-(--ease-out)",
        collapsed ? "w-14" : "w-64",
      )}
    >
      <div className={cn("flex h-14 items-center px-3", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <Link href="/app" onClick={onNavigate} className="font-display text-[15px] font-medium tracking-[0.42em]">
            KUR<span className="text-acc">A</span>I
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

      <div className="flex flex-col gap-1 px-2">
        <Link
          href="/app"
          onClick={onNavigate}
          title="Новый чат"
          className={cn(
            "fx-chamfer relative flex h-9 items-center gap-2.5 border border-line2 px-2.5 text-[13.5px] text-ink [--ch:var(--chamfer-sm)] hover:border-acc-line pointer-coarse:h-11",
            collapsed && "justify-center px-0",
          )}
        >
          <Plus size={16} strokeWidth={1.5} />
          {!collapsed && (
            <>
              Новый чат <Label className="ml-auto text-[10px]">N</Label>
            </>
          )}
          <Hint k="N" />
        </Link>
        <button type="button" onClick={onSearch} title="Поиск и команды" className={cn(itemCls(false), "cursor-pointer")}>
          <Search size={16} strokeWidth={1.5} />
          {!collapsed && (
            <>
              Поиск <Label className="ml-auto text-[10px]">⌘K</Label>
            </>
          )}
          <Hint k="⌘K" />
        </button>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={onNavigate} title={label} aria-current={pathname === href ? "page" : undefined} className={itemCls(pathname === href)}>
            <Icon size={16} strokeWidth={1.5} />
            {!collapsed && label}
          </Link>
        ))}
      </div>

      <nav aria-label="История чатов" className={cn("mt-3 flex-1 overflow-y-auto px-2 pb-3", collapsed && "invisible")}>
        {groups.map((g) => (
          <div key={g.label} className="mt-3 first:mt-0">
            <Label className="block px-2.5 pb-1">{g.label}</Label>
            {g.chats.map((c) => {
              const href = `/app/c/${c.id}`;
              return (
                <Link key={c.id} href={href} onClick={onNavigate} aria-current={pathname === href ? "page" : undefined} className={cn(itemCls(pathname === href), "h-8 text-[13px]")}>
                  <span className="truncate">{c.title}</span>
                  {c.pinned && <Pin size={12} strokeWidth={1.5} className="ml-auto shrink-0 text-ink3" aria-label="Закреплён" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-line p-3", collapsed && "px-2")}>
        {!collapsed && (
          <Link href="/app/billing" onClick={onNavigate} className="mb-3 block">
            <span className="mb-1.5 flex items-baseline justify-between text-[12.5px] text-ink2">
              Баланс <span className="font-mono text-[15px] text-ink tabular-nums">{formatCredits(balance.micro)}</span>
            </span>
            <Segments value={balance.micro / balance.monthlyGrantMicro} label="Баланс относительно месячного начисления" />
          </Link>
        )}
        <Link href="/app/profile" onClick={onNavigate} className={cn("flex items-center gap-2.5 hover:text-acc", collapsed && "justify-center")}>
          <span className="grid size-8 shrink-0 place-items-center border border-line2 bg-g3 font-mono text-[12px]">
            {user.name.slice(0, 2).toUpperCase()}
          </span>
          {!collapsed && (
            <span className="min-w-0 text-[13px] leading-tight">
              <span className="block truncate">{user.name}</span>
              <Label className="text-[10px]">
                {PLAN[balance.plan]}
                {balance.planUntil && ` · до ${new Date(balance.planUntil).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", timeZone: "UTC" })}`}
              </Label>
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}
