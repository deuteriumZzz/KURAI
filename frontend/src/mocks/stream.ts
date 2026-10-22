import { FOLLOWUPS } from "@/lib/live-plan";
import type { Mode } from "@/types/api";
import type { AgentTask, StreamEvent } from "@/lib/stream";
import { fileKind, type FileMeta } from "@/lib/files";
import { placeholderImage } from "./media";

/**
 * Имитация SSE-потока бэкенда. Та же последовательность событий придёт с сервера.
 * Демо не имитирует скрытую смену модели: она допустима только после явной
 * продуктовой fallback-политики и отдельного события сервера.
 */

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("aborted", "AbortError"));
    }, { once: true });
  });
}

const ANSWERS: Record<"text" | "research" | "slides" | "audio", string> = {
  text: `Коротко — **да, это выгоднее**, если вы пользуетесь больше чем одной нейросетью [2].

- Платите только за запросы, а не за три подписки сразу [1].
- Картинки, видео и текст живут в одном чате и опираются на общий контекст.
- При сбое KURAI показывает результат и состояние списания, не меняя выбранную модель молча.

| Сценарий | Отдельные подписки | KURAI |
|---|---|---|
| Текст + картинки | ~3 900 ₽/мес | по запросам |
| + видео | ~6 500 ₽/мес | по запросам |

Хотите, посчитаю под ваш реальный объём запросов?`,
  research: `## Итог исследования

Рынок AI-агрегаторов в РФ растёт за счёт доступа к зарубежным моделям без VPN [3].

1. **Лидеры** делают ставку на медиа: видео, музыку, аватары.
2. **Главный крючок** — шаблоны и тренды для новичков [1].
3. **Слабое место** у всех — прозрачность цены за запрос.

Источники: 7 · проверено фактов: 12.`,
  slides: `Презентация готова — откройте её в боковой панели. Можно попросить поменять порядок слайдов или добавить график.`,
  audio: "Озвучка готова · голос «Нова» · 0:12.",
};

const TIPS = ["Совет: /v переключает поле ввода в режим видео", "Совет: зажмите Alt — покажем горячие клавиши", "Совет: «Оживить» превращает картинку из чата в видео"];

export type AskFn = (question: string, options: string[]) => Promise<number>;

const SOURCES = [
  ["https://habr.com", "habr.com"],
  ["https://vc.ru", "vc.ru"],
  ["https://www.rbc.ru", "rbc.ru"],
  ["https://www.tadviser.ru", "tadviser.ru"],
  ["https://www.kommersant.ru", "kommersant.ru"],
  ["https://www.cnews.ru", "cnews.ru"],
  ["https://www.forbes.ru", "forbes.ru"],
] as const;

const SLIDES = [
  { title: "Итоги квартала", bullets: ["KURAI · сентябрь 2026"] },
  { title: "Проблема", bullets: ["Пять нейросетей — пять вкладок и три подписки", "Цена запроса непрозрачна"] },
  { title: "Решение", bullets: ["Единый чат для всех режимов", "Цена до отправки", "Выбор модели виден до запуска"] },
  { title: "Рынок", bullets: ["Спрос на доступ без VPN растёт", "Лидеры делают ставку на медиа"] },
  { title: "Экономика", bullets: ["Наценка ×1,8 на себестоимость", "Кредиты не сгорают — выше удержание"] },
];

async function* agent(prompt: string, mode: "research" | "slides", signal: AbortSignal, ask: AskFn | undefined): AsyncGenerator<StreamEvent> {
  const started = performance.now();
  await sleep(300, signal);
  yield { type: "route", model: "Авто · агент", node: "EU-01", latencyMs: 250 };
  const question = mode === "research" ? "Насколько глубоко исследовать?" : "Какой формат презентации нужен?";
  const options = mode === "research" ? ["Кратко · 5 источников", "Подробно · 7 источников с проверкой фактов", "Свой вариант…"] : ["Кратко · 5 слайдов", "Подробно · 10 слайдов с данными", "Свой вариант…"];
  yield { type: "ask", question, options };
  const choice = ask ? await ask(question, options) : 1;
  yield { type: "answered", choice };

  const titles = mode === "research" ? ["Найти источники", "Сравнить данные", "Проверить факты по двум источникам", "Написать отчёт"] : ["Собрать структуру", "Написать тексты слайдов", "Оформить в стиле KURAI"];
  const tasks = (active: number, extra?: string): AgentTask[] =>
    titles.map((title, i) => ({ title, status: i < active ? "done" : i === active ? "doing" : "todo", progress: i === active ? extra : undefined }));

  if (mode === "research") {
    for (let i = 0; i < SOURCES.length; i++) {
      yield { type: "tasks", tasks: tasks(0, `${i}/${SOURCES.length}`) };
      await sleep(420, signal);
      const [url, title] = SOURCES[i] as readonly [string, string];
      yield { type: "action", text: `GET ${url} · 200 · ${(0.3 + (i % 3) * 0.2).toFixed(1)} с` };
      yield { type: "action", text: `извлекаю текст · ${4 + i * 3} абзацев · ${i % 2 ? "таблица найдена" : "цитаты сохранены"}` };
      yield { type: "source", url, title };
    }
    for (let t = 1; t < titles.length; t++) {
      yield { type: "tasks", tasks: tasks(t) };
      yield { type: "action", text: ["сравниваю цены и тарифы · 7 источников", "сверяю факты: 12 утверждений, 2 спорных", "собираю отчёт · таблица + выводы"][t - 1] ?? "работаю" };
      await sleep(700, signal);
    }
  } else {
    for (let t = 0; t < titles.length; t++) {
      yield { type: "tasks", tasks: tasks(t) };
      await sleep(800, signal);
    }
    yield { type: "artifact", artifact: { kind: "slides", title: "Итоги квартала", slides: choice === 0 ? SLIDES : [...SLIDES, ...SLIDES.slice(1).map((s) => ({ ...s, title: `${s.title} · детали` }))] } };
  }
  yield { type: "tasks", tasks: tasks(titles.length) };
  const text = ANSWERS[mode];
  for (let i = 0; i < text.length; ) {
    const n = 2 + Math.floor(Math.random() * 4);
    yield { type: "delta", text: text.slice(i, i + n) };
    i += n;
    await sleep(22, signal);
  }
  yield { type: "followups", items: FOLLOWUPS[mode] ?? [] };
  yield { type: "done", costMicro: mode === "research" ? 384_000 : 246_000, durationMs: Math.round(performance.now() - started) };
  void prompt;
}

export type SimOptions = { model?: string; files?: FileMeta[]; think?: boolean; web?: boolean; params?: Record<string, string> };

const WEB = [
  ["https://habr.com", "habr.com", "Как выбирать нейросети под задачу"],
  ["https://vc.ru", "vc.ru", "Сколько стоят AI-подписки в 2026"],
  ["https://www.rbc.ru", "rbc.ru", "Рынок генеративного ИИ в России"],
] as const;

const SCAN_LABELS = {
  image: ["ИЗОБРАЖЕНИЕ", "ТЕКСТ НА ФОТО", "ЛОГОТИП"],
  pdf: ["ТЕКСТ · 18 СТР.", "ТАБЛИЦА · 4×6", "ПОДПИСЬ"],
  doc: ["ТЕКСТ · 6 СТР.", "ЗАГОЛОВКИ · 12"],
  sheet: ["ТАБЛИЦА · 240 СТРОК", "ФОРМУЛЫ"],
  audio: ["РЕЧЬ · 0:12", "РУССКИЙ ЯЗЫК"],
  text: ["ТЕКСТ", "КОД"],
} as const;

export async function* simulate(
  prompt: string,
  mode: Mode,
  signal: AbortSignal,
  fromProgress = 0,
  ask?: AskFn,
  opts: SimOptions = {},
): AsyncGenerator<StreamEvent> {
  for (const f of opts.files ?? []) {
    await sleep(500, signal);
    yield { type: "scan", name: f.name, labels: [...SCAN_LABELS[fileKind(f.type)]] };
  }
  if (mode === "research" || mode === "slides") {
    yield* agent(prompt, mode, signal, ask);
    return;
  }
  const started = performance.now();
  // демо: слово «ошибка» в запросе показывает упавшую генерацию с возвратом кредитов
  if (/ошибка/i.test(prompt)) {
    await sleep(900, signal);
    throw new Error("provider_unavailable");
  }
  const fallbackName = mode === "image" ? "Nano Banana Pro" : mode === "video" ? "Veo 3" : mode === "audio" ? "TTS · Нова" : "Claude Sonnet 5";
  // «Авто» выбирает конкретную модель на сервере; в демо — Claude Sonnet 5
  const primary = opts.model && opts.model !== "Авто" ? opts.model : fallbackName;

  if (mode === "image" || mode === "video") {
    let progress = fromProgress;
    if (progress === 0) {
      yield { type: "route", model: primary, node: "EU-01", latencyMs: 260 };
      for (const q of mode === "video" ? [2, 1] : [1]) {
        yield { type: "job", status: "queued", progress: 0, queuePosition: q };
        await sleep(700, signal);
      }
    }
    const steps = mode === "video" ? 24 : 12;
    const start = Math.round(progress * steps);
    for (let i = start + 1; i <= steps; i++) {
      await sleep(mode === "video" ? 450 : 220, signal);
      progress = i / steps;
      yield { type: "job", status: "running", progress, tip: mode === "video" ? TIPS[Math.floor(i / 8) % TIPS.length] : undefined };
    }
    if (mode === "image") {
      const count = Number(opts.params?.count ?? "4") || 4;
      yield { type: "media", parts: Array.from({ length: count }, (_, i) => i).map((i) => ({ type: "image" as const, url: placeholderImage(i + prompt.length), alt: `Вариант ${i + 1}: ${prompt.slice(0, 60)}`, width: 512, height: 512 })) };
      yield { type: "followups", items: FOLLOWUPS.image ?? [] };
      yield { type: "done", costMicro: 40_000 * count, durationMs: Math.round(performance.now() - started) };
    } else {
      yield { type: "media", parts: [{ type: "video", url: "", poster: placeholderImage(7, 960, 540, "KURAI · видео 8 с"), durationSec: 8 }] };
      yield { type: "followups", items: FOLLOWUPS.video ?? [] };
      yield { type: "done", costMicro: 1_180_000, durationMs: Math.round(performance.now() - started) };
    }
    return;
  }

  await sleep(350, signal);
  yield { type: "route", model: primary, node: "EU-01", latencyMs: 240 };
  if (opts.think) {
    for (const step of ["Уточняю задачу: сравнить стоимость и удобство. ", "Считаю: три подписки против оплаты за запросы. ", "Проверяю крайние случаи: редкое использование, много видео. "]) {
      for (let i = 0; i < step.length; i += 4) {
        yield { type: "thinking", text: step.slice(i, i + 4) };
        await sleep(18, signal);
      }
    }
  }
  if (opts.web !== false) {
    for (const [url, , headline] of WEB) {
      await sleep(180, signal);
      yield { type: "source", url, title: headline };
    }
  }
  await sleep(250, signal);
  const text = ANSWERS[mode === "audio" ? "audio" : "text"];
  for (let i = 0; i < text.length; ) {
    const n = 1 + Math.floor(Math.random() * 4);
    yield { type: "delta", text: text.slice(i, i + n) };
    i += n;
    await sleep(28, signal);
  }
  yield { type: "followups", items: FOLLOWUPS[mode === "audio" ? "audio" : "text"] ?? [] };
  yield { type: "done", costMicro: mode === "audio" ? 30_000 : opts.think ? 68_000 : 41_000, durationMs: Math.round(performance.now() - started) };
}

/** Частичная стоимость при остановке: пропорционально уже полученному тексту. */
export const partialCost = (chars: number) => Math.max(1_000, Math.round(chars * 60));
