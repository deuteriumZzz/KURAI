"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Decode, StreamText } from "@/components/fx/decode";
import { Hatch, KeyHint, Label, Scanline, Segments, SysLine, useFx } from "@/components/fx/primitives";
import { isCalm } from "@/lib/motion";

const SWATCHES = [
  ["bg", "фон"],
  ["g1", "графит 1"],
  ["g2", "графит 2"],
  ["g3", "графит 3"],
  ["line", "линия"],
  ["line2", "линия 2"],
  ["ink", "текст"],
  ["ink2", "текст 2"],
  ["ink3", "метки"],
  ["acc", "акцент"],
  ["ok", "успех"],
  ["warn", "внимание"],
  ["err", "ошибка"],
] as const;

const STREAM =
  "Всё в одном чате. Текст, картинки, видео и голос живут в одной ленте, и каждый шаг опирается на предыдущий.\n\nЦена каждого запроса видна до отправки, а за сбой модели кредиты возвращаются сами.";

const MODELS = ["Claude Sonnet 5", "GPT-5", "Gemini 2.5 Flash", "DeepSeek V3"];

function Block({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="border border-line bg-g1">
      <header className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {note && <Label>{note}</Label>}
      </header>
      <div className="flex flex-col gap-3 bg-bg p-4">{children}</div>
    </section>
  );
}

export default function KitPage() {
  const [calm, setCalm] = useState(false);
  const [model, setModel] = useState(0);
  const [decodeKey, setDecodeKey] = useState(0);
  const [streamed, setStreamed] = useState(STREAM.length);
  const [selected, setSelected] = useState(1);
  const [scan, setScan] = useState(false);
  const [flickRef, flicker] = useFx<HTMLDivElement>("fx-flicker-border");
  const [glitchRef, glitch] = useFx<HTMLDivElement>("fx-glitch");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("calm", calm);
  }, [calm]);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  function runStream() {
    if (timer.current) clearInterval(timer.current);
    if (isCalm()) {
      setStreamed(STREAM.length);
      return;
    }
    setStreamed(0);
    timer.current = setInterval(() => {
      setStreamed((n) => {
        const next = Math.min(STREAM.length, n + 1 + Math.floor(Math.random() * 3));
        if (next >= STREAM.length && timer.current) clearInterval(timer.current);
        return next;
      });
    }, 34);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <Label className="text-acc">Витрина дизайн-системы · только для разработки</Label>
          <h1 className="mt-2 font-display text-4xl font-extralight tracking-wide">
            KUR<span className="text-acc">A</span>I <span className="text-ink3">/ kit</span>
          </h1>
          <p className="mt-2 max-w-[62ch] text-ink2">
            Токены «Kiroshi + Cyan», шрифты и примитивы, из которых собираются все кибер-эффекты. Нажимайте кнопки у каждого
            блока.
          </p>
        </div>
        <Button variant={calm ? "primary" : "secondary"} onClick={() => setCalm((c) => !c)} aria-pressed={calm}>
          Спокойный режим: {calm ? "вкл" : "выкл"}
        </Button>
      </header>

      <Block title="Палитра · Kiroshi + Cyan" note="токены @theme">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-px border border-line bg-line">
          {SWATCHES.map(([token, name]) => (
            <div key={token} className="bg-g1 p-2.5">
              <div className="mb-2 h-10 border border-line" style={{ background: `var(--color-${token})` }} />
              <div className="text-[13px]">{name}</div>
              <Label className="tracking-normal normal-case">--color-{token}</Label>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Типографика" note="Exo 2 · Geist · JetBrains Mono">
        <p className="font-display text-5xl leading-none font-extralight tracking-tight text-balance">
          Нейросети — <span className="font-medium text-acc">в одном терминале</span>
        </p>
        <p className="font-display text-2xl font-light">Заголовок раздела · Exo 2 Light</p>
        <p className="max-w-[65ch] text-ink2">
          Интерфейс и ответы моделей — Geist. Нейтральный гротеск с хорошей кириллицей читается и в длинных ответах, и
          мелким кеглем в настройках.
        </p>
        <p className="font-mono text-[13px] tracking-wide tabular-nums">1 248 КР · 6,2 С · CLAUDE-SONNET-5 · #7F3A</p>
      </Block>

      <div className="grid gap-6 md:grid-cols-2">
        <Block title="Кнопки" note="32 / 40 / 48 px">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg">
              Создать аккаунт
            </Button>
            <Button variant="primary">Отправить</Button>
            <Button variant="primary" size="sm">
              Пополнить
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Вторичная</Button>
            <Button variant="ghost">Призрачная</Button>
            <Button variant="danger">Удалить</Button>
            <Button variant="primary" disabled>
              Недоступна
            </Button>
          </div>
          <SysLine>Срез угла только у главной кнопки. Hover — свечение внутри, без сдвигов.</SysLine>
        </Block>

        <Block title="Поле и захват цели" note="Brackets">
          <label htmlFor="kit-input" className="text-[13px] text-ink2">
            Кликните в поле — угловые скобки «захватят» его
          </label>
          <div className="fx-brackets">
            <div className="fx-chamfer border border-line2 bg-g1 px-3 py-2.5 [--ch:var(--chamfer-lg)] focus-within:border-acc-line focus-within:shadow-[0_0_0_3px_var(--color-acc-soft)]">
              <input
                id="kit-input"
                className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink3"
                placeholder="Спросите что угодно…"
              />
              <div className="mt-2 flex items-center justify-between">
                <Label>≈ 2 кр</Label>
                <span className="flex gap-1.5">
                  <KeyHint>Enter</KeyHint>
                  <KeyHint>/</KeyHint>
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["Claude Sonnet 5", "Nano Banana Pro"].map((m, i) => (
              <button
                key={m}
                type="button"
                data-selected={selected === i}
                onClick={() => setSelected(i)}
                className="fx-brackets cursor-pointer border border-line bg-g1 p-3 text-left text-[13px] data-[selected=true]:border-acc-line"
              >
                {m}
                <Label className="mt-1 block">{selected === i ? "выбрана" : "выбрать"}</Label>
              </button>
            ))}
          </div>
        </Block>

        <Block title="Расшифровка" note="Decode · Breach Protocol">
          <div className="flex items-center justify-between gap-3">
            <Decode key={decodeKey} text={MODELS[model] ?? ""} className="font-display text-2xl font-light" />
            <Button
              size="sm"
              onClick={() => {
                setModel((m) => (m + 1) % MODELS.length);
                setDecodeKey((k) => k + 1);
              }}
            >
              Сменить модель
            </Button>
          </div>
          <SysLine decode key={`s${decodeKey}`} tone="acc">
            {`${MODELS[model] ?? ""} · EU-01 · 240 мс`}
          </SysLine>
        </Block>

        <Block title="Стриминг с расшифровкой" note="StreamText">
          <div className="min-h-32 text-[14.5px] text-ink">
            <StreamText text={STREAM.slice(0, streamed)} done={streamed >= STREAM.length} />
          </div>
          <div>
            <Button size="sm" variant="primary" onClick={runStream}>
              Запустить стриминг
            </Button>
          </div>
        </Block>

        <Block title="Системные строки" note="SysLine">
          <SysLine>Claude Sonnet 5 · EU-01 · ожидание…</SysLine>
          <SysLine tone="warn">нет ответа за 8 с → переключаюсь на GPT-5</SysLine>
          <SysLine tone="acc">GPT-5 · EU-01 · 310 мс</SysLine>
          <SysLine tone="err">файл больше 50 МБ — сожмите или загрузите по частям</SysLine>
          <SysLine tone="ok" prefix="●">
            все системы в норме
          </SysLine>
        </Block>

        <Block title="Шкалы и штриховка" note="Segments · Hatch">
          <div className="flex items-baseline justify-between text-[13px] text-ink2">
            <span>Баланс</span>
            <span className="font-mono text-ink tabular-nums">1 248 кр</span>
          </div>
          <Segments value={0.62} label="Баланс" />
          <div className="flex items-baseline justify-between text-[13px] text-ink2">
            <span>Контекст чата</span>
            <span className="font-mono tabular-nums">78%</span>
          </div>
          <Segments value={0.78} tone="warn" label="Заполненность контекста" />
          <Hatch>Недостаточно кредитов для видео · нужно 120, на балансе 48</Hatch>
          <Hatch tone="err">Удаление истории нельзя отменить через 10 секунд</Hatch>
        </Block>

        <Block title="Мерцание, глитч, скан" note="Flicker · Glitch · Scanline">
          <div ref={flickRef} className="border border-line2 bg-g1 px-3 py-2.5 text-[13px]">
            Рамка поля при смене режима
          </div>
          <div ref={glitchRef} className="border border-err bg-g1 px-3 py-2.5 text-[13px] text-err">
            Ошибка: RGB-сдвиг только здесь
          </div>
          <div className="relative h-20 overflow-hidden border border-line bg-g1 p-3">
            <Label>договор_аренды.pdf · 18 стр.</Label>
            <Scanline active={scan} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={flicker}>
              Мерцание
            </Button>
            <Button size="sm" onClick={glitch}>
              Ошибка
            </Button>
            <Button size="sm" onClick={() => setScan((s) => !s)} aria-pressed={scan}>
              Скан: {scan ? "идёт" : "стоп"}
            </Button>
          </div>
        </Block>
      </div>
    </main>
  );
}
