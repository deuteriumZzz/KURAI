"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { HoldButton } from "@/components/ui/hold-button";
import { Button } from "@/components/ui/button";
import { Hatch, Label, SysLine } from "@/components/fx/primitives";
import { DEFAULT_PREFS, readPrefs, writePrefs, type Prefs } from "@/lib/prefs";
import { cn } from "@/lib/cn";
import type { User } from "@/types/api";

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

  // localStorage доступен только в браузере — читаем после монтирования
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setPrefs(readPrefs()), []);
  const set = (patch: Partial<Prefs>) => setPrefs(writePrefs(patch));

  return (
    <div className="flex flex-col gap-10">
      <Section title="Профиль">
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
        <Switch label="Подсказки клавиш по Alt" hint="Зажмите Alt — на кнопках появятся горячие клавиши" checked={prefs.hints} onChange={(hints) => set({ hints })} />
        <Button variant="ghost" className="w-max" onClick={() => set({ onboarded: false })}>
          Показать знакомство с KURAI ещё раз
        </Button>
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
