import { describe, expect, it } from "vitest";
import { isQuietHour, tocOf } from "./quiet";

describe("isQuietHour", () => {
  it("23:00–07:59 is quiet", () => {
    expect(isQuietHour(new Date(2026, 8, 24, 23, 5))).toBe(true);
    expect(isQuietHour(new Date(2026, 8, 24, 7, 59))).toBe(true);
    expect(isQuietHour(new Date(2026, 8, 24, 8, 0))).toBe(false);
    expect(isQuietHour(new Date(2026, 8, 24, 14, 0))).toBe(false);
  });
});

describe("tocOf", () => {
  it("collects h2/h3 headings only", () => {
    expect(tocOf("# Заголовок\n## Итог\ntext\n### Детали\n#### мелко")).toEqual([
      { level: 2, text: "Итог" },
      { level: 3, text: "Детали" },
    ]);
  });
});
