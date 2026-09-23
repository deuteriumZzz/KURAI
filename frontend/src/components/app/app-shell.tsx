"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { MOCK_BALANCE, MOCK_CHATS, MOCK_NOW, MOCK_USER } from "@/mocks/data";
import { cn } from "@/lib/cn";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "./command-palette";

const COLLAPSE_KEY = "kurai:sidebar-collapsed";

function isTyping(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/** Каркас кабинета: сайдбар (десктоп — сворачивается, телефон — шторка), ⌘K, горячие клавиши, режим подсказок Alt. */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    try {
      // восстановление пользовательской настройки после гидрации
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  useEffect(() => {
    const root = document.documentElement;
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
        return;
      }
      if (e.key === "Alt") {
        root.classList.add("hints");
        return;
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        const input = document.getElementById("composer-input");
        if (input) {
          e.preventDefault();
          input.focus();
        }
      } else if (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "т") {
        e.preventDefault();
        router.push("/app");
      }
    };
    const up = (e: KeyboardEvent) => e.key === "Alt" && root.classList.remove("hints");
    const blur = () => root.classList.remove("hints");
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [router]);

  const sidebar = (mobile: boolean) => (
    <Sidebar
      collapsed={mobile ? false : collapsed}
      onToggle={toggle}
      onSearch={() => {
        setDrawer(false);
        setPalette(true);
      }}
      onNavigate={mobile ? () => setDrawer(false) : undefined}
      chats={MOCK_CHATS}
      balance={MOCK_BALANCE}
      user={MOCK_USER}
      now={MOCK_NOW}
    />
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="hidden md:block">{sidebar(false)}</div>

      {/* телефон: шторка */}
      <div className={cn("fixed inset-0 z-40 md:hidden", drawer ? "" : "pointer-events-none")} inert={!drawer}>
        <div
          onClick={() => setDrawer(false)}
          className={cn("absolute inset-0 bg-bg/70 transition-opacity duration-(--dur-base)", drawer ? "opacity-100" : "opacity-0")}
        />
        <div className={cn("absolute inset-y-0 left-0 transition-transform duration-(--dur-base) ease-(--ease-out)", drawer ? "translate-x-0" : "-translate-x-full")}>
          {sidebar(true)}
        </div>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Открыть меню"
          className="absolute top-3 left-3 z-10 grid size-11 cursor-pointer place-items-center border border-line bg-g1 text-ink2 md:hidden"
        >
          <Menu size={18} strokeWidth={1.5} />
        </button>
        {children}
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} chats={MOCK_CHATS} />
    </div>
  );
}
