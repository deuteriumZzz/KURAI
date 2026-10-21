import type { Mode } from "@/types/api";

export type LandingCapability = {
  id: Mode;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  available: boolean;
  status: "ready" | "deployment-dependent";
};

export const LANDING_CAPABILITIES: readonly LandingCapability[] = [
  {
    id: "text",
    label: "Текст",
    eyebrow: "01 / диалог",
    title: "Разговор с выбранной моделью",
    description: "Спрашивайте, уточняйте, просите переписать. Не понравился ответ — попросите новую версию другой моделью, старая останется в ветке.",
    available: true,
    status: "ready",
  },
  {
    id: "research",
    label: "Research",
    eyebrow: "02 / исследование",
    title: "Исследование с источниками",
    description: "Модель ищет и читает источники, план работы обновляется по ходу. В отчёте есть ссылки на то, откуда взяты данные.",
    available: true,
    status: "ready",
  },
  {
    id: "image",
    label: "Изображения",
    eyebrow: "03 / визуальное",
    title: "Изображения по описанию",
    description: "Опишите картинку словами или сошлитесь на сообщение выше. Готовые работы собираются в медиатеке.",
    available: true,
    status: "ready",
  },
  {
    id: "slides",
    label: "Слайды",
    eyebrow: "04 / результат",
    title: "Слайды из разговора",
    description: "Попросите сделать презентацию из того, что уже обсудили: структура и текст слайдов появятся в боковой панели.",
    available: true,
    status: "ready",
  },
  {
    id: "video",
    label: "Видео",
    eyebrow: "по конфигурации",
    title: "Видео",
    description: "Появится, когда в каталоге OpenRouter будет подходящая модель.",
    available: false,
    status: "deployment-dependent",
  },
  {
    id: "audio",
    label: "Аудио",
    eyebrow: "по конфигурации",
    title: "Озвучка",
    description: "Появится, когда в каталоге OpenRouter будет модель синтеза речи.",
    available: false,
    status: "deployment-dependent",
  },
];

export const LANDING_MODES = LANDING_CAPABILITIES.filter((capability) => capability.available) as readonly (LandingCapability & { available: true })[];
