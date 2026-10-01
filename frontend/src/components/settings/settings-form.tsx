"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Hatch, Label, SysLine } from "@/components/fx/primitives";
import { playSignal } from "@/lib/sound";
import { DEFAULT_PREFS, readPrefs, writePrefs, type Prefs } from "@/lib/prefs";
import { cn } from "@/lib/cn";
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
        <div className="flex items-center gap-4 bg-s1 p-4">
          <Initials name={user.name} className="size-14 text-[16px]" />
          <div className="flex flex-col gap-1">
            <p className="text-[14px]">Инициалы из имени</p>
            <p className="text-[12.5px] text-ink3">Загрузка своего фото появится вместе с медиахранилищем.</p>
          </div>
        </div>
        <div className="grid gap-px bg-hair sm:grid-cols-2">
          <div className="bg-s1 px-4 py-3">
            <Label>Имя</Label>
            <p className="mt-1 text-[14px]">{user.name}</p>
          </div>
          <div className="bg-s1 px-4 py-3">
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
              className={cn("fx-brackets cursor-pointer bg-s1 px-4 py-3 text-left transition-colors duration-(--dur-fast)", prefs.model === m.id ? "bg-s2 shadow-[inset_0_0_0_1px_var(--color-acc-line)]" : "hover:bg-s2")}
            >
              <span className="block text-[14px]">{m.label}</span>
              <span className="text-[12.5px] text-ink3">{m.note}</span>
            </button>
          ))}
        </div>
        <Switch label="Поиск в интернете по умолчанию" hint="Модель сможет смотреть свежие источники" checked={prefs.web} onChange={(web) => set({ web })} />
      </Section>

      <Section title="Оформление">
        <div role="radiogroup" aria-label="Тема" className="grid gap-2 sm:grid-cols-3">
          {([["dark", "Night Ops", "тёмный карбон для долгой работы"], ["light", "Paper", "техническая бумага для чтения днём"], ["system", "Как в системе", "следует за настройкой устройства"]] as const).map(([v, l, h]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={prefs.theme === v}
              onClick={() => set({ theme: v })}
              className={cn("cursor-pointer bg-s1 px-4 py-3 text-left transition-colors duration-(--dur-fast) hover:bg-s2", prefs.theme === v && "bg-s2 shadow-[inset_0_0_0_1px_var(--color-acc-line)]")}
            >
              <span className="block text-[14px]">{l}</span>
              <span className="text-[12.5px] text-ink3">{h}</span>
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
        <div className="flex flex-col gap-2 bg-s1 px-4 py-3">
          <span className="text-[14px]">Размер текста ответов</span>
          <div role="radiogroup" aria-label="Размер текста ответов" className="flex w-max gap-1 bg-s2 p-1">
            {(["s", "m", "l"] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={prefs.readSize === v} onClick={() => set({ readSize: v })} className={cn("cursor-pointer px-4 py-1.5", prefs.readSize === v ? "bg-acc-soft text-acc" : "text-ink2 hover:text-ink", { s: "text-[13px]", m: "text-[15px]", l: "text-[17px]" }[v])}>
                Аа
              </button>
            ))}
          </div>
          <span className="mt-2 text-[14px]">Ширина колонки чата</span>
          <div role="radiogroup" aria-label="Ширина колонки чата" className="flex w-max gap-1 bg-s2 p-1">
            {([["narrow", "Узкая · удобно читать"], ["wide", "Широкая · таблицы и код"]] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={prefs.readWidth === v} onClick={() => set({ readWidth: v })} className={cn("cursor-pointer px-3 py-1.5 text-[13px]", prefs.readWidth === v ? "bg-acc-soft text-acc" : "text-ink2 hover:text-ink")}>
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

      <Section title="Язык">
        <div role="radiogroup" aria-label="Язык интерфейса" className="flex w-max gap-1 bg-s2 p-1">
          <button type="button" role="radio" aria-checked="true" className="bg-acc-soft px-4 py-2 text-[13px] text-acc">
            Русский
          </button>
          <button type="button" role="radio" aria-checked="false" disabled className="px-4 py-2 text-[13px] text-ink3">
            English · скоро
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
        <div className="border border-line bg-g1 px-4 py-3">
          <p className="text-[14px]">Письма о балансе и чеках</p>
          <p className="mt-0.5 text-[12.5px] text-ink3">Не включены: рассылка и чековый контур появятся вместе с платёжным провайдером.</p>
        </div>
        <Switch
          label="Звук при завершении и ошибке"
          hint="Короткий тон, когда долгая задача готова или не удалась. Навигация и клики звука не издают."
          checked={prefs.sound}
          onChange={(sound) => {
            set({ sound });
            if (sound) playSignal("done");
          }}
        />
        <Switch label="Тихие часы · 23:00–08:00" hint="Ночью уведомления копятся во «Входящих» без звука и всплывающих окон" checked={prefs.quiet} onChange={(quiet) => set({ quiet })} />
      </Section>

      <Section title="Сеансы и устройства">
        <div className="bg-s1 px-4 py-3">
          <p className="text-[14px]">Текущий веб-сеанс активен</p>
          <p className="mt-0.5 text-[12.5px] text-ink3">История устройств и удалённое завершение сеансов будут добавлены после отдельной модели device sessions. Сейчас для выхода используйте меню аккаунта.</p>
        </div>
      </Section>

      <Section title="API-ключи">
        <Hatch>
          Пользовательские API-ключи ещё не выпускаются. Серверный ключ OpenRouter остаётся внутри KURAI и никогда не показывается браузеру.
        </Hatch>
      </Section>

      <Section title="Данные">
        <div className="flex flex-col gap-3 bg-s1 p-4">
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
            <p>Удаление данных пока не активировано: перед запуском нужна утверждённая политика хранения, срок отмены и юридически корректный процесс подтверждения.</p>
            <p className="text-[13px] text-ink2">Не показываем кнопку «удалить» для вида — до включения процесса можно скачать архив выше.</p>
          </div>
        </Hatch>
      </Section>
    </div>
  );
}
