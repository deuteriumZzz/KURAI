/** Глифы расшифровки — коды матрицы Breach Protocol (1C 55 BD E9 7A FF). */
export const GLYPHS = "1C5BDE97AF";

/** Символы, которые не шифруются, чтобы строка не «прыгала» по словам. */
const KEEP = /[\s.,:;·›—–\-/()«»"'!?%₽]/;

export type Rand = () => number;

export function glyph(rand: Rand = Math.random): string {
  return GLYPHS[Math.floor(rand() * GLYPHS.length)] ?? "1";
}

/** Первые `revealed` символов — настоящие, остальные — шифр (разделители сохраняются). */
export function scramble(text: string, revealed: number, rand: Rand = Math.random): string {
  const n = Math.max(0, Math.min(text.length, Math.floor(revealed)));
  let out = text.slice(0, n);
  for (let i = n; i < text.length; i++) {
    const ch = text[i] as string;
    out += KEEP.test(ch) ? ch : glyph(rand);
  }
  return out;
}

/** Хвост потока: N глифов на переднем крае стримящегося текста. */
export function tail(length: number, rand: Rand = Math.random): string {
  let out = "";
  for (let i = 0; i < length; i++) out += glyph(rand);
  return out;
}
