"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { MOCK_BALANCE, MOCK_NOW, MOCK_USER } from "@/mocks/data";
import { chatsStore } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Sidebar } from "./sidebar";
import { applyPrefs, readPrefs } from "@/lib/prefs";
import { CommandPalette } from "./command-palette";
import { OfflineBanner } from "./offline-banner";
import { Lightbox } from "@/components/media/lightbox";
import { NavProgress } from "./nav-progress";
import { Shortcuts } from "./shortcuts";
import { GridPulse } from "./grid-pulse";
import { MotionConfig } from "motion/react";
import { useCalm } from "@/lib/use-calm";

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
  const [help, setHelp] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const calm = useCalm();
  const chats = useStore(chatsStore);

  useEffect(() => applyPrefs(readPrefs()), []);

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
      if (e.key === "?") {
        e.preventDefault();
        setHelp(true);
      } else if (e.key === "/") {
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
      chats={chats}
      balance={MOCK_BALANCE}
      user={MOCK_USER}
      now={MOCK_NOW}
    />
  );

  return (
    <MotionConfig reducedMotion={calm ? "always" : "user"}>
    <div
      className="flex h-dvh overflow-hidden"
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) swipe.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = swipe.current;
        const t = e.changedTouches[0];
        swipe.current = null;
        if (!start || !t) return;
        const dx = t.clientX - start.x;
        const dy = Math.abs(t.clientY - start.y);
        // свайп от левого края открывает шторку, свайп влево — закрывает
        if (!drawer && start.x < 28 && dx > 60 && dy < 60) setDrawer(true);
        if (drawer && dx < -60 && dy < 60) setDrawer(false);
      }}
    >
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

      <NavProgress />
      <div
        className="relative isolate flex min-w-0 flex-1 flex-col"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
        }}
      >
        <div className="fx-backdrop -z-10" aria-hidden="true" />
        <div className="fx-spotlight -z-10" aria-hidden="true" />
        <GridPulse />
        <span aria-hidden="true" className="pointer-events-none absolute top-2 right-2 -z-10 size-3.5 border-t border-r border-line2" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-2 left-2 -z-10 size-3.5 border-b border-l border-line2" />
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Открыть меню"
          className="absolute top-3 left-3 z-10 grid size-11 cursor-pointer place-items-center border border-line bg-g1 text-ink2 md:hidden"
        >
          <Menu size={18} strokeWidth={1.5} />
        </button>
        <OfflineBanner />
        {children}
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} chats={chats} />
      <Lightbox />
      <Shortcuts open={help} onClose={() => setHelp(false)} />
    </div>
    </MotionConfig>
  );
}
