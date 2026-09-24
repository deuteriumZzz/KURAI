"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { HoldButton } from "@/components/ui/hold-button";
import { Button } from "@/components/ui/button";
import { Hatch, Label, SysLine } from "@/components/fx/primitives";
import { DEFAULT_PREFS, readPrefs, writePrefs, type Prefs } from "@/lib/prefs";
import { cn } from "@/lib/cn";
import type { User } from "@/types/api";
import { Avatar } from "@/components/brand/avatar";

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
  const [exported, setExported] = useState(false);
  const [deleted, setDeleted] = useState<string | null>(null);
  const [notif, setNotif] = useState({ email: true, quiet: false });
  const [sessions, setSessions] = useState([
    { id: "s1", device: "MacBook · Chrome", place: "Москва", at: "сейчас", current: true },
    { id: "s2", device: "iPhone · Safari", place: "Москва", at: "вчера, 21:40", current: false },
    { id: "s3", device: "Telegram-бот", place: "—", at: "20.09", current: false },
  ]);

  // localStorage доступен только в браузере — читаем после монтирования
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setPrefs(readPrefs()), []);
  const set = (patch: Partial<Prefs>) => setPrefs(writePrefs(patch));

  return (
    <div className="flex flex-col gap-10">
      <Section title="Профиль">
        <div className="flex items-center gap-4 border border-line bg-g1 p-4">
          <Avatar seed={user.email} className="size-14 p-1.5" />
          <div className="flex flex-col gap-1">
            <p className="text-[14px]">Аватар создан из вашего email</p>
            <p className="text-[12.5px] text-ink3">Узор уникален для аккаунта. Загрузка своего фото появится вместе с медиахранилищем.</p>
          </div>
        </div>
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
          <div className="bg-g1 px-4 py-3">
            <Label>Имя</Label>
            <p className="mt-1 text-[14px]">{user.name}</p>
          </div>
          <div className="bg-g1 px-4 py-3">
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
              className={cn("fx-brackets cursor-pointer border bg-g1 px-4 py-3 text-left", prefs.model === m.id ? "border-acc-line" : "border-line hover:border-line2")}
            >
              <span className="block text-[14px]">{m.label}</span>
              <span className="text-[12.5px] text-ink3">{m.note}</span>
            </button>
          ))}
        </div>
        <Switch label="Поиск в интернете по умолчанию" hint="Модель сможет смотреть свежие источники" checked={prefs.web} onChange={(web) => set({ web })} />
      </Section>

      <Section title="Интерфейс">
        <Switch
          label="Спокойный режим"
          hint="Отключает расшифровку, мерцание и прочие эффекты. Всё остальное работает как обычно."
          checked={prefs.calm}
          onChange={(calm) => set({ calm })}
        />
        <div className="flex flex-col gap-2 border border-line bg-g1 px-4 py-3">
          <span className="text-[14px]">Размер текста ответов</span>
          <div role="radiogroup" aria-label="Размер текста ответов" className="flex w-max border border-line">
            {(["s", "m", "l"] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={prefs.readSize === v} onClick={() => set({ readSize: v })} className={cn("cursor-pointer border-r border-line px-4 py-1.5 last:border-r-0", prefs.readSize === v ? "bg-acc-soft text-acc" : "text-ink2 hover:text-ink", { s: "text-[13px]", m: "text-[15px]", l: "text-[17px]" }[v])}>
                Аа
              </button>
            ))}
          </div>
          <span className="mt-2 text-[14px]">Ширина колонки чата</span>
          <div role="radiogroup" aria-label="Ширина колонки чата" className="flex w-max border border-line">
            {([["narrow", "Узкая · удобно читать"], ["wide", "Широкая · таблицы и код"]] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={prefs.readWidth === v} onClick={() => set({ readWidth: v })} className={cn("cursor-pointer border-r border-line px-3 py-1.5 text-[13px] last:border-r-0", prefs.readWidth === v ? "bg-acc-soft text-acc" : "text-ink2 hover:text-ink")}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <Switch label="Подсказки клавиш по Alt" hint="Зажмите Alt — на кнопках появятся горячие клавиши" checked={prefs.hints} onChange={(hints) => set({ hints })} />
        <Button variant="ghost" className="w-max" onClick={() => set({ onboarded: false })}>
          Показать знакомство с KURAI ещё раз
        </Button>
      </Section>

      <Section title="Язык">
        <div role="radiogroup" aria-label="Язык интерфейса" className="flex w-max border border-line">
          <button type="button" role="radio" aria-checked="true" className="bg-acc-soft px-4 py-2 text-[13px] text-acc">
            Русский
          </button>
          <button type="button" role="radio" aria-checked="false" disabled className="border-l border-line px-4 py-2 text-[13px] text-ink3">
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
        <Switch label="Письма о балансе и чеках" checked={notif.email} onChange={(email) => setNotif((n) => ({ ...n, email }))} />
        <Switch label="Тихие часы · 23:00–08:00" hint="Ночью уведомления копятся во «Входящих» без звука и всплывающих окон" checked={notif.quiet} onChange={(quiet) => setNotif((n) => ({ ...n, quiet }))} />
      </Section>

      <Section title="Сеансы и устройства">
        <ul className="flex flex-col gap-px border border-line bg-line">
          {sessions.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 bg-g1 px-4 py-3">
              <span className="flex flex-col">
                <span className="text-[14px]">
                  {d.device} {d.current && <Label className="ml-1 text-acc">это устройство</Label>}
                </span>
                <span className="font-mono text-[11.5px] text-ink3">
                  {d.place} · {d.at}
                </span>
              </span>
              {!d.current && (
                <Button size="sm" variant="ghost" onClick={() => setSessions((ss) => ss.filter((x) => x.id !== d.id))}>
                  Завершить
                </Button>
              )}
            </li>
          ))}
        </ul>
        {sessions.length > 1 && (
          <Button variant="secondary" className="w-max" onClick={() => setSessions((ss) => ss.filter((x) => x.current))}>
            Завершить все, кроме этого
          </Button>
        )}
      </Section>

      <Section title="API-ключи">
        <Hatch>
          API-доступ входит в тариф Ultra: ключи для своих приложений и ботов, тот же баланс и цены.{" "}
          <a href="/app/billing" className="underline underline-offset-2">
            Перейти на Ultra
          </a>
        </Hatch>
      </Section>

      <Section title="Данные">
        <div className="flex flex-col gap-3 border border-line bg-g1 p-4">
          <p className="text-[14px]">Экспорт истории</p>
          <p className="text-[13px] text-ink2">Архив всех чатов и файлов медиатеки. Ссылка на скачивание придёт на почту.</p>
          {exported ? (
            <SysLine tone="acc" decode>
              архив готовится · письмо придёт в течение 15 минут
            </SysLine>
          ) : (
            <Button className="w-max" onClick={() => setExported(true)}>
              Подготовить архив
            </Button>
          )}
        </div>
        <Hatch tone="err">
          <div className="flex flex-col gap-3">
            <p>Удаление необратимо. Отменить можно только в течение 10 секунд.</p>
            <div className="flex flex-wrap gap-3">
              <HoldButton label="Удерживайте, чтобы удалить историю" doneLabel="История удалена" onConfirm={() => setDeleted("история чатов удалена · отменить в течение 10 с")} />
              <HoldButton label="Удерживайте, чтобы удалить аккаунт" doneLabel="Запрос на удаление принят" onConfirm={() => setDeleted("аккаунт будет удалён через 30 дней · письмо с отменой отправлено")} duration={2000} />
            </div>
            {deleted && <SysLine tone="err">{deleted}</SysLine>}
          </div>
        </Hatch>
      </Section>
    </div>
  );
}
