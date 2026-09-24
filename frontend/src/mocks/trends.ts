import type { Mode } from "@/types/api";
import type { Inspiration } from "./inspiration";

export type Trend = { id: string; title: string; mode: Mode; tag: string; uses: number; art: Inspiration["art"]; prompt: string; category: "Для бизнеса" | "Для соцсетей" | "Для учёбы" | "Для себя" };

/** Тренды и шаблоны: готовые задачи с промптом и «до / после». Счётчики — тестовые. */
export const TRENDS: Trend[] = [
  { id: "t1", title: "Товар в неоновой витрине", mode: "image", tag: "Изображение", uses: 18420, art: "city", category: "Для бизнеса", prompt: "Фото товара в неоновой витрине ночного города, отражения на мокром асфальте, 4:5" },
  { id: "t2", title: "Оживить старое фото", mode: "video", tag: "Видео", uses: 15210, art: "wave", category: "Для себя", prompt: "Оживи фото: лёгкое движение, моргание, улыбка, 5 секунд" },
  { id: "t3", title: "Обложка для Reels за минуту", mode: "image", tag: "Изображение", uses: 12880, art: "grid", category: "Для соцсетей", prompt: "Обложка Reels 9:16: крупный заголовок сверху, фон — неоновая сетка, место под лицо" },
  { id: "t4", title: "Разбор конкурентов", mode: "research", tag: "Deep Research", uses: 9340, art: "rings", category: "Для бизнеса", prompt: "Разбери 5 конкурентов в моей нише: цены, сильные стороны, чем отличаться" },
  { id: "t5", title: "Конспект лекции из PDF", mode: "text", tag: "Текст", uses: 8710, art: "bars", category: "Для учёбы", prompt: "Сделай конспект по приложенному PDF: тезисы, определения, 5 вопросов для самопроверки" },
  { id: "t6", title: "Питч за вечер", mode: "slides", tag: "Слайды", uses: 7020, art: "bars", category: "Для бизнеса", prompt: "Питч-дек на 10 слайдов для инвестора по моей идее" },
  { id: "t7", title: "Голос для видео", mode: "audio", tag: "Аудио", uses: 6450, art: "sun", category: "Для соцсетей", prompt: "Озвучь текст уверенно и дружелюбно, темп спокойный" },
  { id: "t8", title: "Аватар в стиле аниме", mode: "image", tag: "Изображение", uses: 21030, art: "sun", category: "Для себя", prompt: "Портрет по фото в стиле аниме, неоновый свет, 1:1" },
];
