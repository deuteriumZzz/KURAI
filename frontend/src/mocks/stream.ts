import type { Mode } from "@/types/api";
import type { StreamEvent } from "@/lib/stream";
import { placeholderImage } from "./media";

/**
 * Имитация SSE-потока бэкенда. Та же последовательность событий придёт с сервера.
 * Демо: слово «сбой» или «резерв» в запросе включает переключение на резервную модель.
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
  text: `Коротко — **да, это выгоднее**, если вы пользуетесь больше чем одной нейросетью.

- Платите только за запросы, а не за три подписки сразу.
- Картинки, видео и текст живут в одном чате и опираются на общий контекст.
- Если модель не ответила, запрос уходит на резервную, а кредиты за сбой возвращаются.

| Сценарий | Отдельные подписки | KURAI |
|---|---|---|
| Текст + картинки | ~3 900 ₽/мес | по запросам |
| + видео | ~6 500 ₽/мес | по запросам |

Хотите, посчитаю под ваш реальный объём запросов?`,
  research: `## Итог исследования

Рынок AI-агрегаторов в РФ растёт за счёт доступа к зарубежным моделям без VPN.

1. **Лидеры** делают ставку на медиа: видео, музыку, аватары.
2. **Главный крючок** — шаблоны и тренды для новичков.
3. **Слабое место** у всех — прозрачность цены за запрос.

Источники: 7 · проверено фактов: 12.`,
  slides: `Собрал структуру презентации на **8 слайдов**: титул, проблема, рынок, решение, продукт, экономика, план, контакты. Файл .pptx появится в боковой панели в секции «Агенты».`,
  audio: "Озвучка готова · голос «Нова» · 0:12.",
};

const TIPS = ["Совет: /v переключает поле ввода в режим видео", "Совет: зажмите Alt — покажем горячие клавиши", "Совет: «Оживить» превращает картинку из чата в видео"];

export async function* simulate(prompt: string, mode: Mode, signal: AbortSignal, fromProgress = 0): AsyncGenerator<StreamEvent> {
  const started = performance.now();
  const primary = mode === "image" ? "Nano Banana Pro" : mode === "video" ? "Veo 3" : mode === "audio" ? "TTS · Нова" : "Claude Sonnet 5";

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
      yield { type: "media", parts: [0, 1, 2, 3].map((i) => ({ type: "image" as const, url: placeholderImage(i + prompt.length), alt: `Вариант ${i + 1}: ${prompt.slice(0, 60)}`, width: 512, height: 512 })) };
      yield { type: "done", costMicro: 160_000, durationMs: Math.round(performance.now() - started) };
    } else {
      yield { type: "media", parts: [{ type: "video", url: "", poster: placeholderImage(7, 960, 540, "KURAI · видео 8 с"), durationSec: 8 }] };
      yield { type: "done", costMicro: 1_180_000, durationMs: Math.round(performance.now() - started) };
    }
    return;
  }

  await sleep(350, signal);
  yield { type: "route", model: primary, node: "EU-01", latencyMs: 240 };
  if (/сбой|резерв/i.test(prompt)) {
    await sleep(1400, signal);
    yield { type: "fallback", from: primary, to: "GPT-5", reason: "нет ответа за 8 с" };
    await sleep(300, signal);
    yield { type: "route", model: "GPT-5", node: "EU-01", latencyMs: 310 };
  }
  await sleep(250, signal);
  const text = ANSWERS[mode === "research" || mode === "slides" || mode === "audio" ? mode : "text"];
  for (let i = 0; i < text.length; ) {
    const n = 1 + Math.floor(Math.random() * 4);
    yield { type: "delta", text: text.slice(i, i + n) };
    i += n;
    await sleep(28, signal);
  }
  yield { type: "done", costMicro: mode === "research" ? 384_000 : 41_000, durationMs: Math.round(performance.now() - started) };
}

/** Частичная стоимость при остановке: пропорционально уже полученному тексту. */
export const partialCost = (chars: number) => Math.max(1_000, Math.round(chars * 60));
