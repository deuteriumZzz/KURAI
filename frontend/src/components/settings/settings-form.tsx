"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Hatch, Label, SysLine } from "@/components/fx/primitives";
import { playSignal } from "@/lib/sound";
import { DEFAULT_PREFS, readPrefs, writePrefs, type Prefs } from "@/lib/prefs";
import { cn } from "@/lib/cn";
import { revealFrom } from "@/lib/motion";
import type { User } from "@/types/api";
import { Initials } from "@/components/brand/avatar";
import { kuraiApi } from "@/lib/kurai-api";

const MODELS = [
  { id: "auto", label: "Авто", note: "подбираем модель под задачу" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5", note: "тексты и рассуждения" },
  { id: "gpt-5", label: "GPT-5", note: "универсальная" },
  { id: "gemini-flash", label: "Gemini 2.5 Flash", note: "быстрая и дешёвая" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`s-${title}`} className="flex flex-col gap-3">
      <h2 id={`s-${title}`} className="text-[15px] font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SettingsForm({ user }: { user: User }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [exportState, setExportState] = useState<"idle" | "loading" | "done" | "error">("idle");
  // 84 — тема, на которую навели: превью перекрашивается до выбора
  const [hoverTheme, setHoverTheme] = useState<"dark" | "light" | null>(null);

  // localStorage доступен только в браузере — читаем после монтирования
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setPrefs(readPrefs()), []);
  const set = (patch: Partial<Prefs>) => setPrefs(writePrefs(patch));
  const downloadAccountArchive = async () => {
    if (!kuraiApi) return;
    setExportState("loading");
    try {
      const archive = await kuraiApi.exportAccountData();
      const objectUrl = URL.createObjectURL(archive);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "kurai-account-export.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setExportState("done");
    } catch {
      setExportState("error");
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <Section title="Профиль">
        <div className="flex items-center gap-4 bg-s1 p-4 rounded-(--radius-md)">
          <Initials name={user.name} className="size-14 text-[16px]" />
          <div className="flex flex-col gap-1">
            <p className="text-[14px]">Инициалы из имени</p>
            <p className="text-[12.5px] text-ink3">Загрузка своего фото появится вместе с медиахранилищем.</p>
          </div>
        </div>
        <div className="grid gap-px overflow-hidden rounded-(--radius-md) bg-hair sm:grid-cols-2">
          <div className="bg-s1 px-4 py-3 rounded-(--radius-md)">
            <Label>Имя</Label>
            <p className="mt-1 text-[14px]">{user.name}</p>
          </div>
          <div className="bg-s1 px-4 py-3 rounded-(--radius-md)">
            <Label>Email</Label>
            <p className="mt-1 text-[14px]">{user.email}</p>
          </div>
        </div>
      </Section>

      <Section title="Модель по умолчанию">
        <div role="radiogroup" aria-label="Модель по умолчанию" className="grid gap-2 sm:grid-cols-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={prefs.model === m.id}
              data-selected={prefs.model === m.id}
              onClick={() => set({ model: m.id })}
              className={cn("fx-brackets cursor-pointer rounded-(--radius-md) bg-s1 px-4 py-3 text-left transition-colors duration-(--dur-fast)", prefs.model === m.id ? "bg-s2 shadow-[inset_0_0_0_1px_var(--color-acc-line)]" : "hover:bg-s2")}
            >
              <span className="block text-[14px]">{m.label}</span>
              <span className="text-[12.5px] text-ink3">{m.note}</span>
            </button>
          ))}
        </div>
        <Switch label="Поиск в интернете по умолчанию" hint="Модель сможет смотреть свежие источники" checked={prefs.web} onChange={(web) => set({ web })} />
      </Section>

      <Section title="Оформление">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div role="radiogroup" aria-label="Тема" className="grid gap-2 sm:grid-cols-3">
          {([["dark", "Night Ops", "тёмный карбон для долгой работы"], ["light", "Paper", "техническая бумага для чтения днём"], ["system", "Как в системе", "следует за настройкой устройства"]] as const).map(([v, l, h]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={prefs.theme === v}
              onMouseEnter={() => setHoverTheme(v === "system" ? null : v)}
              onMouseLeave={() => setHoverTheme(null)}
              onFocus={() => setHoverTheme(v === "system" ? null : v)}
              onBlur={() => setHoverTheme(null)}
              onClick={(e) => revealFrom(() => set({ theme: v }), { x: e.clientX, y: e.clientY })}
              className={cn("cursor-pointer rounded-(--radius-md) bg-s1 px-4 py-3 text-left transition-colors duration-(--dur-fast) hover:bg-s2", prefs.theme === v && "bg-s2 shadow-[inset_0_0_0_1px_var(--color-acc-line)]")}
            >
              <span className="block text-[14px]">{l}</span>
              <span className="text-[12.5px] text-ink3">{h}</span>
            </button>
          ))}
        </div>
        <ThemePreview theme={hoverTheme ?? (prefs.theme === "light" ? "light" : prefs.theme === "dark" ? "dark" : null)} />
        </div>
        <div role="radiogroup" aria-label="Акцент" className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[13px] text-ink2">Акцент</span>
          {([["lime", "Лайм", "#d8ec98"], ["yellow", "Night City", "#fcee0a"], ["cyan", "Циан", "#5ee6f0"]] as const).map(([v, l, c]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={prefs.accent === v}
              onClick={() => set({ accent: v })}
              className={cn("flex cursor-pointer items-center gap-2 rounded-(--radius-sm) bg-s1 px-3 py-2 text-[13px] transition-colors duration-(--dur-fast) hover:bg-s2", prefs.accent === v && "bg-s2 shadow-[inset_0_0_0_1px_var(--color-acc-line)]")}
            >
              <span aria-hidden="true" className="size-3 rounded-full" style={{ background: c }} />
              {l}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Интерфейс">
        <Switch
          label="Спокойный режим"
          hint="Убирает анимации интерфейса: переходы становятся мгновенными. Все функции работают как обычно."
          checked={prefs.calm}
          onChange={(calm) => set({ calm })}
        />
        <div className="flex flex-col gap-2 bg-s1 px-4 py-3 rounded-(--radius-md)">
          {/* 83 — ползунки: колонка плавно меняет ширину, текст — размер, видно до сохранения */}
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-[14px]">
              Размер текста ответов <span className="font-mono text-[12px] text-ink3">{prefs.readSizePx || { s: 14, m: 15, l: 17 }[prefs.readSize]} px</span>
            </span>
            <input type="range" min={13} max={20} step={0.5} value={prefs.readSizePx || { s: 14, m: 15, l: 17 }[prefs.readSize]} onChange={(e) => set({ readSizePx: Number(e.target.value) })} className="k-range pointer-coarse:h-11" />
          </label>
          <label className="mt-2 flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-[14px]">
              Ширина колонки чата <span className="font-mono text-[12px] text-ink3">{prefs.readWidthRem || (prefs.readWidth === "wide" ? 56 : 42)} rem · {(prefs.readWidthRem || (prefs.readWidth === "wide" ? 56 : 42)) < 48 ? "удобно читать" : "таблицы и код"}</span>
            </span>
            <input type="range" min={34} max={64} step={1} value={prefs.readWidthRem || (prefs.readWidth === "wide" ? 56 : 42)} onChange={(e) => set({ readWidthRem: Number(e.target.value) })} className="k-range pointer-coarse:h-11" />
          </label>
          {/* 83 — колонка и текст меняются вживую: видно результат сразу */}
          <div aria-hidden="true" className="mt-3 overflow-hidden rounded-(--radius-sm) border border-line bg-bg p-3">
            <p className="k-read-preview text-prose leading-[1.7]">
              Колонка ответа плавно меняет ширину, а текст — размер. Так будет выглядеть каждый ответ в чате.
            </p>
          </div>
          <span className="mt-2 text-[14px]">Плотность</span>
          <div role="radiogroup" aria-label="Плотность интерфейса" className="flex w-max gap-1 bg-s2 p-1 rounded-(--radius-sm)">
            {([["comfortable", "Свободно"], ["compact", "Компактно"]] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={prefs.density === v} onClick={() => set({ density: v })} className={cn("cursor-pointer px-3 py-1.5 text-[13px] rounded-(--radius-xs)", prefs.density === v ? "bg-acc-soft text-acc" : "text-ink2 hover:text-ink")}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <Switch label="Мягкий контраст" hint="Приглушённый белый для работы ночью. Акцент и читаемость сохраняются." checked={prefs.softContrast} onChange={(softContrast) => set({ softContrast })} />
        <Switch label="Отмена отправки · 3 секунды" hint="Сообщение уходит не сразу — успеете отменить и поправить" checked={prefs.undoSend} onChange={(undoSend) => set({ undoSend })} />
        <Switch label="Подсказки клавиш по Alt" hint="Зажмите Alt — на кнопках появятся горячие клавиши" checked={prefs.hints} onChange={(hints) => set({ hints })} />
        <Button variant="ghost" className="w-max" onClick={() => set({ onboarded: false })}>
          Показать знакомство с KURAI ещё раз
        </Button>
      </Section>

      <Section title="Расходы">
        <label className="flex flex-wrap items-center justify-between gap-3 bg-s1 px-4 py-3 rounded-(--radius-md)">
          <span className="flex flex-col">
            <span className="text-[14px]">Лимит расходов в месяц</span>
            <span className="text-[12.5px] text-ink3">На 80% — тихое предупреждение, сверх лимита запуск спросит подтверждение. Хранится в этом браузере; 0 — без лимита.</span>
          </span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={50}
              inputMode="numeric"
              value={prefs.spendLimit || ""}
              placeholder="0"
              onChange={(e) => set({ spendLimit: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
              className="h-9 w-28 rounded-(--radius-sm) border border-line2 bg-g1 px-3 text-right font-mono text-[13px] text-ink outline-none focus:border-ink3"
            />
            <span className="text-[13px] text-ink3">кр</span>
          </span>
        </label>
      </Section>

      <Section title="Язык">
        <div role="radiogroup" aria-label="Язык интерфейса" className="flex w-max gap-1 bg-s2 p-1 rounded-(--radius-sm)">
          <button type="button" role="radio" aria-checked="true" className="bg-acc-soft px-4 py-2 text-[13px] text-acc rounded-(--radius-xs)">
            Русский
          </button>
        </div>
      </Section>

      <Section title="Уведомления">
        <Switch
          label="В браузере"
          hint="Сообщим, когда видео или отчёт готовы, даже если вкладка свёрнута"
          checked={prefs.notifyBrowser}
          onChange={async (v) => {
            if (v && typeof Notification !== "undefined" && Notification.permission !== "granted") {
              const res = await Notification.requestPermission().catch(() => "denied" as NotificationPermission);
              if (res !== "granted") return;
            }
            set({ notifyBrowser: v });
          }}
        />
        <div className="border border-line bg-g1 px-4 py-3 rounded-(--radius-md)">
          <p className="text-[14px]">Письма о балансе и чеках</p>
          <p className="mt-0.5 text-[12.5px] text-ink3">Появятся вместе с оплатой.</p>
        </div>
        <Switch
          label="Звуки интерфейса"
          hint="Тихий тик на отправку, два тона на готовность, низкий — на ошибку. Навигация и клики звука не издают."
          checked={prefs.sound}
          onChange={(sound) => {
            set({ sound });
            if (sound) playSignal("done");
          }}
        />
        <Switch label="Тихие часы · 23:00–08:00" hint="Ночью уведомления копятся во «Входящих» без звука и всплывающих окон" checked={prefs.quiet} onChange={(quiet) => set({ quiet })} />
      </Section>

      <Section title="Сеансы и устройства">
        <div className="bg-s1 px-4 py-3 rounded-(--radius-md)">
          <p className="text-[14px]">Текущий веб-сеанс активен</p>
          <p className="mt-0.5 text-[12.5px] text-ink3">Список устройств появится позже. Выйти из аккаунта можно в меню профиля внизу боковой панели.</p>
        </div>
      </Section>

      <Section title="API-ключи">
        <Hatch>
          Пользовательские API-ключи ещё не выпускаются. Ключи доступа к моделям хранятся только на сервере KURAI и никогда не показываются браузеру.
        </Hatch>
      </Section>

      <Section title="Данные">
        <div className="flex flex-col gap-3 bg-s1 p-4 rounded-(--radius-md)">
          <p className="text-[14px]">Экспорт истории</p>
          <p className="text-[13px] text-ink2">Скачайте приватный ZIP с профилем, проектами, чатами, сообщениями и историей баланса. Содержимое загруженных файлов и ключи в архив не включаются.</p>
          {exportState === "done" ? (
            <SysLine tone="acc">архив скачан на это устройство</SysLine>
          ) : exportState === "error" ? (
            <SysLine tone="err">не удалось подготовить архив · попробуйте ещё раз</SysLine>
          ) : (
            <Button className="w-max" disabled={!kuraiApi || exportState === "loading"} onClick={() => void downloadAccountArchive()}>
              {exportState === "loading" ? "Собираю архив…" : kuraiApi ? "Скачать архив" : "Подключите API для экспорта"}
            </Button>
          )}
        </div>
        <Hatch tone="err">
          <div className="flex flex-col gap-3">
            <p>Удалить аккаунт из интерфейса пока нельзя.</p>
            <p className="text-[13px] text-ink2">Скачать все свои данные можно выше, в разделе экспорта.</p>
          </div>
        </Hatch>
      </Section>
    </div>
  );
}

/** 84 — превью темы: мини-экран кабинета в цветах выбранной (или наведённой) темы, перекрашивается плавно. */
function ThemePreview({ theme }: { theme: "dark" | "light" | null }) {
  const t = theme ?? "dark";
  const c = t === "light" ? { bg: "#f1f0ec", g1: "#fbfaf6", line: "#d9d6cc", ink: "#1b1b1b", ink3: "#77736a", acc: "#b9e600" } : { bg: "#151515", g1: "#1f1f1f", line: "#2b2b2b", ink: "#f2f2f2", ink3: "#8e8e8e", acc: "#d8ec98" };
  const tr = "background-color 320ms var(--ease-out), color 320ms var(--ease-out), border-color 320ms var(--ease-out)";
  return (
    <div aria-hidden="true" className="hidden overflow-hidden rounded-(--radius-md) border lg:block" style={{ background: c.bg, borderColor: c.line, transition: tr }}>
      <div className="flex h-full">
        <div className="flex w-14 flex-col gap-1.5 border-r p-2" style={{ borderColor: c.line, transition: tr }}>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className="h-1.5 rounded-full" style={{ background: i === 0 ? c.acc : c.line, transition: tr }} />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <i className="h-2.5 w-3/4 rounded-full" style={{ background: c.ink, transition: tr }} />
          <i className="h-1.5 w-1/2 rounded-full" style={{ background: c.ink3, transition: tr }} />
          <i className="mt-2 h-1.5 w-full rounded-full" style={{ background: c.line, transition: tr }} />
          <i className="h-1.5 w-5/6 rounded-full" style={{ background: c.line, transition: tr }} />
          <span className="mt-auto flex h-6 items-center justify-end rounded-[5px] border px-1" style={{ background: c.g1, borderColor: c.line, transition: tr }}>
            <i className="h-3.5 w-6 rounded-[3px]" style={{ background: c.acc, transition: tr }} />
          </span>
        </div>
      </div>
    </div>
  );
}
