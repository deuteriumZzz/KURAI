"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { AnimatePresence, MotionConfig, animate, motion, useMotionValue, useTransform } from "motion/react";
import { MOCK_NOW } from "@/mocks/data";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { balanceStore, chatsStore, ledgerStore, memberStore, notify, projectsStore, refreshBalance, toLedgerRows } from "@/lib/app-state";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { Sidebar } from "./sidebar";
import { applyPrefs, readPrefs } from "@/lib/prefs";
import { CommandPalette } from "./command-palette";
import { OfflineBanner, VerifyBanner } from "./offline-banner";
import { Lightbox } from "@/components/media/lightbox";
import { Shortcuts } from "./shortcuts";
import { useCalm } from "@/lib/use-calm";
import { kuraiApi } from "@/lib/kurai-api";
import { MOTION, SPRING, flyTo, isCalm, retrigger } from "@/lib/motion";
import { IncomingToast } from "@/components/chat/toast";
import { settleTracked, trackedStore } from "@/lib/tracked";
import { formatCredits } from "@/lib/format";

const COLLAPSE_KEY = "kurai:sidebar-collapsed";
const DRAWER = 288;

function isTyping(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/** 64 — нажатая горячая клавиша вспыхивает на своей кнопке: видно, что сработало именно это. */
function flashKbd(key: string) {
  document.querySelectorAll(`[data-kbd="${key}"]`).forEach((el) => retrigger(el, "k-kbd-flash"));
}

/** Каркас кабинета: сайдбар (десктоп — сворачивается, телефон — шторка за пальцем), ⌘K, горячие клавиши, режим подсказок Alt. */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [paletteOrigin, setPaletteOrigin] = useState<DOMRect | null>(null);
  const [help, setHelp] = useState(false);
  const [focus, setFocus] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [navPending, setNavPending] = useState(false);
  const [doneToast, setDoneToast] = useState<{ title: string; href?: string } | null>(null);
  const navTimer = useRef(0);
  const swipe = useRef<{ x: number; y: number; t: number; edge: boolean } | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const calm = useCalm();
  useFocusTrap(drawer, drawerRef);
  const chats = useStore(chatsStore);
  const member = useStore(memberStore);
  const balance = useStore(balanceStore);
  const tracked = useStore(trackedStore);
  // 81 — шторка едет за пальцем: одно значение сдвига для панели и затемнения
  const drawerX = useMotionValue(-DRAWER);
  const shade = useTransform(drawerX, [-DRAWER, 0], [0, 1]);

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
        memberStore.set({ id: current.id, email: current.email, name: current.displayName, emailVerified: current.emailVerified });
        chatsStore.set(() => workspace.chats);
        projectsStore.set(() => workspace.projects);
        balanceStore.set({ micro: ledger.availableMicro, plan: "free", planUntil: null, monthlyGrantMicro: 100_000 });
        ledgerStore.set(() => toLedgerRows(ledger.entries));
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
    setMounted(true);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  // команда «Свернуть левую панель» из ⌘K
  useEffect(() => {
    const on = () =>
      setCollapsed((c) => {
        try {
          localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
        } catch {}
        return !c;
      });
    window.addEventListener("kurai:toggle-rail", on);
    return () => window.removeEventListener("kurai:toggle-rail", on);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        flashKbd("k");
        setPaletteOrigin(null);
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
      } else if (e.key === "[" || e.key === "х") {
        // как в Linear: квадратная скобка сворачивает рейку (на русской раскладке — «х»)
        e.preventDefault();
        flashKbd("[");
        setCollapsed((c) => {
          try {
            localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
          } catch {}
          return !c;
        });
      } else if (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "т") {
        e.preventDefault();
        flashKbd("n");
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

  // 76 — полоса загрузки сверху появляется, только если переход в раздел длится дольше 300 мс
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== location.origin || a.pathname === location.pathname) return;
      window.clearTimeout(navTimer.current);
      // ponytail: клик без перехода (выделение чата) снимается потолком в 8 с, а не точным сигналом от роутера
      navTimer.current = window.setTimeout(() => {
        setNavPending(true);
        navTimer.current = window.setTimeout(() => setNavPending(false), 8000);
      }, 300);
    };
    // capture: Next <Link> сам делает preventDefault на всплытии, поэтому слушаем до него
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(navTimer.current);
    };
  }, []);
  useEffect(() => {
    window.clearTimeout(navTimer.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavPending(false);
  }, [pathname]);

  // 81 — открытие и закрытие шторки доезжает пружиной (жест пальцем двигает её напрямую)
  useEffect(() => {
    const controls = animate(drawerX, drawer ? 0 : -DRAWER, calm ? { duration: 0 } : SPRING.release);
    return () => controls.stop();
  }, [drawer, calm, drawerX]);

  // К12 — отслеживаемая задача идёт, а чат закрыт: статус уточняется опросом сервера
  const trackedId = tracked?.status === "running" ? tracked.runId : null;
  const trackedOpen = tracked ? pathname === `/app/c/${tracked.chatId}` : false;
  useEffect(() => {
    const api = kuraiApi;
    if (!api || !trackedId || trackedOpen) return;
    const t = window.setInterval(() => {
      void api
        .getRun(trackedId)
        .then((run) => {
          // чат закрыт — шаг берём из статуса сервера, а не замораживаем последний увиденный
          if (!["completed", "failed", "canceled"].includes(run.status)) return settleTracked(trackedId, { step: run.status === "queued" ? "в очереди" : "выполняется" });
          const done = run.status === "completed";
          settleTracked(trackedId, { status: done ? "done" : "error" });
          const current = trackedStore.get();
          const title = `${done ? "Готово" : "Не удалось"} · ${current?.title ?? "задача"}`;
          const href = current ? `/app/c/${current.chatId}` : undefined;
          refreshBalance();
          // 39 — сообщение показывается, затем улетает в колокольчик; счётчик «Входящих» растёт, когда оно долетело
          if (isCalm()) return notify(title, href);
          setDoneToast({ title, href });
          window.setTimeout(() => {
            const toast = document.querySelector("[data-shell-toast] [data-toast]");
            const bell = [...document.querySelectorAll('button[aria-label^="Входящие"]')].find((el) => el.getClientRects().length > 0);
            setDoneToast(null);
            void (toast && bell ? flyTo(toast, bell, { endScale: 0.15, ms: 560 }) : Promise.resolve()).then(() => notify(title, href));
          }, 1400);
        })
        .catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(t);
  }, [trackedId, trackedOpen]);

  const sidebar = (mobile: boolean) => (
    <Sidebar
      collapsed={mobile ? false : collapsed}
      onToggle={toggle}
      onSearch={(origin) => {
        setDrawer(false);
        setPaletteOrigin(mobile ? null : (origin ?? null));
        flashKbd("k");
        setPalette(true);
      }}
      onNavigate={mobile ? () => setDrawer(false) : undefined}
      chats={chats}
      balance={balance}
      user={member}
      now={kuraiApi ? new Date() : MOCK_NOW}
    />
  );

  // разделы кабинета меняются мягким кроссфейдом центра; рейка остаётся на месте
  const section = pathname.split("/")[2] ?? "";

  return (
    <MotionConfig reducedMotion={calm ? "always" : "user"}>
      <div
        className="kurai-app flex h-dvh overflow-hidden"
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) swipe.current = { x: t.clientX, y: t.clientY, t: performance.now(), edge: !drawer && t.clientX < 28 };
        }}
        onTouchMove={(e) => {
          const start = swipe.current;
          const t = e.touches[0];
          if (!start?.edge || !t) return;
          const dx = t.clientX - start.x;
          if (dx > 0 && Math.abs(t.clientY - start.y) < dx) drawerX.set(Math.min(0, -DRAWER + dx));
        }}
        onTouchEnd={(e) => {
          const start = swipe.current;
          const t = e.changedTouches[0];
          swipe.current = null;
          if (!start?.edge || !t) return;
          const dx = t.clientX - start.x;
          const speed = dx / Math.max(1, performance.now() - start.t);
          const open = dx > DRAWER * 0.35 || speed > 0.5;
          if (open) setDrawer(true);
          else void animate(drawerX, -DRAWER, SPRING.release);
        }}
      >
        {/* клавиатура: первым — переход к рабочей области, мимо пунктов меню */}
        <a href="#k-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-(--z-toast) focus:rounded-(--radius-sm) focus:bg-acc focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium focus:text-acc-ink">
          Перейти к рабочей области
        </a>
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
          <motion.div onClick={() => setDrawer(false)} style={{ opacity: shade }} className="absolute inset-0 bg-bg/70" />
          <motion.div
            style={{ x: drawerX }}
            drag={drawer && !calm ? "x" : false}
            dragDirectionLock
            dragConstraints={{ left: -DRAWER, right: 0 }}
            dragElastic={0.04}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60 || info.velocity.x < -400) setDrawer(false);
              else void animate(drawerX, 0, SPRING.release);
            }}
            className="absolute inset-y-0 left-0"
          >
            {sidebar(true)}
          </motion.div>
        </div>

        <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
          <AnimatePresence>
            {navPending && (
              <motion.i
                key="nav"
                aria-hidden="true"
                initial={{ scaleX: 0, opacity: 1 }}
                animate={{ scaleX: 0.85 }}
                exit={{ scaleX: 1, opacity: 0, transition: { duration: MOTION.base / 1000 } }}
                transition={{ duration: 2.4, ease: "easeOut" }}
                className="absolute inset-x-0 top-0 z-30 h-0.5 origin-left bg-acc"
              />
            )}
          </AnimatePresence>
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
          <VerifyBanner />
          <motion.div
            id="k-main"
            tabIndex={-1}
            key={section}
            initial={mounted ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: MOTION.base / 1000 }}
            className="flex min-h-0 min-w-0 flex-1 flex-col outline-none"
          >
            {children}
          </motion.div>
        </div>

        <BootSequence />
        <AnimatePresence>
          {doneToast && (
            <div key="shell-toast" data-shell-toast>
              <IncomingToast
                title={doneToast.title}
                onClose={() => setDoneToast(null)}
                onOpen={() => {
                  if (doneToast.href) router.push(doneToast.href);
                  setDoneToast(null);
                }}
              />
            </div>
          )}
        </AnimatePresence>
        <CommandPalette open={palette} origin={paletteOrigin} onClose={() => setPalette(false)} chats={chats} />
        <Lightbox />
        <Shortcuts open={help} onClose={() => setHelp(false)} />
      </div>
    </MotionConfig>
  );
}

/**
 * К3 — вход в систему после логина: около секунды строки с реальными данными сеанса,
 * затем всё растворяется в кабинет. Один раз за вход; клик или клавиша — пропустить.
 */
function BootSequence() {
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState(0);
  const member = useStore(memberStore);
  const balance = useStore(balanceStore);
  const chats = useStore(chatsStore);
  const projects = useStore(projectsStore);

  useEffect(() => {
    let flag = false;
    try {
      flag = sessionStorage.getItem("kurai:boot") === "1";
      sessionStorage.removeItem("kurai:boot");
    } catch {}
    if (!flag || readPrefs().calm || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- одноразовый флаг входа из sessionStorage
    setOn(true);
  }, []);

  const lines = [
    member.email && `сеанс открыт · ${member.email}`,
    balance && `баланс · ${formatCredits(balance.micro)}`,
    `задач в истории · ${chats.length}`,
    `проектов · ${projects.length}`,
  ].filter(Boolean) as string[];

  useEffect(() => {
    if (!on) return;
    const step = setInterval(() => setShown((n) => n + 1), 170);
    const end = setTimeout(() => setOn(false), 1250);
    const skip = () => setOn(false);
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      clearInterval(step);
      clearTimeout(end);
      window.removeEventListener("keydown", skip);
    };
  }, [on]);

  return (
    <AnimatePresence>
      {on && (
        <motion.div
          role="status"
          aria-label="Загрузка сеанса"
          onClick={() => setOn(false)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-(--z-overlay) grid cursor-pointer place-items-center bg-bg"
        >
          <div className="w-[min(26rem,calc(100vw-2rem))] font-mono text-[12.5px] leading-relaxed">
            <p className="k-index mb-3 text-acc">KURAI · вход в систему</p>
            {lines.slice(0, shown).map((line) => (
              <motion.p key={line} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.14 }} className="text-ink2">
                <span className="text-acc">›</span> {line}
              </motion.p>
            ))}
            {shown > lines.length && <p className="mt-2 text-ink">доступ разрешён<span className="fx-caret">▍</span></p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
