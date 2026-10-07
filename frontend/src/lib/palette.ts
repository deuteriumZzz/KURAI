/**
 * Основные цвета картинки по её пикселям (RGBA подряд): корзины по 4 бита на канал,
 * самые населённые, без почти одинаковых соседей и прозрачных точек.
 */
export function dominantColors(pixels: Uint8ClampedArray, count = 5): string[] {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3]! < 128) continue;
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n++;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bins.set(key, bin);
  }
  const picked: [number, number, number][] = [];
  for (const bin of [...bins.values()].sort((a, b) => b.n - a.n)) {
    const c: [number, number, number] = [Math.round(bin.r / bin.n), Math.round(bin.g / bin.n), Math.round(bin.b / bin.n)];
    // соседние оттенки одного цвета не занимают несколько мест
    if (picked.some((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) < 48)) continue;
    picked.push(c);
    if (picked.length === count) break;
  }
  return picked.map((c) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`);
}
