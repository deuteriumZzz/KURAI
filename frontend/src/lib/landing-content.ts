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
    title: "Работайте с мыслью, а не со вкладками",
    description: "Выбирайте подходящую модель для ответа, продолжайте в том же контексте и сохраняйте понятную историю решения.",
    available: true,
    status: "ready",
  },
  {
    id: "research",
    label: "Research",
    eyebrow: "02 / исследование",
    title: "Собирайте вопрос в структурированную работу",
    description: "Разворачивайте исследование в отдельный поток: тезисы, источники и следующий шаг остаются рядом с исходным запросом.",
    available: true,
    status: "ready",
  },
  {
    id: "image",
    label: "Изображения",
    eyebrow: "03 / визуальное",
    title: "Создавайте визуальные варианты внутри задачи",
    description: "Переключайтесь на изображение, не теряя контекст брифа, обсуждения и предыдущего результата.",
    available: true,
    status: "ready",
  },
  {
    id: "slides",
    label: "Слайды",
    eyebrow: "04 / результат",
    title: "Превращайте работу в ясную подачу",
    description: "Собирайте структуру презентации из чата, когда решение уже оформилось и его нужно показать команде.",
    available: true,
    status: "ready",
  },
  {
    id: "video",
    label: "Видео",
    eyebrow: "по конфигурации",
    title: "Видео работает как асинхронный контур",
    description: "Режим становится доступен, когда в синхронизированном каталоге есть совместимая модель и сервер подключён к OpenRouter.",
    available: false,
    status: "deployment-dependent",
  },
  {
    id: "audio",
    label: "Аудио",
    eyebrow: "по конфигурации",
    title: "Аудио отдаётся как приватный результат",
    description: "Режим становится доступен, когда каталог находит совместимую TTS-модель и сервер подключён к OpenRouter.",
    available: false,
    status: "deployment-dependent",
  },
];

export const LANDING_MODES = LANDING_CAPABILITIES.filter((capability) => capability.available) as readonly (LandingCapability & { available: true })[];
