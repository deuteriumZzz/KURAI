import { describe, expect, it } from "vitest";
import { GLYPHS, scramble, tail } from "./decode";

const zero = () => 0;

describe("scramble", () => {
  it("keeps revealed prefix and length", () => {
    const out = scramble("Нейросети", 3, zero);
    expect(out.slice(0, 3)).toBe("Ней");
    expect(out).toHaveLength("Нейросети".length);
  });

  it("preserves separators so words do not jump", () => {
    expect(scramble("a b·c › d", 0, zero)).toBe("1 1·1 › 1");
  });

  it("returns original when fully revealed and clamps out-of-range", () => {
    expect(scramble("KURAI", 99, zero)).toBe("KURAI");
    expect(scramble("KURAI", -5, zero)).toBe("11111");
  });

  it("uses only Breach Protocol glyphs", () => {
    for (const ch of scramble("abcdefghij", 0)) expect(GLYPHS).toContain(ch);
  });
});

describe("tail", () => {
  it("returns requested length of glyphs", () => {
    expect(tail(0)).toBe("");
    expect(tail(9)).toHaveLength(9);
  });
});
