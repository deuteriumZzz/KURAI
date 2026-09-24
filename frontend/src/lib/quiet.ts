/** Тихие часы 23:00–08:00 (локальное время пользователя). */
export function isQuietHour(date: Date = new Date()): boolean {
  const h = date.getHours();
  return h >= 23 || h < 8;
}

/** Оглавление ответа по заголовкам Markdown (## и ###). */
export function tocOf(markdown: string): { level: 2 | 3; text: string }[] {
  return markdown
    .split("\n")
    .map((l) => /^(#{2,3})\s+(.+)$/.exec(l.trim()))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ level: (m[1]?.length === 3 ? 3 : 2) as 2 | 3, text: (m[2] ?? "").trim() }));
}
