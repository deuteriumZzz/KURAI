/** Генеративный аватар: симметричная сетка 5×5 из хэша строки (FNV-1a). Детерминирован. */
export function identicon(seed: string): boolean[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const cells: boolean[] = [];
  for (let y = 0; y < 5; y++) {
    const row = [0, 1, 2].map((x) => ((h >>> (y * 3 + x)) & 1) === 1);
    cells.push(row[0]!, row[1]!, row[2]!, row[1]!, row[0]!);
  }
  return cells;
}
