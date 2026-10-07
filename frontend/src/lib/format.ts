import type { ChatSummary, Micro } from "@/types/api";

export const MICRO_PER_CREDIT = 10_000;

/** Часовой пояс отображения: демо-данные в UTC (одинаково на сервере и в браузере), рабочий режим — пояс пользователя. */
export const DISPLAY_TZ: string | undefined = process.env.NEXT_PUBLIC_KURAI_API_BASE_URL ? undefined : "UTC";

/** Хост ссылки источника; некорректный адрес не роняет экран. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}

/** Ссылку можно отдать в href, только если это http(s). */
export function webHref(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** 12 480 000 micro → «1 248 кр»; 78 000 → «7,8 кр»; approx → «≈ 2 кр». */
export function formatCredits(micro: Micro, opts: { approx?: boolean; unit?: boolean } = {}): string {
  const value = micro / MICRO_PER_CREDIT;
  const num = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: Math.abs(value) < 100 ? 1 : 0 }).format(value);
  // неразрывный пробел: «кр» никогда не отрывается от числа при переносе
  const unit = opts.unit === false ? "" : "\u00a0кр";
  return `${opts.approx ? "≈\u00a0" : ""}${num}${unit}`;
}

export type ChatGroup = { label: string; chats: ChatSummary[] };

/** Закреплённые сверху, затем «Сегодня / Вчера / Неделя / Ранее» по updatedAt (сначала новые). */
export function groupChats(chats: ChatSummary[], now: Date): ChatGroup[] {
  const day = 86_400_000;
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const buckets: ChatGroup[] = [
    { label: "Закреплённые", chats: [] },
    { label: "Сегодня", chats: [] },
    { label: "Вчера", chats: [] },
    { label: "Неделя", chats: [] },
    { label: "Ранее", chats: [] },
  ];
  const sorted = [...chats].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  for (const chat of sorted) {
    const t = Date.parse(chat.updatedAt);
    const idx = chat.pinned ? 0 : t >= startOfToday ? 1 : t >= startOfToday - day ? 2 : t >= startOfToday - 7 * day ? 3 : 4;
    buckets[idx]?.chats.push(chat);
  }
  return buckets.filter((b) => b.chats.length > 0);
}

/** Время строки истории: «Сегодня, 14:32» / «Вчера, 11:05» / «22 сент., 18:40» в поясе отображения. */
export function formatWhen(iso: string, now: Date): string {
  const t = new Date(iso);
  const day = (d: Date) => Date.parse(d.toLocaleDateString("en-CA", { timeZone: DISPLAY_TZ }));
  const diff = Math.round((day(now) - day(t)) / 86_400_000);
  const time = t.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: DISPLAY_TZ });
  if (diff === 0) return `Сегодня, ${time}`;
  if (diff === 1) return `Вчера, ${time}`;
  return `${t.toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: DISPLAY_TZ })}, ${time}`;
}

/** 2 254 857 830 → «2,1 ГБ»; 180 000 000 → «180 МБ»; 5 368 709 120 → «5 ГБ». */
export function formatBytes(bytes: number): string {
  const units = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const num = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: v < 10 && i > 0 ? 1 : 0 }).format(v);
  return `${num} ${units[i]}`;
}

const ruPlural = new Intl.PluralRules("ru");
/** «1 источник · 3 источника · 12 источников»: формы для one / few / many по правилам русского языка. */
export function plural(n: number, forms: [string, string, string]): string {
  return `${n} ${pluralWord(n, forms)}`;
}

/** Только слово в нужной форме — когда число выводится отдельно (например, с разделителями тысяч). */
export function pluralWord(n: number, [one, few, many]: [string, string, string]): string {
  const form = ruPlural.select(n);
  return form === "one" ? one : form === "few" ? few : many;
}
