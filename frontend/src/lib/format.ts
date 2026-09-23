import type { ChatSummary, Micro } from "@/types/api";

export const MICRO_PER_CREDIT = 10_000;

/** 12 480 000 micro → «1 248 кр»; 78 000 → «7,8 кр»; approx → «≈ 2 кр». */
export function formatCredits(micro: Micro, opts: { approx?: boolean; unit?: boolean } = {}): string {
  const value = micro / MICRO_PER_CREDIT;
  const num = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: Math.abs(value) < 100 ? 1 : 0 }).format(value);
  const unit = opts.unit === false ? "" : " кр";
  return `${opts.approx ? "≈ " : ""}${num}${unit}`;
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
