"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { MOCK_NOW } from "@/mocks/data";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { balanceStore, chatsStore, memberStore, projectsStore } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Sidebar } from "./sidebar";
import { applyPrefs, readPrefs } from "@/lib/prefs";
import { CommandPalette } from "./command-palette";
import { OfflineBanner } from "./offline-banner";
import { Lightbox } from "@/components/media/lightbox";
import { Shortcuts } from "./shortcuts";
import { MotionConfig } from "motion/react";
import { useCalm } from "@/lib/use-calm";
import { kuraiApi } from "@/lib/kurai-api";

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
  const [focus, setFocus] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const calm = useCalm();
  useFocusTrap(drawer, drawerRef);
  const chats = useStore(chatsStore);
  const member = useStore(memberStore);
  const balance = useStore(balanceStore);

  useEffect(() => {
    applyPrefs(readPrefs());
    // «как в системе»: переключаемся вслед за ОС
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const on = () => readPrefs().theme === "system" && applyPrefs(readPrefs());
    mq.addEventListener("change", on);
    return () => {
      mq.removeEventListener("change", on);
      // тема кабинета не переносится на лендинг при клиентском переходе
      document.documentElement.dataset.theme = "dark";
    };
  }, []);

  useEffect(() => {
    if (!kuraiApi) return;
    let active = true;
    void Promise.all([kuraiApi.me(), kuraiApi.getWorkspace(), kuraiApi.ledger()])
      .then(([current, workspace, ledger]) => {
        if (!active) return;
        memberStore.set({ id: current.id, email: current.email, name: current.displayName });
        chatsStore.set(() => workspace.chats);
        projectsStore.set(() => workspace.projects);
        balanceStore.set({ micro: ledger.availableMicro, plan: "free", planUntil: null, monthlyGrantMicro: 100_000 });
      })
      .catch(() => active && router.replace("/login"));
    return () => {
      active = false;
    };
  }, [router]);

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
      // одиночные клавиши не срабатывают, пока открыт модальный слой (шторка, лист, диалог)
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('[aria-modal="true"]')) return;
      if (e.key.toLowerCase() === "f" || e.key.toLowerCase() === "а") {
        e.preventDefault();
        setFocus((f) => !f);
      } else if (e.key === "?") {
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
      balance={balance}
      user={member}
      now={kuraiApi ? new Date() : MOCK_NOW}
    />
  );

  return (
    <MotionConfig reducedMotion={calm ? "always" : "user"}>
    <div
      className="kurai-app flex h-dvh overflow-hidden"
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
      <div className={cn("hidden transition-[margin] duration-(--dur-base) md:block", focus && "md:hidden")}>{sidebar(false)}</div>

      {/* телефон: шторка */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="Навигация"
        aria-modal={drawer || undefined}
        onKeyDown={(e) => e.key === "Escape" && setDrawer(false)}
        className={cn("fixed inset-0 z-40 md:hidden", drawer ? "" : "pointer-events-none")}
        inert={!drawer}
      >
        <div
          onClick={() => setDrawer(false)}
          className={cn("absolute inset-0 bg-bg/70 transition-opacity duration-(--dur-base)", drawer ? "opacity-100" : "opacity-0")}
        />
        <div className={cn("absolute inset-y-0 left-0 transition-transform duration-(--dur-base) ease-(--ease-out)", drawer ? "translate-x-0" : "-translate-x-full")}>
          {sidebar(true)}
        </div>
      </div>

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
        {focus && (
          <button
            type="button"
            onClick={() => setFocus(false)}
            className="absolute top-3 right-3 z-20 inline-flex h-8 items-center gap-2 rounded-(--radius-sm) border border-line bg-g1 px-2.5 text-[12px] text-ink2 hover:text-ink"
          >
            Фокус <span className="k-kbd">F</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Открыть меню"
          className="absolute top-2.5 left-2.5 z-10 grid size-11 cursor-pointer place-items-center rounded-(--radius-sm) text-ink2 hover:bg-s2 hover:text-ink md:hidden"
        >
          <Menu size={18} strokeWidth={1.5} />
        </button>
        <OfflineBanner />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} chats={chats} />
      <Lightbox />
      <Shortcuts open={help} onClose={() => setHelp(false)} />
    </div>
    </MotionConfig>
  );
}
