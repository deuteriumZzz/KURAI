/** Индексы элементов, чей текст содержит запрос (без учёта регистра и «ё/е»). Пустой запрос — ничего. */
export function findMatches(texts: string[], query: string): number[] {
  const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");
  const q = norm(query.trim());
  if (!q) return [];
  return texts.flatMap((t, i) => (norm(t).includes(q) ? [i] : []));
}
